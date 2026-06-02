import { SessionType } from '../enums/session-type.enum';
export interface Session {
  id?: number;
  activityId: number;
  date: string;
  durationMinutes: number;
  type: SessionType;
  pomodorosCompleted?: number;
  note?: string;
  createdAt: string;
}
//# sourceMappingURL=session.model.d.ts.map
