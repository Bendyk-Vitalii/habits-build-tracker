import { Injectable, Signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of } from 'rxjs';
import { liveQuery } from 'dexie';
import { Task, TaskPriority } from '@habits-tracker/shared';
import { db } from '../db/app.database';

/**
 * Manages routine tasks (to-do items) stored in IndexedDB.
 *
 * Tasks are simple one-off items like "Call dentist" or
 * "Reschedule appointment" — separate from recurring habits.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private platformId = inject(PLATFORM_ID);

  /** Priority sort order: high → medium → low */
  private static readonly PRIORITY_ORDER: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  /** Reactive signal of all pending (non-completed) tasks, sorted by priority then createdAt. */
  readonly tasks: Signal<Task[]> = toSignal(
    isPlatformBrowser(this.platformId)
      ? from(
          liveQuery(() =>
            db.tasks
              .where('isCompleted')
              .equals(0)
              .toArray()
              .then((tasks) =>
                tasks.sort((a, b) => {
                  const pDiff =
                    TaskService.PRIORITY_ORDER[a.priority] - TaskService.PRIORITY_ORDER[b.priority];
                  if (pDiff !== 0) return pDiff;
                  return a.createdAt.localeCompare(b.createdAt);
                }),
              ),
          ),
        )
      : of([]),
    { initialValue: [] },
  );

  /** Reactive signal of completed tasks, most recent first. */
  readonly completedTasks: Signal<Task[]> = toSignal(
    isPlatformBrowser(this.platformId)
      ? from(
          liveQuery(() =>
            db.tasks
              .where('isCompleted')
              .equals(1)
              .toArray()
              .then((tasks) =>
                tasks.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')),
              ),
          ),
        )
      : of([]),
    { initialValue: [] },
  );

  /**
   * Creates a new task.
   * @param title     Task title.
   * @param priority  Priority level (defaults to 'medium').
   * @param notes     Optional notes.
   * @returns The id of the newly created task.
   */
  async addTask(title: string, priority: TaskPriority = 'medium', notes?: string): Promise<number> {
    const task: Task = {
      title,
      priority,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      ...(notes !== undefined && { notes }),
    };
    const id = await db.tasks.add(task);
    return id as number;
  }

  /**
   * Partially updates an existing task.
   * @param id   Task primary key.
   * @param data Fields to update.
   */
  async updateTask(id: number, data: Partial<Task>): Promise<void> {
    await db.tasks.update(id, data);
  }

  /**
   * Toggles the completion state of a task.
   * Sets `completedAt` when marking as complete.
   * @param id Task primary key.
   */
  async toggleComplete(id: number): Promise<void> {
    const task = await db.tasks.get(id);
    if (!task) return;

    const isCompleted = !task.isCompleted;
    await db.tasks.update(id, {
      isCompleted: isCompleted ? 1 : (0 as any),
      completedAt: isCompleted ? new Date().toISOString() : undefined,
    });
  }

  /**
   * Permanently deletes a task.
   * @param id Task primary key.
   */
  async deleteTask(id: number): Promise<void> {
    await db.tasks.delete(id);
  }

  /**
   * Deletes all completed tasks.
   */
  async clearCompleted(): Promise<void> {
    await db.tasks.where('isCompleted').equals(1).delete();
  }
}
