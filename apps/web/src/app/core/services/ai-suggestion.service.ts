import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ActivitySummary,
  AiSuggestRequest,
  AiSuggestResponse,
  SCIENCE_THRESHOLDS,
} from '@habits-tracker/shared';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { ActivityService } from './activity.service';
import { SessionService } from './session.service';
import { TrackingService } from './tracking.service';

/**
 * Provides AI-powered (or rule-based fallback) suggestions for
 * habit improvement, scaling, and new-activity timing.
 */
@Injectable({ providedIn: 'root' })
export class AiSuggestionService {
  private readonly http = inject(HttpClient);
  private readonly functions = inject(Functions);
  private readonly activityService = inject(ActivityService);
  private readonly sessionService = inject(SessionService);
  private readonly trackingService = inject(TrackingService);

  /**
   * Fetches a suggestion from the backend AI endpoint.
   * Falls back to rule-based logic when the API is unreachable.
   *
   * @param requestType Context in which the suggestion is requested.
   * @returns An `AiSuggestResponse` with suggestion text and metadata.
   */
  async getSuggestion(
    requestType: 'weekly_review' | 'monthly_review' | 'on_demand',
  ): Promise<AiSuggestResponse> {
    const context = await this.buildContext(requestType);

    try {
      const suggestFn = httpsCallable<AiSuggestRequest, AiSuggestResponse>(
        this.functions,
        'aiSuggest',
      );
      const result = await suggestFn(context);
      return result.data;
    } catch {
      // API unavailable → fall back to deterministic rules
      return this.getRuleBasedSuggestion(context);
    }
  }

  /**
   * Builds the `AiSuggestRequest` payload by aggregating current
   * activity / session / tracking data.
   *
   * @param requestType Context label for the AI prompt.
   */
  async buildContext(
    requestType: 'weekly_review' | 'monthly_review' | 'on_demand',
  ): Promise<AiSuggestRequest> {
    const activities = this.activityService.activities();
    const summaries: ActivitySummary[] = [];
    const allSessions = await this.sessionService.getAllSessions();
    const weekStart = this.trackingService.getWeekStartDate(new Date());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    for (const activity of activities) {
      if (!activity.id) continue;

      const actSessions = allSessions.filter((s) => String(s.activityId) === String(activity.id));
      const thisWeekSessions = actSessions.filter(
        (s) => s.date >= weekStart && s.date <= weekEndStr,
      );
      const actualMinutes = thisWeekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      const completionRate = Math.min(
        100,
        activity.weeklyGoalMinutes > 0
          ? Math.round((actualMinutes / activity.weeklyGoalMinutes) * 100)
          : 0,
      );

      const currentStreak = this.trackingService.calculateStreak(actSessions);

      summaries.push({
        name: activity.name,
        phase: activity.currentPhase,
        weeklyGoalMinutes: activity.weeklyGoalMinutes,
        actualMinutesThisWeek: actualMinutes,
        completionRate,
        currentStreak,
        consecutiveDays: activity.consecutiveDays,
      });
    }

    // Estimate weeks of data from earliest session
    const allDates = allSessions.map((s) => s.date).sort();
    let weeksOfData = 0;
    if (allDates.length > 0) {
      const earliest = new Date(allDates[0] + 'T00:00:00');
      const now = new Date();
      weeksOfData = Math.max(
        1,
        Math.ceil((now.getTime() - earliest.getTime()) / (7 * 24 * 60 * 60 * 1000)),
      );
    }

    // Calculate overall completion rate in-memory
    let totalRate = 0;
    let validActivities = 0;

    for (const activity of activities) {
      if (!activity || activity.weeklyGoalMinutes === 0) continue;
      const actSessions = allSessions.filter((s) => String(s.activityId) === String(activity.id));
      const thisWeekSessions = actSessions.filter(
        (s) => s.date >= weekStart && s.date <= weekEndStr,
      );
      const totalMinutes = thisWeekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const rate = Math.min(100, Math.round((totalMinutes / activity.weeklyGoalMinutes) * 100));

      totalRate += rate;
      validActivities++;
    }

    const overallCompletionRate = validActivities > 0 ? Math.round(totalRate / validActivities) : 0;

    return {
      activities: summaries,
      totalActiveHabits: activities.length,
      weeksOfData,
      overallCompletionRate,
      requestType,
    };
  }

