export interface AppSettings {
  id?: number;
  notificationTime: string;       // "HH:MM", default "21:00"
  notificationEnabled: boolean;
  pomodoroWorkMinutes: number;    // default: 25
  pomodoroBreakMinutes: number;   // default: 5
  pomodoroLongBreakMinutes: number; // default: 15
  pomodoroSessionsBeforeLongBreak: number; // default: 4
  theme: 'dark' | 'light' | 'auto';
  weeklyReviewDay: number;        // 0=Sunday
  graceDaysPerWeek: number;       // default: 1
  installedOnHomeScreen: boolean;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id'> = {
  notificationTime: '21:00',
  notificationEnabled: true,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  pomodoroSessionsBeforeLongBreak: 4,
  theme: 'dark',
  weeklyReviewDay: 0,
  graceDaysPerWeek: 1,
  installedOnHomeScreen: false,
};
