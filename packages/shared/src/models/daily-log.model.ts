export interface DailyLog {
  id?: number;
  date: string;                    // ISO date "YYYY-MM-DD"
  trackedAt: string;               // ISO datetime
  mood?: 1 | 2 | 3 | 4 | 5;
  reflection?: string;
  isTracked: boolean;
}
