export interface WeeklyReview {
  id?: number;
  weekStartDate: string;           // ISO date of Monday
  weekEndDate: string;             // ISO date of Sunday
  totalMinutes: number;
  totalSessions: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  completionRate: number;          // 0-100
  highlights?: string;
  improvements?: string;
  aiSuggestion?: string;
  createdAt: string;               // ISO datetime
  isCompleted?: boolean;
}

export interface MonthlyReview {
  id?: number;
  month: string;                   // "YYYY-MM"
  totalMinutes: number;
  totalSessions: number;
  averageWeeklyCompletion: number; // 0-100
  streakData: Record<number, number>; // activityId → longest streak
  phaseTransitions: string[];
  notes?: string;
  aiSuggestion?: string;
  createdAt: string;               // ISO datetime
  isCompleted?: boolean;
}
