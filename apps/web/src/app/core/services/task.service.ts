import { Injectable, Signal, PLATFORM_ID, inject, signal, effect } from '@angular/core';
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
  onSnapshot,
  writeBatch,
} from '@angular/fire/firestore';
import { Task, TaskPriority } from '@habits-tracker/shared';
import { userCollection, userDoc, docWithId } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages routine tasks (to-do items) stored in Firestore.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  /** Priority sort order: high → medium → low */
  private static readonly PRIORITY_ORDER: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  private _tasks = signal<Task[]>([]);
  private _completedTasks = signal<Task[]>([]);
  private unsubPending: (() => void) | null = null;
  private unsubCompleted: (() => void) | null = null;

  /** Reactive signal of all pending (non-completed) tasks. */
  readonly tasks: Signal<Task[]> = this._tasks.asReadonly();

  /** Reactive signal of completed tasks, most recent first. */
  readonly completedTasks: Signal<Task[]> = this._completedTasks.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const uid = this.authService.uid();
        if (!uid) return;

        this.unsubPending?.();
        this.unsubCompleted?.();

        const col = userCollection<Task>(this.firestore, uid, 'tasks');

        // Pending tasks
        const pendingQ = query(col, where('isCompleted', '==', false));
        this.unsubPending = onSnapshot(pendingQ, (snapshot) => {
          const items = snapshot.docs
            .map((d) => docWithId(d))
            .sort((a, b) => {
              const pDiff =
                TaskService.PRIORITY_ORDER[a.priority] - TaskService.PRIORITY_ORDER[b.priority];
              if (pDiff !== 0) return pDiff;
              return a.createdAt.localeCompare(b.createdAt);
            });
          this._tasks.set(items);
        });

        // Completed tasks
        const completedQ = query(col, where('isCompleted', '==', true));
        this.unsubCompleted = onSnapshot(completedQ, (snapshot) => {
          const items = snapshot.docs
            .map((d) => docWithId(d))
            .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
          this._completedTasks.set(items);
        });
      });
    }
  }

  /**
   * Creates a new task.
   */
  async addTask(title: string, priority: TaskPriority = 'medium', notes?: string): Promise<string> {
    const uid = this.authService.uid();
    if (!uid) throw new Error('Not authenticated');

    const data: Record<string, unknown> = {
      title,
      priority,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    if (notes !== undefined) data['notes'] = notes;

    const col = userCollection(this.firestore, uid, 'tasks');
    const docRef = await addDoc(col, data);
    return docRef.id;
  }

  /**
   * Partially updates an existing task.
   */
  async updateTask(id: string | number, data: Partial<Task>): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc<Task>(this.firestore, uid, 'tasks', String(id));
    await updateDoc(docRef, data as Record<string, unknown>);
  }

  /**
   * Toggles the completion state of a task.
   */
  async toggleComplete(id: string | number): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const docRef = userDoc<Task>(this.firestore, uid, 'tasks', String(id));
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return;

    const task = snapshot.data();
    const isCompleted = !task.isCompleted;
    await updateDoc(docRef, {
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
    });
  }

  /**
   * Permanently deletes a task.
   */
  async deleteTask(id: string | number): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;
    const docRef = userDoc<Task>(this.firestore, uid, 'tasks', String(id));
    await deleteDoc(docRef);
  }

  /**
   * Deletes all completed tasks.
   */
  async clearCompleted(): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    const col = userCollection<Task>(this.firestore, uid, 'tasks');
    const q = query(col, where('isCompleted', '==', true));
    const snapshot = await getDocs(q);

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
