import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, deleteDoc, getDocs, query, where } from '@angular/fire/firestore';
import { Session, SessionType } from '@habits-tracker/shared';
import { userCollection, userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages session (work-log) entries stored in Firestore.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  /**
   * Creates a new session record for a given activity.
   */
  async logSession(
    activityId: string | number,
    durationMinutes: number,
    type: SessionType,
    note?: string,
    pomodorosCompleted?: number,
    date?: string,
  ): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const now = new Date();
    const sessionDate = date || now.toISOString().split('T')[0];

    const session: Record<string, any> = {
      activityId: String(activityId),
      date: sessionDate,
      durationMinutes,
      type,
      createdAt: now.toISOString(),
    };
    if (note !== undefined) session['note'] = note;
    if (pomodorosCompleted !== undefined) session['pomodorosCompleted'] = pomodorosCompleted;

    const col = userCollection(this.firestore, uid, 'sessions');
    const docRef = await addDoc(col, session);
    return docRef.id;
  }

  /**
   * Returns all sessions recorded on a specific date.
   */
  async getSessionsForDate(date: string): Promise<Session[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'sessions');
    const q = query(col, where('date', '==', date));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as Session);
  }

  /**
   * Returns all sessions within a date range (inclusive).
   */
  async getSessionsForDateRange(startDate: string, endDate: string): Promise<Session[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'sessions');
    const q = query(col, where('date', '>=', startDate), where('date', '<=', endDate));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as Session);
  }

  /**
   * Returns sessions for a specific activity, optionally filtered by date range.
   */
  async getSessionsForActivity(
    activityId: string | number,
    startDate?: string,
    endDate?: string,
  ): Promise<Session[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'sessions');
    const constraints: any[] = [where('activityId', '==', String(activityId))];

    if (startDate && endDate) {
      constraints.push(where('date', '>=', startDate));
      constraints.push(where('date', '<=', endDate));
    }

    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as Session);
  }

  /**
   * Sums total minutes logged for an activity in a given week.
   */
  async getTotalMinutesForWeek(
    activityId: string | number,
    weekStartDate: string,
  ): Promise<number> {
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
   */
  async deleteSession(id: string | number): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'sessions', String(id));
    await deleteDoc(docRef);
  }

  // ── helpers ───────────────────────────────────────────────

  private addDays(date: string, days: number): string {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
