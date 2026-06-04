import Dexie, { type EntityTable } from 'dexie';
import {
  Activity,
  Session,
  DailyLog,
  WeeklyReview,
  MonthlyReview,
  AppSettings,
  Task,
} from '@habits-tracker/shared';

/**
 * Application-wide Dexie (IndexedDB) database.
 *
 * Tables & indexes:
 *   activities  – ++id, category, isArchived, order
 *   sessions    – ++id, activityId, date, [activityId+date]
 *   dailyLogs   – ++id, &date, isTracked
 *   weeklyReviews  – ++id, &weekStartDate
 *   monthlyReviews – ++id, &month
 *   appSettings    – ++id
 *   tasks          – ++id, isCompleted, priority, createdAt
 */
export class AppDatabase extends Dexie {
  activities!: EntityTable<Activity, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  dailyLogs!: EntityTable<DailyLog, 'id'>;
  weeklyReviews!: EntityTable<WeeklyReview, 'id'>;
  monthlyReviews!: EntityTable<MonthlyReview, 'id'>;
  appSettings!: EntityTable<AppSettings, 'id'>;
  tasks!: EntityTable<Task, 'id'>;

  constructor() {
    super('HabitsBuildTracker');
    this.version(1).stores({
      activities: '++id, category, isArchived, order',
      sessions: '++id, activityId, date, [activityId+date]',
      dailyLogs: '++id, &date, isTracked',
      weeklyReviews: '++id, &weekStartDate',
      monthlyReviews: '++id, &month',
      appSettings: '++id',
    });
    this.version(2).stores({
      tasks: '++id, isCompleted, priority, createdAt',
    });
  }
}

/** Singleton database instance used across all services. */
export const db = new AppDatabase();
