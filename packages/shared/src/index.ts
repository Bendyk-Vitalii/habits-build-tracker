// Enums
export { HabitPhase } from './enums/habit-phase.enum';
export { SessionType } from './enums/session-type.enum';
export { ActivityCategory } from './enums/activity-category.enum';

// Models
export type { Activity } from './models/activity.model';
export type { Session } from './models/session.model';
export type { DailyLog } from './models/daily-log.model';
export type { WeeklyReview, MonthlyReview } from './models/review.model';
export type { AppSettings } from './models/settings.model';
export { DEFAULT_SETTINGS } from './models/settings.model';
export type { Task, TaskPriority } from './models/task.model';
export type { LearningTopic } from './models/learning-topic.model';
export type { LearningSession } from './models/learning-session.model';
export type {
  AiLessonRequest,
  AiLessonResponse,
  AiLessonContentBlock,
  AiLessonQuizQuestion,
  LessonDifficulty,
} from './models/ai-lesson.model';
export type { SavedLesson } from './models/saved-lesson.model';

// Constants
export { SCIENCE_THRESHOLDS } from './constants/science-thresholds';
export type { ScienceThresholds } from './constants/science-thresholds';
export { DEFAULT_ACTIVITIES } from './constants/default-activities';
export { DEFAULT_LEARNING_TOPICS } from './constants/default-learning-topics';
export type { PhaseDefinition } from './constants/phase-definitions';
export {
  PHASE_DEFINITIONS,
  getPhaseDefinition,
  getPhaseForDays,
  getPhaseProgress,
} from './constants/phase-definitions';

// API Contracts
export type {
  PushSubscribeRequest,
  PushUnsubscribeRequest,
  PushTrackedRequest,
  VapidKeyResponse,
} from './api/push.contracts';
export type { ActivitySummary, AiSuggestRequest, AiSuggestResponse } from './api/ai.contracts';
