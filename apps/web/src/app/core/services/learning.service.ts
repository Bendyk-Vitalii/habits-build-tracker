import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../environments/environment';
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
} from '@habits-tracker/shared';
import { userCollection, userDoc } from '../db/firestore.helpers';
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

  // ── AI Generation ────────────────────────────────────────

  async generateLesson(
    topicName: string,
    durationMinutes = 10,
    difficulty: LessonDifficulty = 'intermediate',
  ): Promise<AiLessonResponse> {
    const genAI = new GoogleGenerativeAI(environment.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const difficultyInstructions = this.getDifficultyInstructions(difficulty);

    const prompt = `You are an expert tutor. Create a short, engaging lesson about "${topicName}".
The lesson should take about ${durationMinutes} minutes to read.

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
${difficultyInstructions}

Return ONLY a raw JSON object (no markdown, no backticks, no explanation — just the JSON) matching this schema:
{
  "title": "A catchy title for the lesson",
  "contentBlocks": [
    { "type": "heading", "value": "Section heading" },
    { "type": "text", "value": "A paragraph of text explaining a concept." },
    { "type": "code", "value": "code snippet here if relevant" }
  ],
  "quiz": [
    {
      "question": "A question testing understanding of the material?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    }
  ],
  "difficulty": "${difficulty}"
}

Include exactly 3 quiz questions if the topic is suitable for testing, otherwise omit the quiz field entirely.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Strip potential markdown code fences
    text = text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();

    return JSON.parse(text) as AiLessonResponse;
  }

  private getDifficultyInstructions(difficulty: LessonDifficulty): string {
    switch (difficulty) {
      case 'intermediate':
        return `Focus on practical, real-world applications and patterns. Skip basic definitions but provide enough context for someone with foundational knowledge. Include industry best practices and common pitfalls.`;
      case 'advanced':
        return `Target experienced practitioners. Cover advanced patterns, optimization techniques, edge cases, and architectural decisions. Include performance considerations, trade-offs, and lesser-known features. Do NOT explain basic concepts — assume strong foundational knowledge.`;
      case 'expert':
        return `Target senior/staff-level professionals. Dive into internals, cutting-edge techniques, research-backed approaches, and system design considerations. Cover topics like performance tuning at scale, novel patterns, contributions to the field, and cross-domain insights. Assume mastery of the topic and focus on pushing boundaries.`;
    }
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

    const col = userCollection(this.firestore, uid, 'savedLessons');
    const q = query(col, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as SavedLesson);
  }

  async getSavedLessonById(id: string): Promise<SavedLesson | undefined> {
    const uid = this.authService.uid();
    if (!uid) return undefined;
    const docRef = userDoc(this.firestore, uid, 'savedLessons', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return { ...snap.data(), id: snap.id } as unknown as SavedLesson;
  }

  async deleteSavedLesson(id: string): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'savedLessons', id);
    await deleteDoc(docRef);
  }

  async getSavedLessonsCount(): Promise<number> {
    const uid = this.authService.uid();
    if (!uid) return 0;

    const col = userCollection(this.firestore, uid, 'savedLessons');
    const snapshot = await getDocs(col);
    return snapshot.size;
  }
}
