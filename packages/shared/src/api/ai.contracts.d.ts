import { HabitPhase } from '../enums/habit-phase.enum';
export interface ActivitySummary {
    name: string;
    phase: HabitPhase;
    weeklyGoalMinutes: number;
    actualMinutesThisWeek: number;
    completionRate: number;
    currentStreak: number;
    consecutiveDays: number;
}
export interface AiSuggestRequest {
    activities: ActivitySummary[];
    totalActiveHabits: number;
    weeksOfData: number;
    overallCompletionRate: number;
    requestType: 'weekly_review' | 'monthly_review' | 'on_demand';
}
export interface AiSuggestResponse {
    suggestion: string;
    actionType: 'add_activity' | 'increase_duration' | 'scale_back' | 'maintain' | 'celebrate';
    confidence: number;
    reasoning: string;
    isAiGenerated: boolean;
}
//# sourceMappingURL=ai.contracts.d.ts.map