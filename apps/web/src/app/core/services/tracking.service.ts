import { inject, Injectable } from '@angular/core';
import { DailyLog, SCIENCE_THRESHOLDS } from '@habits-tracker/shared';
import { db } from '../db/app.database';
import { SessionService } from './session.service';
import { ActivityService } from './activity.service';

/**
 * Provides day-level tracking, streak calculations, and completion
 * rates used by the dashboard and progress views.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly sessionService = inject(SessionService);
  private readonly activityService = inject(ActivityService);

  // ── daily check-in ────────────────────────────────────────

  /**
   * Checks whether today has already been marked as tracked.
   */
  async isTodayTracked(): Promise<boolean> {
    const today = this.todayISO();
    const log = await db.dailyLogs.where('date').equals(today).first();
    return log?.isTracked ?? false;
  }

  /**
   * Creates or updates today's `DailyLog`, marking it as tracked.
   * @param mood  Optional mood rating 1–5.
   * @param reflection  Optional reflection text.
   */
  async markDayTracked(mood?: 1 | 2 | 3 | 4 | 5, reflection?: string): Promise<void> {
    const today = this.todayISO();
    const existing = await db.dailyLogs.where('date').equals(today).first();

    if (existing) {
      await db.dailyLogs.update(existing.id!, {
        isTracked: true,
        trackedAt: new Date().toISOString(),
        ...(mood !== undefined && { mood }),
        ...(reflection !== undefined && { reflection }),
      });
    } else {
      const log: DailyLog = {
        date: today,
        trackedAt: new Date().toISOString(),
        isTracked: true,
        ...(mood !== undefined && { mood }),
        ...(reflection !== undefined && { reflection }),
      };
      await db.dailyLogs.add(log);
    }
  }

  // ── streaks ───────────────────────────────────────────────

  /**
   * Calculates the current streak for an activity by counting backwards
   * from today. A "grace day" (1 per week by default from
   * `SCIENCE_THRESHOLDS`) allows one missed day per 7-day window
   * without breaking the streak.
   *
   * @param activityId Activity primary key.
   * @returns Current streak length in days.
   */
  async getStreak(activityId: number): Promise<number> {
    const sessions = await db.sessions.where('activityId').equals(activityId).toArray();

    if (sessions.length === 0) return 0;

    const sessionDates = new Set(sessions.map((s) => s.date));
    const graceDays = SCIENCE_THRESHOLDS.streaks.graceDaysPerWeek;

    let streak = 0;
    let graceUsed = 0;
    let graceWindow = 0;
    const current = new Date(this.todayISO() + 'T00:00:00');

    while (true) {
      const dateStr = current.toISOString().split('T')[0];

      if (sessionDates.has(dateStr)) {
        streak++;
      } else {
        // First day (today) with no session — streak hasn't started yet
        if (streak === 0 && graceUsed === 0) {
          // Check if yesterday had a session; if not, streak is 0
          current.setDate(current.getDate() - 1);
          const yesterdayStr = current.toISOString().split('T')[0];
          if (!sessionDates.has(yesterdayStr)) {
            break;
          }
          // Yesterday counts, continue the loop from yesterday
          continue;
        }

        graceUsed++;
        if (graceUsed > graceDays) {
          break; // Exceeded grace allowance → streak ends
        }
      }

      graceWindow++;
      if (graceWindow >= 7) {
        // Reset grace counter each week
        graceWindow = 0;
        graceUsed = 0;
      }

      current.setDate(current.getDate() - 1);
    }

    return streak;
  }

  /**
   * Scans all sessions for an activity and returns the longest
   * consecutive-day streak ever recorded.
   *
   * @param activityId Activity primary key.
   * @returns Longest streak length in days.
   */
  async getLongestStreak(activityId: number): Promise<number> {
    const sessions = await db.sessions.where('activityId').equals(activityId).toArray();

    if (sessions.length === 0) return 0;

    const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort();
    let longest = 1;
    let current = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
      const curr = new Date(uniqueDates[i] + 'T00:00:00');
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return longest;
  }

  // ── completion rates ──────────────────────────────────────

  /**
   * Computes the weekly completion rate for a single activity:
   * `(actual minutes / goal minutes) × 100`, capped at 100.
   *
   * @param activityId Activity primary key.
   * @returns Completion rate 0–100.
   */
  async getWeeklyCompletionRate(activityId: number): Promise<number> {
    const activity = await db.activities.get(activityId);
    if (!activity || activity.weeklyGoalMinutes === 0) return 0;

    const weekStart = this.getWeekStartDate(new Date());
    const totalMinutes = await this.sessionService.getTotalMinutesForWeek(activityId, weekStart);

    return Math.min(100, Math.round((totalMinutes / activity.weeklyGoalMinutes) * 100));
  }

  /**
   * Computes the average weekly completion rate across all active
   * (non-archived) activities.
   *
   * @returns Overall completion rate 0–100.
   */
  async getOverallCompletionRate(): Promise<number> {
    const activities = this.activityService.activities();
    if (activities.length === 0) return 0;

    let totalRate = 0;
    for (const activity of activities) {
      totalRate += await this.getWeeklyCompletionRate(activity.id!);
    }

    return Math.round(totalRate / activities.length);
  }

  // ── helpers ───────────────────────────────────────────────

  /**
   * Returns the Monday of the week that contains `date`, formatted
   * as "YYYY-MM-DD".
   *
   * @param date Any Date object.
   * @returns ISO date string of Monday.
   */
  getWeekStartDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  /** Returns today's date as "YYYY-MM-DD". */
  private todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }
}
