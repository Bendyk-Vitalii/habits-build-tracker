import { Injectable, Signal, PLATFORM_ID, inject, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
} from '@angular/fire/firestore';
import {
  Activity,
  HabitPhase,
  DEFAULT_ACTIVITIES,
  SCIENCE_THRESHOLDS,
  getPhaseForDays,
} from '@habits-tracker/shared';
import { userCollection, userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages activities (habits) stored in Firestore.
 *
 * Enforces science-backed limits such as max 3 establishing habits
 * and provides phase-transition logic.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private _activities = signal<Activity[]>([]);
  private unsubscribe: (() => void) | null = null;

  /** Reactive signal of all non-archived activities, ordered by `order`. */
  readonly activities: Signal<Activity[]> = this._activities.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const uid = this.authService.uid();
        if (!uid) return;

        // Clean up previous listener
        this.unsubscribe?.();

        const col = userCollection(this.firestore, uid, 'activities');
        const q = query(col, where('isArchived', '==', 0), orderBy('order'));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          })) as unknown as Activity[];
          this._activities.set(items);
        });
      });
    }
  }

  /**
   * Returns a single activity by id.
   */
  async getActivity(id: string | number): Promise<Activity | undefined> {
    const uid = this.authService.uid();
    if (!uid) return undefined;
    const col = userCollection(this.firestore, uid, 'activities');
    const snapshot = await getDocs(col);
    const docSnap = snapshot.docs.find((d) => d.id === String(id));
    if (!docSnap) return undefined;
    return { ...docSnap.data(), id: docSnap.id } as unknown as Activity;
  }

  /**
   * Creates a new activity.
   */
  async addActivity(data: Omit<Activity, 'id' | 'createdAt'>): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    if (data.currentPhase === HabitPhase.Establishing) {
      const activities = this._activities();
      const establishingCount = activities.filter(
        (a) => a.currentPhase === HabitPhase.Establishing,
      ).length;

      if (establishingCount >= SCIENCE_THRESHOLDS.limits.maxEstablishingHabits) {
        throw new Error(
          `Cannot add more than ${SCIENCE_THRESHOLDS.limits.maxEstablishingHabits} establishing habits at once.`,
        );
      }
    }

    const col = userCollection(this.firestore, uid, 'activities');
    const docRef = await addDoc(col, {
      ...data,
      createdAt: new Date().toISOString(),
    });

    return docRef.id;
  }

  /**
   * Partially updates an existing activity.
   */
  async updateActivity(id: string | number, data: Partial<Activity>): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc(this.firestore, uid, 'activities', String(id));
    await updateDoc(docRef, data as Record<string, unknown>);
  }

  /**
   * Soft-deletes an activity by setting `isArchived` to true.
   */
  async archiveActivity(id: string | number): Promise<void> {
    await this.updateActivity(id, { isArchived: 1 } as Partial<Activity>);
  }

  /**
   * Hard-deletes an activity and all associated sessions.
   */
  async deleteActivity(id: string | number): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    // Delete all sessions for this activity
    const sessionsCol = userCollection(this.firestore, uid, 'sessions');
    const q = query(sessionsCol, where('activityId', '==', String(id)));
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));

    // Delete the activity itself
    const activityRef = userDoc(this.firestore, uid, 'activities', String(id));
    batch.delete(activityRef);

    await batch.commit();
  }

  /**
   * Batch-updates the `order` field for a list of activity ids.
   */
  async reorderActivities(orderedIds: (string | number)[]): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const batch = writeBatch(this.firestore);
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = userDoc(this.firestore, uid, 'activities', String(orderedIds[i]));
      batch.update(docRef, { order: i });
    }
    await batch.commit();
  }

  /**
   * Recalculates and persists the current phase for an activity.
   */
  async updatePhase(id: string | number): Promise<void> {
    const activity = await this.getActivity(id);
    if (!activity) return;

    const newPhase = getPhaseForDays(activity.consecutiveDays);

    if (newPhase !== activity.currentPhase) {
      await this.updateActivity(id, {
        currentPhase: newPhase,
        phaseStartDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  /**
   * Seeds the database with `DEFAULT_ACTIVITIES` if no activities exist.
   */
  async seedDefaultActivities(): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const col = userCollection(this.firestore, uid, 'activities');
    const snapshot = await getDocs(col);

    if (snapshot.size > 0) return;

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const batch = writeBatch(this.firestore);
    for (const a of DEFAULT_ACTIVITIES) {
      const docRef = doc(col);
      batch.set(docRef, {
        ...a,
        consecutiveDays: a.consecutiveDays ?? 0,
        createdAt: now,
        phaseStartDate: today,
      });
    }
    await batch.commit();
  }
}
