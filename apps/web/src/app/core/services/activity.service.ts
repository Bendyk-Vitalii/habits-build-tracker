import { Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import {
  Activity,
  HabitPhase,
  DEFAULT_ACTIVITIES,
  SCIENCE_THRESHOLDS,
  getPhaseForDays,
} from '@habits-tracker/shared';
import { db } from '../db/app.database';

/**
 * Manages activities (habits) stored in IndexedDB.
 *
 * Enforces science-backed limits such as max 3 establishing habits
 * and provides phase-transition logic.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  /** Reactive signal of all non-archived activities, ordered by `order`. */
  readonly activities: Signal<Activity[]> = toSignal(
    from(
      liveQuery(() =>
        db.activities
          .where('isArchived')
          .equals(0) // Dexie stores booleans as 0/1
          .sortBy('order')
      )
    ),
    { initialValue: [] }
  );

  /**
   * Returns a single activity by id.
   * @param id Activity primary key.
   */
  async getActivity(id: number): Promise<Activity | undefined> {
    return db.activities.get(id);
  }

  /**
   * Creates a new activity.
   *
   * Enforces the max-establishing-habits limit (3) from `SCIENCE_THRESHOLDS`.
   * @param data Activity data (without `id`, `createdAt`).
   * @throws Error when the establishing-phase limit would be exceeded.
   */
  async addActivity(
    data: Omit<Activity, 'id' | 'createdAt'>
  ): Promise<number> {
    if (
      data.currentPhase === HabitPhase.Establishing
    ) {
      const establishingCount = await db.activities
        .where('isArchived')
        .equals(0)
        .filter((a) => a.currentPhase === HabitPhase.Establishing)
        .count();

      if (establishingCount >= SCIENCE_THRESHOLDS.limits.maxEstablishingHabits) {
        throw new Error(
          `Cannot add more than ${SCIENCE_THRESHOLDS.limits.maxEstablishingHabits} establishing habits at once. ` +
          `Wait until an existing habit transitions to the Forming phase.`
        );
      }
    }

    const id = await db.activities.add({
      ...data,
      createdAt: new Date().toISOString(),
    } as Activity);

    return id as number;
  }

  /**
   * Partially updates an existing activity.
   * @param id Activity primary key.
   * @param data Fields to update.
   */
  async updateActivity(
    id: number,
    data: Partial<Activity>
  ): Promise<void> {
    await db.activities.update(id, data);
  }

  /**
   * Soft-deletes an activity by setting `isArchived` to true.
   * @param id Activity primary key.
   */
  async archiveActivity(id: number): Promise<void> {
    await db.activities.update(id, { isArchived: true });
  }

  /**
   * Hard-deletes an activity and all associated sessions.
   * @param id Activity primary key.
   */
  async deleteActivity(id: number): Promise<void> {
    await db.transaction('rw', [db.activities, db.sessions], async () => {
      await db.sessions.where('activityId').equals(id).delete();
      await db.activities.delete(id);
    });
  }

  /**
   * Batch-updates the `order` field for a list of activity ids.
   * @param orderedIds Ordered array of activity ids.
   */
  async reorderActivities(orderedIds: number[]): Promise<void> {
    await db.transaction('rw', db.activities, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.activities.update(orderedIds[i], { order: i });
      }
    });
  }

  /**
   * Recalculates and persists the current phase for an activity
   * based on its `consecutiveDays` value.
   * @param id Activity primary key.
   */
  async updatePhase(id: number): Promise<void> {
    const activity = await db.activities.get(id);
    if (!activity) return;

    const newPhase = getPhaseForDays(activity.consecutiveDays);

    if (newPhase !== activity.currentPhase) {
      await db.activities.update(id, {
        currentPhase: newPhase,
        phaseStartDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  /**
   * Seeds the database with `DEFAULT_ACTIVITIES` if no activities exist.
   * Sets `createdAt` and `phaseStartDate` to the current timestamp.
   */
  async seedDefaultActivities(): Promise<void> {
    const count = await db.activities.count();
    if (count > 0) return;

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const activitiesToSeed: Activity[] = DEFAULT_ACTIVITIES.map((a) => ({
      ...a,
      consecutiveDays: 0,
      createdAt: now,
      phaseStartDate: today,
    })) as Activity[];

    await db.activities.bulkAdd(activitiesToSeed);
  }
}
