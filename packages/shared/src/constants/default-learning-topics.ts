import { LearningTopic } from '../models/learning-topic.model';

export const DEFAULT_LEARNING_TOPICS: Omit<LearningTopic, 'id' | 'createdAt'>[] = [
  {
    name: 'English',
    icon: 'translate',
    color: '#42a5f5',
    order: 0,
  },
  {
    name: 'MongoDB',
    icon: 'database',
    color: '#66bb6a',
    order: 1,
  },
  {
    name: 'Backend Development',
    icon: 'dns',
    color: '#ffa726',
    order: 2,
  },
  {
    name: 'Angular',
    icon: 'code',
    color: '#ef5350',
    order: 3,
  },
  {
    name: 'Frontend',
    icon: 'web',
    color: '#ab47bc',
    order: 4,
  },
  {
    name: 'AWS',
    icon: 'cloud',
    color: '#ff7043',
    order: 5,
  },
  {
    name: 'AI in Development',
    icon: 'smart_toy',
    color: '#26c6da',
    order: 6,
  },
];
