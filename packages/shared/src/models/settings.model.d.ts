export interface AppSettings {
    id?: number;
    notificationTime: string;
    notificationEnabled: boolean;
    pomodoroWorkMinutes: number;
    pomodoroBreakMinutes: number;
    pomodoroLongBreakMinutes: number;
    pomodoroSessionsBeforeLongBreak: number;
    theme: 'dark' | 'light' | 'auto';
    weeklyReviewDay: number;
    graceDaysPerWeek: number;
    installedOnHomeScreen: boolean;
}
export declare const DEFAULT_SETTINGS: Omit<AppSettings, 'id'>;
//# sourceMappingURL=settings.model.d.ts.map