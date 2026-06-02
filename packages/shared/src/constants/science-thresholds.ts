/**
 * Science-backed thresholds for habit formation algorithms.
 * Sources: Lally 2010, Clear 2018 (Atomic Habits), Fogg 2019 (Tiny Habits),
 * Ericsson 1993, Deci & Ryan 2000 (SDT), Cepeda 2006 (Spacing Effect)
 */
export const SCIENCE_THRESHOLDS = {
  /** Phase transition thresholds (days of consistency) */
  phases: {
    /** Days to transition from Establishing → Forming */
    establishingToForming: 21,
    /** Days to transition from Forming → Established */
    formingToEstablished: 66,
    /** Maximum observed days for habit formation */
    maxFormationDays: 254,
  },

  /** Adherence thresholds */
  adherence: {
    /** Minimum % adherence to consider habit "on track" */
    onTrackThreshold: 80,
    /** % adherence that triggers "safe to add new habit" */
    safeToAddThreshold: 80,
    /** Weeks of sustained adherence before suggesting new habit */
    weeksBeforeNewHabit: 3,
    /** % adherence that triggers scale-back suggestion */
    scaleBackThreshold: 80,
    /** Weeks below threshold before scale-back */
    scaleBackWeeks: 1,
  },

  /** Progressive overload */
  progressiveOverload: {
    /** Weeks at 100% before suggesting increase */
    weeksAt100BeforeIncrease: 2,
    /** Minimum increase percentage */
    minIncreasePercent: 10,
    /** Maximum increase percentage */
    maxIncreasePercent: 15,
    /** Starting habit duration in minutes (Two-Minute Rule) */
    startingDurationMinutes: 2,
  },

  /** Streak management */
  streaks: {
    /** Grace days per week (don't break streak) */
    graceDaysPerWeek: 1,
    /** Recovery window in hours ("Never Miss Twice") */
    recoveryWindowHours: 24,
  },

  /** Session recommendations */
  sessions: {
    /** Minimum session duration in minutes */
    minSessionMinutes: 5,
    /** Recommended minimum sessions per week */
    minSessionsPerWeek: 3,
    /** Maximum recommended deliberate practice per day in hours */
    maxDeliberatePracticeHoursPerDay: 4,
  },

  /** Active habits limits */
  limits: {
    /** Maximum active habits in establishing phase */
    maxEstablishingHabits: 3,
    /** Maximum total active habits recommended */
    maxActiveHabits: 7,
  },

  /** Notification defaults */
  notifications: {
    /** Default notification time */
    defaultTime: '21:00',
    /** Reflection duration target in minutes */
    reflectionDurationMinutes: 5,
  },

  /** Review schedule */
  reviews: {
    /** Weekly review day (0 = Sunday) */
    weeklyReviewDay: 0,
    /** Weekly review notification time */
    weeklyReviewTime: '20:00',
    /** Monthly review day (1st of month) */
    monthlyReviewDay: 1,
    /** Monthly review notification time */
    monthlyReviewTime: '20:00',
  },
} as const;

export type ScienceThresholds = typeof SCIENCE_THRESHOLDS;
