/**
 * Science-backed thresholds for habit formation algorithms.
 * Sources: Lally 2010, Clear 2018 (Atomic Habits), Fogg 2019 (Tiny Habits),
 * Ericsson 1993, Deci & Ryan 2000 (SDT), Cepeda 2006 (Spacing Effect)
 */
export declare const SCIENCE_THRESHOLDS: {
  /** Phase transition thresholds (days of consistency) */
  readonly phases: {
    /** Days to transition from Establishing → Forming */
    readonly establishingToForming: 21;
    /** Days to transition from Forming → Established */
    readonly formingToEstablished: 66;
    /** Maximum observed days for habit formation */
    readonly maxFormationDays: 254;
  };
  /** Adherence thresholds */
  readonly adherence: {
    /** Minimum % adherence to consider habit "on track" */
    readonly onTrackThreshold: 80;
    /** % adherence that triggers "safe to add new habit" */
    readonly safeToAddThreshold: 80;
    /** Weeks of sustained adherence before suggesting new habit */
    readonly weeksBeforeNewHabit: 3;
    /** % adherence that triggers scale-back suggestion */
    readonly scaleBackThreshold: 80;
    /** Weeks below threshold before scale-back */
    readonly scaleBackWeeks: 1;
  };
  /** Progressive overload */
  readonly progressiveOverload: {
    /** Weeks at 100% before suggesting increase */
    readonly weeksAt100BeforeIncrease: 2;
    /** Minimum increase percentage */
    readonly minIncreasePercent: 10;
    /** Maximum increase percentage */
    readonly maxIncreasePercent: 15;
    /** Starting habit duration in minutes (Two-Minute Rule) */
    readonly startingDurationMinutes: 2;
  };
  /** Streak management */
  readonly streaks: {
    /** Grace days per week (don't break streak) */
    readonly graceDaysPerWeek: 1;
    /** Recovery window in hours ("Never Miss Twice") */
    readonly recoveryWindowHours: 24;
  };
  /** Session recommendations */
  readonly sessions: {
    /** Minimum session duration in minutes */
    readonly minSessionMinutes: 5;
    /** Recommended minimum sessions per week */
    readonly minSessionsPerWeek: 3;
    /** Maximum recommended deliberate practice per day in hours */
    readonly maxDeliberatePracticeHoursPerDay: 4;
  };
  /** Active habits limits */
  readonly limits: {
    /** Maximum active habits in establishing phase */
    readonly maxEstablishingHabits: 3;
    /** Maximum total active habits recommended */
    readonly maxActiveHabits: 7;
  };
  /** Notification defaults */
  readonly notifications: {
    /** Default notification time */
    readonly defaultTime: '21:00';
    /** Reflection duration target in minutes */
    readonly reflectionDurationMinutes: 5;
  };
  /** Review schedule */
  readonly reviews: {
    /** Weekly review day (0 = Sunday) */
    readonly weeklyReviewDay: 0;
    /** Weekly review notification time */
    readonly weeklyReviewTime: '20:00';
    /** Monthly review day (1st of month) */
    readonly monthlyReviewDay: 1;
    /** Monthly review notification time */
    readonly monthlyReviewTime: '20:00';
  };
};
export type ScienceThresholds = typeof SCIENCE_THRESHOLDS;
//# sourceMappingURL=science-thresholds.d.ts.map
