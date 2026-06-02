export interface WeeklyReview {
  id?: number;
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  totalSessions: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  completionRate: number;
  highlights?: string;
  improvements?: string;
  aiSuggestion?: string;
  createdAt: string;
  isCompleted?: boolean;
}
export interface MonthlyReview {
  id?: number;
  month: string;
  totalMinutes: number;
  totalSessions: number;
  averageWeeklyCompletion: number;
  streakData: Record<number, number>;
  phaseTransitions: string[];
  notes?: string;
  aiSuggestion?: string;
  createdAt: string;
  isCompleted?: boolean;
}
//# sourceMappingURL=review.model.d.ts.map
