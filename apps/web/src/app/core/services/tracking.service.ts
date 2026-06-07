import { inject, Injectable } from '@angular/core';
import { Firestore, setDoc, getDoc } from '@angular/fire/firestore';
import { DailyLog, SCIENCE_THRESHOLDS } from '@habits-tracker/shared';
import { userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { ActivityService } from './activity.service';

/**
 * Provides day-level tracking, streak calculations, and completion
 * rates used by the dashboard and progress views.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly activityService = inject(ActivityService);

  // ── daily check-in ────────────────────────────────────────

  /**
   * Checks whether today has already been marked as tracked.
   */
  async isTodayTracked(): Promise<boolean> {
    const uid = this.authService.uid();
    if (!uid) return false;

    const today = this.todayISO();
    const docRef = userDoc(this.firestore, uid, 'dailyLogs', today);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? ((snapshot.data() as DailyLog).isTracked ?? false) : false;
  }

  /**
   * Creates or updates today's `DailyLog`, marking it as tracked.
   */
  async markDayTracked(mood?: 1 | 2 | 3 | 4 | 5, reflection?: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const today = this.todayISO();
    const docRef = userDoc(this.firestore, uid, 'dailyLogs', today);

    const data: Record<string, any> = {
      date: today,
      isTracked: true,
      trackedAt: new Date().toISOString(),
    };
    if (mood !== undefined) data['mood'] = mood;
    if (reflection !== undefined) data['reflection'] = reflection;

    await setDoc(docRef, data, { merge: true });
  }

  // ── streaks ───────────────────────────────────────────────

  /**
   * Calculates the current streak for an activity.
   */
  async getStreak(activityId: string | number): Promise<number> {
    const sessions = await this.sessionService.getSessionsForActivity(activityId);

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
        if (streak === 0 && graceUsed === 0) {
          current.setDate(current.getDate() - 1);
          const yesterdayStr = current.toISOString().split('T')[0];
          if (!sessionDates.has(yesterdayStr)) {
            break;
          }
          continue;
        }

        graceUsed++;
        if (graceUsed > graceDays) {
          break;
        }
      }

      graceWindow++;
      if (graceWindow >= 7) {
        graceWindow = 0;
        graceUsed = 0;
      }

      current.setDate(current.getDate() - 1);
    }

    return streak;
  }

  /**
   * Returns the longest consecutive-day streak ever recorded.
   */
  async getLongestStreak(activityId: string | number): Promise<number> {
    const sessions = await this.sessionService.getSessionsForActivity(activityId);

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
   * Computes the weekly completion rate for a single activity.
   */
  async getWeeklyCompletionRate(activityId: string | number): Promise<number> {
    const activity = await this.activityService.getActivity(activityId);
    if (!activity || activity.weeklyGoalMinutes === 0) return 0;

    const weekStart = this.getWeekStartDate(new Date());
    const totalMinutes = await this.sessionService.getTotalMinutesForWeek(activityId, weekStart);

    return Math.min(100, Math.round((totalMinutes / activity.weeklyGoalMinutes) * 100));
  }

  /**
   * Computes the average weekly completion rate across all active activities.
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

  getWeekStartDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  private todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }
}
