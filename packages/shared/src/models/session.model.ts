import { SessionType } from '../enums/session-type.enum';

export interface Session {
  id?: number;
  activityId: number;
  date: string; // ISO date "YYYY-MM-DD"
  durationMinutes: number;
  type: SessionType;
  pomodorosCompleted?: number;
  note?: string;
  createdAt: string; // ISO datetime
}
