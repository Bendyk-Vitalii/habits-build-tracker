import { HabitPhase } from '../enums/habit-phase.enum';
import { ActivityCategory } from '../enums/activity-category.enum';
export interface Activity {
  id?: number;
  name: string;
  category: ActivityCategory;
  icon: string;
  color: string;
  weeklyGoalMinutes: number;
  sessionsPerWeek: number;
  currentPhase: HabitPhase;
  phaseStartDate: string;
  consecutiveDays: number;
  createdAt: string;
  isArchived: boolean;
  goal?: string;
  goalDeadline?: string;
  order: number;
}
//# sourceMappingURL=activity.model.d.ts.map
