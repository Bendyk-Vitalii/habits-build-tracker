import { HabitPhase } from '../enums/habit-phase.enum';
import { ActivityCategory } from '../enums/activity-category.enum';

export interface Activity {
  id?: number;
  name: string;
  category: ActivityCategory;
  icon: string;                    // Material icon name
  color: string;                   // Hex color
  weeklyGoalMinutes: number;       // default: 30
  sessionsPerWeek: number;         // default: 3
  currentPhase: HabitPhase;
  phaseStartDate: string;          // ISO date
  consecutiveDays: number;         // Days of consistency for phase tracking
  createdAt: string;               // ISO datetime
  isArchived: 0 | 1;
  goal?: string;
  goalDeadline?: string;           // ISO date
  order: number;
}