  /**
   * Deterministic, rule-based suggestion engine used as a fallback
   * when the AI backend is unavailable.
   *
   * Rules (from SCIENCE_THRESHOLDS):
   * 1. All activities ≥ 80 % for 3+ weeks → "add new activity"
   * 2. Any at 100 % for 2 weeks          → "increase duration 10-15 %"
   * 3. Any < 80 %                         → "scale back or adjust"
   * 4. Otherwise                          → "keep going"
   */
  getRuleBasedSuggestion(context: AiSuggestRequest): AiSuggestResponse {
    const { activities, weeksOfData, overallCompletionRate } = context;

    // Rule 1 — all ≥ 80 % and enough data
    const allAboveThreshold = activities.every(
      (a) => a.completionRate >= SCIENCE_THRESHOLDS.adherence.safeToAddThreshold,
    );
    if (allAboveThreshold && weeksOfData >= SCIENCE_THRESHOLDS.adherence.weeksBeforeNewHabit) {
      return {
        suggestion:
          "All your habits are consistently above 80%. You're ready to add a new activity — pick something small and start with the Two-Minute Rule.",
        actionType: 'add_activity',
        confidence: 85,
        reasoning:
          `All activities ≥ ${SCIENCE_THRESHOLDS.adherence.safeToAddThreshold}% for ` +
          `${weeksOfData} weeks (threshold: ${SCIENCE_THRESHOLDS.adherence.weeksBeforeNewHabit}).`,
        isAiGenerated: false,
      };
    }

    // Rule 2 — any at 100 % for 2+ weeks
    const perfectActivities = activities.filter((a: ActivitySummary) => a.completionRate >= 100);
    if (
      perfectActivities.length > 0 &&
      weeksOfData >= SCIENCE_THRESHOLDS.progressiveOverload.weeksAt100BeforeIncrease
    ) {
      const names = perfectActivities.map((a: ActivitySummary) => a.name).join(', ');
      return {
        suggestion:
          `Great consistency! Consider increasing the weekly goal for ${names} ` +
          `by ${SCIENCE_THRESHOLDS.progressiveOverload.minIncreasePercent}–` +
          `${SCIENCE_THRESHOLDS.progressiveOverload.maxIncreasePercent}%.`,
        actionType: 'increase_duration',
        confidence: 75,
        reasoning:
          `${perfectActivities.length} activit${perfectActivities.length === 1 ? 'y' : 'ies'} at 100 % ` +
          `for ${weeksOfData} weeks.`,
        isAiGenerated: false,
      };
    }

    // Rule 3 — any below 80 %
    const struggling = activities.filter(
      (a: ActivitySummary) => a.completionRate < SCIENCE_THRESHOLDS.adherence.scaleBackThreshold,
    );
    if (struggling.length > 0) {
      const names = struggling.map((a: ActivitySummary) => a.name).join(', ');
      return {
        suggestion:
          `${names} ${struggling.length === 1 ? 'is' : 'are'} below 80 %. ` +
          'Consider scaling back the weekly goal or adjusting session frequency — ' +
          'consistency matters more than volume.',
        actionType: 'scale_back',
        confidence: 70,
        reasoning:
          `${struggling.length} activit${struggling.length === 1 ? 'y' : 'ies'} below ` +
          `${SCIENCE_THRESHOLDS.adherence.scaleBackThreshold}% adherence.`,
        isAiGenerated: false,
      };
    }

    // Rule 4 — default encouragement
    return {
      suggestion: "You're doing well — keep going! Consistency compounds over time.",
      actionType: 'maintain',
      confidence: 60,
      reasoning: `Overall completion rate: ${overallCompletionRate}%. No immediate action needed.`,
      isAiGenerated: false,
    };
  }
}
