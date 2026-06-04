import { Injectable } from '@angular/core';
import { Session, SessionType } from '@habits-tracker/shared';
import { db } from '../db/app.database';

/**
 * Manages session (work-log) entries stored in IndexedDB.
 *
 * Every time a user completes a pomodoro, manual entry, or stopwatch
 * session, a `Session` record is created through this service.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  /**
   * Creates a new session record for a given activity.
   * @param activityId  The activity this session belongs to.
   * @param durationMinutes  How long the session lasted.
   * @param type  Session type (pomodoro, manual, stopwatch).
   * @param note  Optional free-text note.
   * @param pomodorosCompleted  Optional pomodoro count.
   * @param date  Optional ISO date "YYYY-MM-DD" for backdating. Defaults to today.
   * @returns The id of the newly created session.
   */
  async logSession(
    activityId: number,
    durationMinutes: number,
    type: SessionType,
    note?: string,
    pomodorosCompleted?: number,
    date?: string,
  ): Promise<number> {
    const now = new Date();
    const sessionDate = date || now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    const session: Session = {
      activityId,
      date: sessionDate,
      durationMinutes,
      type,
      createdAt: now.toISOString(),
      ...(note !== undefined && { note }),
      ...(pomodorosCompleted !== undefined && { pomodorosCompleted }),
    };

    const id = await db.sessions.add(session);
    return id as number;
  }

  /**
   * Returns all sessions recorded on a specific date.
   * @param date ISO date string "YYYY-MM-DD".
   */
  async getSessionsForDate(date: string): Promise<Session[]> {
    return db.sessions.where('date').equals(date).toArray();
  }

  /**
   * Returns all sessions within a date range (inclusive).
   * @param startDate ISO date "YYYY-MM-DD".
   * @param endDate   ISO date "YYYY-MM-DD".
   */
  async getSessionsForDateRange(startDate: string, endDate: string): Promise<Session[]> {
    return db.sessions.where('date').between(startDate, endDate, true, true).toArray();
  }

  /**
   * Returns sessions for a specific activity, optionally filtered by date range.
   * @param activityId Activity primary key.
   * @param startDate  Optional lower bound "YYYY-MM-DD".
   * @param endDate    Optional upper bound "YYYY-MM-DD".
   */
  async getSessionsForActivity(
    activityId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<Session[]> {
    if (startDate && endDate) {
      return db.sessions
        .where('[activityId+date]')
        .between([activityId, startDate], [activityId, endDate], true, true)
        .toArray();
    }

    return db.sessions.where('activityId').equals(activityId).toArray();
  }

  /**
   * Sums total minutes logged for an activity in a given week.
   * @param activityId   Activity primary key.
   * @param weekStartDate  Monday of the week "YYYY-MM-DD".
   * @returns Total minutes for the week.
   */
  async getTotalMinutesForWeek(activityId: number, weekStartDate: string): Promise<number> {
    const weekEnd = this.addDays(weekStartDate, 6);
    const sessions = await this.getSessionsForActivity(activityId, weekStartDate, weekEnd);
    return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  /**
   * Returns all sessions recorded today.
   */
  async getTodaySessions(): Promise<Session[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getSessionsForDate(today);
  }

  /**
   * Hard-deletes a session by id.
   * @param id Session primary key.
   */
  async deleteSession(id: number): Promise<void> {
    await db.sessions.delete(id);
  }

  // ── helpers ───────────────────────────────────────────────

  /** Adds `days` to an ISO date string and returns the new ISO date string. */
  private addDays(date: string, days: number): string {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
