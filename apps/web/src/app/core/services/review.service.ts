import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
} from '@angular/fire/firestore';
import { WeeklyReview, MonthlyReview } from '@habits-tracker/shared';
import { userCollection, userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TrackingService } from './tracking.service';
import { ActivityService } from './activity.service';

/**
 * Generates, persists, and retrieves weekly / monthly review
 * summaries for the progress and review screens.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly trackingService = inject(TrackingService);
  private readonly activityService = inject(ActivityService);

  // ── weekly reviews ────────────────────────────────────────

  /**
   * Compiles statistics for a given week and returns a `WeeklyReview`.
   */
  async generateWeeklyReview(weekStartDate: string): Promise<WeeklyReview> {
    const weekEndDate = this.addDays(weekStartDate, 6);
    const activities = this.activityService.activities();

    const sessions = await this.sessionService.getSessionsForDateRange(weekStartDate, weekEndDate);

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    let activitiesCompleted = 0;
    for (const activity of activities) {
      const mins = await this.sessionService.getTotalMinutesForWeek(activity.id!, weekStartDate);
      if (mins >= activity.weeklyGoalMinutes) {
        activitiesCompleted++;
      }
    }

    const activitiesTotal = activities.length;
    const completionRate =
      activitiesTotal > 0 ? Math.round((activitiesCompleted / activitiesTotal) * 100) : 0;

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
   * Persists a weekly review in Firestore using weekStartDate as doc ID.
   */
  async saveWeeklyReview(review: WeeklyReview): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const data = { ...review } as Record<string, unknown>;
    delete data['id'];
    const docRef = userDoc(this.firestore, uid, 'weeklyReviews', review.weekStartDate);
    await setDoc(docRef, data);
    return review.weekStartDate;
  }

  /**
   * Returns past weekly reviews, most-recent first.
   */
  async getWeeklyReviews(limit?: number): Promise<WeeklyReview[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'weeklyReviews');
    const constraints: QueryConstraint[] = [orderBy('weekStartDate', 'desc')];
    if (limit) constraints.push(firestoreLimit(limit));

    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as WeeklyReview);
  }

  // ── monthly reviews ───────────────────────────────────────

  /**
   * Compiles statistics for a given month and returns a `MonthlyReview`.
   */
  async generateMonthlyReview(month: string): Promise<MonthlyReview> {
    const startDate = `${month}-01`;
    const endDate = this.lastDayOfMonth(month);

    const sessions = await this.sessionService.getSessionsForDateRange(startDate, endDate);

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalSessions = sessions.length;

    const weekStarts = this.getWeekStartsInMonth(month);
    const activities = this.activityService.activities();

    let weeklyCompletionSum = 0;
    let weekCount = 0;

    for (const ws of weekStarts) {
      let weekCompleted = 0;
      for (const activity of activities) {
        const mins = await this.sessionService.getTotalMinutesForWeek(activity.id!, ws);
        if (mins >= activity.weeklyGoalMinutes) {
          weekCompleted++;
        }
      }
      if (activities.length > 0) {
        weeklyCompletionSum += (weekCompleted / activities.length) * 100;
      }
      weekCount++;
    }

    const averageWeeklyCompletion = weekCount > 0 ? Math.round(weeklyCompletionSum / weekCount) : 0;

    const streakData: Record<string, number> = {};
    for (const activity of activities) {
      streakData[String(activity.id!)] = await this.trackingService.getLongestStreak(activity.id!);
    }

    const phaseTransitions: string[] = [];
    for (const activity of activities) {
      const activitySessions = sessions.filter((s) => String(s.activityId) === String(activity.id));
      if (activitySessions.length > 0) {
        phaseTransitions.push(`${activity.name}: ${activity.currentPhase}`);
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
   * Persists a monthly review in Firestore using month as doc ID.
   */
  async saveMonthlyReview(review: MonthlyReview): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const data = { ...review } as Record<string, unknown>;
    delete data['id'];
    const docRef = userDoc(this.firestore, uid, 'monthlyReviews', review.month);
    await setDoc(docRef, data);
    return review.month;
  }

  /**
   * Returns past monthly reviews, most-recent first.
   */
  async getMonthlyReviews(limit?: number): Promise<MonthlyReview[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'monthlyReviews');
    const constraints: QueryConstraint[] = [orderBy('month', 'desc')];
    if (limit) constraints.push(firestoreLimit(limit));

    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as MonthlyReview);
  }

  // ── helpers ───────────────────────────────────────────────

  private addDays(date: string, days: number): string {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private lastDayOfMonth(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const d = new Date(year, mon, 0);
    return d.toISOString().split('T')[0];
  }

  private getWeekStartsInMonth(month: string): string[] {
    const startDate = new Date(`${month}-01T00:00:00`);
    const lastDay = this.lastDayOfMonth(month);
    const endDate = new Date(lastDay + 'T00:00:00');

    const weeks: string[] = [];
    const current = new Date(startDate);

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
