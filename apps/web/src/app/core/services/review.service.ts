import { inject, Injectable } from '@angular/core';
import { WeeklyReview, MonthlyReview } from '@habits-tracker/shared';
import { db } from '../db/app.database';
import { SessionService } from './session.service';
import { TrackingService } from './tracking.service';
import { ActivityService } from './activity.service';

/**
 * Generates, persists, and retrieves weekly / monthly review
 * summaries for the progress and review screens.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly sessionService = inject(SessionService);
  private readonly trackingService = inject(TrackingService);
  private readonly activityService = inject(ActivityService);

  // ── weekly reviews ────────────────────────────────────────

  /**
   * Compiles statistics for a given week and returns a `WeeklyReview`.
   * Does **not** persist automatically — call `saveWeeklyReview()` to store.
   *
   * @param weekStartDate Monday of the target week "YYYY-MM-DD".
   */
  async generateWeeklyReview(weekStartDate: string): Promise<WeeklyReview> {
    const weekEndDate = this.addDays(weekStartDate, 6);
    const activities = this.activityService.activities();

    const sessions = await this.sessionService.getSessionsForDateRange(
      weekStartDate,
      weekEndDate
    );

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );

    // Count how many activities met their weekly goal
    let activitiesCompleted = 0;
    for (const activity of activities) {
      const mins = await this.sessionService.getTotalMinutesForWeek(
        activity.id!,
        weekStartDate
      );
      if (mins >= activity.weeklyGoalMinutes) {
        activitiesCompleted++;
      }
    }

    const activitiesTotal = activities.length;
    const completionRate =
      activitiesTotal > 0
        ? Math.round((activitiesCompleted / activitiesTotal) * 100)
        : 0;

    return {
      weekStartDate,
      weekEndDate,
      totalMinutes,
      totalSessions: sessions.length,
      activitiesCompleted,
      activitiesTotal,
      completionRate,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Persists a weekly review in IndexedDB.
   * If one already exists for the same week, it is replaced.
   *
   * @param review The WeeklyReview to save.
   */
  async saveWeeklyReview(review: WeeklyReview): Promise<number> {
    const existing = await db.weeklyReviews
      .where('weekStartDate')
      .equals(review.weekStartDate)
      .first();

    if (existing) {
      review.id = existing.id;
    }

    return (await db.weeklyReviews.put(review)) as number;
  }

  /**
   * Returns past weekly reviews, most-recent first.
   * @param limit Max number of reviews to return (default: all).
   */
  async getWeeklyReviews(limit?: number): Promise<WeeklyReview[]> {
    let collection = db.weeklyReviews.orderBy('weekStartDate').reverse();
    if (limit) {
      collection = collection.limit(limit);
    }
    return collection.toArray();
  }

  // ── monthly reviews ───────────────────────────────────────

  /**
   * Compiles statistics for a given month and returns a `MonthlyReview`.
   * Does **not** persist automatically — call `saveMonthlyReview()` to store.
   *
   * @param month Target month "YYYY-MM".
   */
  async generateMonthlyReview(month: string): Promise<MonthlyReview> {
    const startDate = `${month}-01`;
    const endDate = this.lastDayOfMonth(month);

    const sessions = await this.sessionService.getSessionsForDateRange(
      startDate,
      endDate
    );

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0
    );
    const totalSessions = sessions.length;

    // Compute weekly completion averages for the month
    const weekStarts = this.getWeekStartsInMonth(month);
    const activities = this.activityService.activities();

    let weeklyCompletionSum = 0;
    let weekCount = 0;

    for (const ws of weekStarts) {
      let weekCompleted = 0;
      for (const activity of activities) {
        const mins = await this.sessionService.getTotalMinutesForWeek(
          activity.id!,
          ws
        );
        if (mins >= activity.weeklyGoalMinutes) {
          weekCompleted++;
        }
      }
      if (activities.length > 0) {
        weeklyCompletionSum += (weekCompleted / activities.length) * 100;
      }
      weekCount++;
    }

    const averageWeeklyCompletion =
      weekCount > 0 ? Math.round(weeklyCompletionSum / weekCount) : 0;

    // Streak data per activity
    const streakData: Record<number, number> = {};
    for (const activity of activities) {
      streakData[activity.id!] =
        await this.trackingService.getLongestStreak(activity.id!);
    }

    // Phase transitions (simple text entries)
    const phaseTransitions: string[] = [];
    for (const activity of activities) {
      const activitySessions = sessions.filter(
        (s) => s.activityId === activity.id
      );
      if (activitySessions.length > 0) {
        phaseTransitions.push(
          `${activity.name}: ${activity.currentPhase}`
        );
      }
    }

    return {
      month,
      totalMinutes,
      totalSessions,
      averageWeeklyCompletion,
      streakData,
      phaseTransitions,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Persists a monthly review in IndexedDB.
   * If one already exists for the same month, it is replaced.
   *
   * @param review The MonthlyReview to save.
   */
  async saveMonthlyReview(review: MonthlyReview): Promise<number> {
    const existing = await db.monthlyReviews
      .where('month')
      .equals(review.month)
      .first();

    if (existing) {
      review.id = existing.id;
    }

    return (await db.monthlyReviews.put(review)) as number;
  }

  /**
   * Returns past monthly reviews, most-recent first.
   * @param limit Max number of reviews to return (default: all).
   */
  async getMonthlyReviews(limit?: number): Promise<MonthlyReview[]> {
    let collection = db.monthlyReviews.orderBy('month').reverse();
    if (limit) {
      collection = collection.limit(limit);
    }
    return collection.toArray();
  }

  // ── helpers ───────────────────────────────────────────────

  /** Adds `days` to an ISO date string and returns the new ISO date string. */
  private addDays(date: string, days: number): string {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /** Returns the last day of the given month "YYYY-MM" as "YYYY-MM-DD". */
  private lastDayOfMonth(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    // Day 0 of the next month = last day of this month
    const d = new Date(year, mon, 0);
    return d.toISOString().split('T')[0];
  }

  /**
   * Returns an array of Monday ISO dates for every week that overlaps
   * with the given month.
   */
  private getWeekStartsInMonth(month: string): string[] {
    const startDate = new Date(`${month}-01T00:00:00`);
    const lastDay = this.lastDayOfMonth(month);
    const endDate = new Date(lastDay + 'T00:00:00');

    const weeks: string[] = [];
    const current = new Date(startDate);

    // Rewind to Monday of the first week
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + diff);

    while (current <= endDate) {
      weeks.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }
}
