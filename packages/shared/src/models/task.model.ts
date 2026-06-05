export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id?: number;
  title: string;
  notes?: string;
  isCompleted: boolean;
  priority: TaskPriority;
  createdAt: string; // ISO datetime
  completedAt?: string; // ISO datetime
}
