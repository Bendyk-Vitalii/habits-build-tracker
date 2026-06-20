export type LessonDifficulty = 'intermediate' | 'advanced' | 'expert';

export interface AiLessonRequest {
  topicName: string;
  durationMinutes: number;
  difficulty?: LessonDifficulty;
}

export interface AiLessonContentBlock {
  type: 'text' | 'code' | 'heading';
  value: string;
}

export interface AiLessonQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface AiLessonResponse {
  title: string;
  contentBlocks: AiLessonContentBlock[];
  quiz?: AiLessonQuizQuestion[]; // Optional as requested by the user
  difficulty?: LessonDifficulty;
}
