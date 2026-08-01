import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Functions, httpsCallable } from '@angular/fire/functions';
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
import {
  LearningTopic,
  LearningSession,
  DEFAULT_LEARNING_TOPICS,
  AiLessonResponse,
  LessonDifficulty,
  SavedLesson,
  SavedFlashcard,
  FlashcardItem,
} from '@habits-tracker/shared';
import { userCollection, userDoc, docWithId } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages learning topics, learning sessions, and saved lessons in Firestore.
 *
 * Collections:
 * - `users/{uid}/learningTopics`
 * - `users/{uid}/learningSessions`
 * - `users/{uid}/savedLessons`
 */
@Injectable({ providedIn: 'root' })
export class LearningService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private functions = inject(Functions);
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

        const col = userCollection<LearningTopic>(this.firestore, uid, 'learningTopics');
        const q = query(col, orderBy('order'));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map((d) => docWithId(d)).filter((t) => !t.isArchived);
          this._topics.set(items);
        });
      });
    }
  }

  // ── Topics CRUD ──────────────────────────────────────────

  async addTopic(data: Omit<LearningTopic, 'id' | 'createdAt'>): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const col = userCollection<LearningTopic>(this.firestore, uid, 'learningTopics');
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
    const docRef = userDoc<LearningTopic>(this.firestore, uid, 'learningTopics', id);
    await updateDoc(docRef, data as Record<string, unknown>);
  }

  async deleteTopic(id: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc<LearningTopic>(this.firestore, uid, 'learningTopics', id);
    await deleteDoc(docRef);
  }

  async reorderTopics(orderedIds: string[]): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const batch = writeBatch(this.firestore);
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = userDoc<LearningTopic>(this.firestore, uid, 'learningTopics', orderedIds[i]);
      batch.update(docRef, { order: i });
    }
    await batch.commit();
  }

  async seedDefaultTopics(): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const col = userCollection<LearningTopic>(this.firestore, uid, 'learningTopics');
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

  // ── AI Generation ────────────────────────────────────────

  async generateLesson(
    topicName: string,
    durationMinutes = 10,
    difficulty: LessonDifficulty = 'intermediate',
  ): Promise<AiLessonResponse> {
    const generateFn = httpsCallable<Record<string, unknown>, AiLessonResponse>(
      this.functions,
      'aiGenerateLesson',
    );
    const result = await generateFn({ topicName, durationMinutes, difficulty });
    return result.data;
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
    const docRef = userDoc<LearningSession>(this.firestore, uid, 'learningSessions', sessionId);
    await updateDoc(docRef, { rating });
  }

  async getRecentSessions(count = 10): Promise<LearningSession[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection<LearningSession>(this.firestore, uid, 'learningSessions');
    const q = query(col, orderBy('createdAt', 'desc'), firestoreLimit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docWithId(d));
  }

  async getAllSessions(): Promise<LearningSession[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection<LearningSession>(this.firestore, uid, 'learningSessions');
    const snapshot = await getDocs(col);
    return snapshot.docs.map((d) => docWithId(d));
  }

  async getSessionsForTopic(
    topicId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LearningSession[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection<LearningSession>(this.firestore, uid, 'learningSessions');
    const constraints: ReturnType<typeof where>[] = [where('topicId', '==', topicId)];

    if (startDate && endDate) {
      constraints.push(where('date', '>=', startDate));
      constraints.push(where('date', '<=', endDate));
    }

    const q = query(col, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docWithId(d));
  }

  async getTotalMinutesForTopic(topicId: string): Promise<number> {
    const sessions = await this.getSessionsForTopic(topicId);
    return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  async getSessionCountForTopic(topicId: string): Promise<number> {
    const sessions = await this.getSessionsForTopic(topicId);
    return sessions.length;
  }

  async getTopicById(id: string): Promise<LearningTopic | undefined> {
    const uid = this.authService.uid();
    if (!uid) return undefined;
    const docRef = userDoc<LearningTopic>(this.firestore, uid, 'learningTopics', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return docWithId(snap);
  }

  // ── Saved Lessons ───────────────────────────────────────

  async saveLesson(
    topic: LearningTopic,
    lesson: AiLessonResponse,
    difficulty: LessonDifficulty,
  ): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const col = userCollection(this.firestore, uid, 'savedLessons');
    const data: Omit<SavedLesson, 'id'> = {
      title: lesson.title,
      topicId: topic.id!,
      topicName: topic.name,
      topicIcon: topic.icon,
      topicColor: topic.color,
      difficulty,
      contentBlocks: lesson.contentBlocks,
      quiz: lesson.quiz,
      savedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(col, data);
    return docRef.id;
  }

  async getSavedLessons(): Promise<SavedLesson[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection<SavedLesson>(this.firestore, uid, 'savedLessons');
    const q = query(col, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docWithId(d));
  }

  async getSavedLessonById(id: string): Promise<SavedLesson | undefined> {
    const uid = this.authService.uid();
    if (!uid) return undefined;
    const docRef = userDoc<SavedLesson>(this.firestore, uid, 'savedLessons', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return docWithId(snap);
  }

  async deleteSavedLesson(id: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc<SavedLesson>(this.firestore, uid, 'savedLessons', id);
    await deleteDoc(docRef);
  }

  async getSavedLessonsCount(): Promise<number> {
    const uid = this.authService.uid();
    if (!uid) return 0;

    const col = userCollection<SavedLesson>(this.firestore, uid, 'savedLessons');
    const snapshot = await getDocs(col);
    return snapshot.size;
  }

  // ── Saved Flashcards ─────────────────────────────────────

  async saveFlashcard(card: FlashcardItem, topicName: string): Promise<string | undefined> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const col = userCollection<SavedFlashcard>(this.firestore, uid, 'savedFlashcards');

    // Check for duplicates
    const q = query(
      col,
      where('front', '==', card.front),
      where('topicName', '==', topicName),
      firestoreLimit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].id;
    }

    const data: Omit<SavedFlashcard, 'id'> = {
      front: card.front,
      back: card.back,
      topicName,
      savedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(col, data);
    return docRef.id;
  }

  async saveFlashcards(cards: FlashcardItem[], topicName: string): Promise<void> {
    if (!cards || cards.length === 0) return;

    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const col = userCollection<SavedFlashcard>(this.firestore, uid, 'savedFlashcards');
    const batch = writeBatch(this.firestore);

    // Check for duplicates in a simple way or fetch all existing for this topic to avoid multiple queries
    const existingQ = query(col, where('topicName', '==', topicName));
    const existingSnap = await getDocs(existingQ);
    const existingFronts = new Set(existingSnap.docs.map((d) => d.data().front));

    let addedCount = 0;
    const now = new Date().toISOString();

    for (const card of cards) {
      if (!existingFronts.has(card.front)) {
        const docRef = doc(col);
        const data: Omit<SavedFlashcard, 'id'> = {
          front: card.front,
          back: card.back,
          topicName,
          savedAt: now,
        };
        batch.set(docRef, data);
        addedCount++;
        // Also add to set to avoid duplicates within the same batch
        existingFronts.add(card.front);
      }
    }

    if (addedCount > 0) {
      await batch.commit();
    }
  }

  async getSavedFlashcards(): Promise<SavedFlashcard[]> {
    const uid = this.authService.uid();
    if (!uid) return [];

    const col = userCollection<SavedFlashcard>(this.firestore, uid, 'savedFlashcards');
    const q = query(col, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docWithId(d));
  }

  async deleteSavedFlashcard(id: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc<SavedFlashcard>(this.firestore, uid, 'savedFlashcards', id);
    await deleteDoc(docRef);
  }

  async getSavedFlashcardsCount(): Promise<number> {
    const uid = this.authService.uid();
    if (!uid) return 0;

    const col = userCollection<SavedFlashcard>(this.firestore, uid, 'savedFlashcards');
    const snapshot = await getDocs(col);
    return snapshot.size;
  }
}
