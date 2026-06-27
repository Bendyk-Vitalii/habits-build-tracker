export type LessonDifficulty = 'intermediate' | 'advanced' | 'expert';

export type ContentBlockType = 'text' | 'code' | 'heading' | 'exercise' | 'flashcard' | 'matching';

export type ExerciseType = 'fill-blank' | 'translate' | 'reorder';

export interface ExerciseBlank {
  /** The prompt with a blank, e.g. "The ___ barks loudly." */
  prompt: string;
  /** The correct answer, e.g. "dog" */
  answer: string;
  /** Optional hint */
  hint?: string;
}

export interface FlashcardItem {
  /** Term, word, or concept (front of card) */
  front: string;
  /** Definition, translation, or explanation (back of card) */
  back: string;
}

export interface MatchPair {
  /** Left column item */
  left: string;
  /** Right column item (correct match) */
  right: string;
}

export interface AiLessonRequest {
  topicName: string;
  durationMinutes: number;
  difficulty?: LessonDifficulty;
}

export interface AiLessonContentBlock {
  type: ContentBlockType;
  value: string;
  /** Type of exercise (only for 'exercise' blocks) */
  exerciseType?: ExerciseType;
  /** Fill-in-the-blank items (only for 'exercise' blocks) */
  blanks?: ExerciseBlank[];
  /** Flashcard items (only for 'flashcard' blocks) */
  flashcards?: FlashcardItem[];
  /** Matching pair items (only for 'matching' blocks) */
  matchPairs?: MatchPair[];
}

export interface AiLessonQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface AiLessonResponse {
  title: string;
  contentBlocks: AiLessonContentBlock[];
  quiz?: AiLessonQuizQuestion[];
  difficulty?: LessonDifficulty;
}
