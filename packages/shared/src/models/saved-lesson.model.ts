import { LessonDifficulty, AiLessonContentBlock, AiLessonQuizQuestion } from './ai-lesson.model';

export interface SavedLesson {
  id?: string;
  title: string;
  topicId: string;
  topicName: string;
  topicIcon: string;
  topicColor: string;
  difficulty: LessonDifficulty;
  contentBlocks: AiLessonContentBlock[];
  quiz?: AiLessonQuizQuestion[];
  savedAt: string;
}
