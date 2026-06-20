export interface LearningSession {
  id?: string;
  topicId: string;
  topicName: string;
  durationMinutes: number;
  rating?: number;
  notes?: string;
  date: string;
  createdAt: string;
}
