import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  writeBatch,
  doc,
} from '@angular/fire/firestore';
import { LearningTopic, LearningSession, DEFAULT_LEARNING_TOPICS } from '@habits-tracker/shared';
import { userCollection, userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages learning topics and learning sessions in Firestore.
 *
 * Collections:
 * - `users/{uid}/learningTopics`
 * - `users/{uid}/learningSessions`
 */
@Injectable({ providedIn: 'root' })
export class LearningService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private _topics = signal<LearningTopic[]>([]);
  private unsubscribe: (() => void) | null = null;

  /** Reactive signal of all non-archived learning topics, ordered by `order`. */
  readonly topics = this._topics.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const uid = this.authService.uid();
        if (!uid) return;

        this.unsubscribe?.();

        const col = userCollection(this.firestore, uid, 'learningTopics');
        const q = query(col, orderBy('order'));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs
            .map((d) => ({ ...d.data(), id: d.id }) as unknown as LearningTopic)
            .filter((t) => !t.isArchived);
          this._topics.set(items);
        });
      });
    }
  }

  // ── Topics CRUD ──────────────────────────────────────────

  async addTopic(data: Omit<LearningTopic, 'id' | 'createdAt'>): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const col = userCollection(this.firestore, uid, 'learningTopics');
    const docRef = await addDoc(col, {
      ...data,
      isArchived: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  }

  async updateTopic(id: string, data: Partial<LearningTopic>): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'learningTopics', id);
    await updateDoc(docRef, data as Record<string, unknown>);
  }

  async deleteTopic(id: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'learningTopics', id);
    await deleteDoc(docRef);
  }

  async reorderTopics(orderedIds: string[]): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const batch = writeBatch(this.firestore);
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = userDoc(this.firestore, uid, 'learningTopics', orderedIds[i]);
      batch.update(docRef, { order: i });
    }
    await batch.commit();
  }

  async seedDefaultTopics(): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const col = userCollection(this.firestore, uid, 'learningTopics');
    const snapshot = await getDocs(col);
    if (snapshot.size > 0) return;

    const now = new Date().toISOString();
    const batch = writeBatch(this.firestore);
    for (const t of DEFAULT_LEARNING_TOPICS) {
      const docRef = doc(col);
      batch.set(docRef, { ...t, isArchived: false, createdAt: now });
    }
    await batch.commit();
  }

  // ── Learning Sessions ────────────────────────────────────

  async logLearningSession(
    topicId: string,
    topicName: string,
    durationMinutes: number,
    rating?: number,
    notes?: string,
  ): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const now = new Date();
    const session: Record<string, unknown> = {
      topicId,
      topicName,
      durationMinutes,
      date: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
    };
    if (rating !== undefined) session['rating'] = rating;
    if (notes !== undefined) session['notes'] = notes;

    const col = userCollection(this.firestore, uid, 'learningSessions');
    const docRef = await addDoc(col, session);
    return docRef.id;
  }

  async rateSession(sessionId: string, rating: number): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'learningSessions', sessionId);
    await updateDoc(docRef, { rating });
  }

  async getRecentSessions(count = 10): Promise<LearningSession[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'learningSessions');
    const q = query(col, orderBy('createdAt', 'desc'), firestoreLimit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as LearningSession);
  }

  async getSessionsForTopic(
    topicId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LearningSession[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection(this.firestore, uid, 'learningSessions');
    const constraints: ReturnType<typeof where>[] = [where('topicId', '==', topicId)];

    if (startDate && endDate) {
      constraints.push(where('date', '>=', startDate));
      constraints.push(where('date', '<=', endDate));
    }

    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as LearningSession);
  }

  async getTotalMinutesForTopic(topicId: string): Promise<number> {
    const sessions = await this.getSessionsForTopic(topicId);
    return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  async getTopicById(id: string): Promise<LearningTopic | undefined> {
    const uid = this.authService.uid();
    if (!uid) return undefined;
    const docRef = userDoc(this.firestore, uid, 'learningTopics', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return { ...snap.data(), id: snap.id } as unknown as LearningTopic;
  }
}
