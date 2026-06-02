import * as functions from 'firebase-functions/v1';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SCIENCE_THRESHOLDS, AiSuggestRequest, AiSuggestResponse } from '@habits-tracker/shared';
import cors = require('cors');

const corsMiddleware = cors({ origin: true });

// Rate limiting: track calls per client per day
const rateLimitMap = new Map<string, { count: number; date: string }>();
const MAX_CALLS_PER_DAY = 5;

function checkRateLimit(clientId: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  const entry = rateLimitMap.get(clientId);

  if (!entry || entry.date !== today) {
    rateLimitMap.set(clientId, { count: 1, date: today });
    return true;
  }

  if (entry.count >= MAX_CALLS_PER_DAY) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/ai/suggest
 * Proxy for Gemini API — receives user context and returns personalized suggestion.
 * Falls back to rule-based suggestions when API key is missing or quota exceeded.
 */
export const aiSuggest = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { activities, totalActiveHabits, weeksOfData, overallCompletionRate, requestType } = req.body;

      if (!activities || !Array.isArray(activities)) {
        res.status(400).json({ error: 'Invalid request: activities array required' });
        return;
      }

      // Rate limit check (use IP as client ID)
      const clientId = req.ip || 'unknown';
      if (!checkRateLimit(clientId)) {
        // Return rule-based fallback
        const fallback = generateRuleBasedSuggestion(activities, overallCompletionRate, weeksOfData);
        res.status(200).json(fallback);
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // No API key configured — return rule-based fallback
        const fallback = generateRuleBasedSuggestion(activities, overallCompletionRate, weeksOfData);
        res.status(200).json(fallback);
        return;
      }

      // Call Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = buildPrompt(activities, totalActiveHabits, weeksOfData, overallCompletionRate, requestType);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse the AI response
      const suggestion = parseAiResponse(text, activities, overallCompletionRate, weeksOfData);

      res.status(200).json(suggestion);
    } catch (error) {
      console.error('AI suggest error:', error);

      // Fallback to rule-based
      const { activities, overallCompletionRate, weeksOfData } = req.body;
      const fallback = generateRuleBasedSuggestion(activities || [], overallCompletionRate || 0, weeksOfData || 0);
      res.status(200).json(fallback);
    }
  });
});

function buildPrompt(
  activities: any[],
  totalActiveHabits: number,
  weeksOfData: number,
  overallCompletionRate: number,
  requestType: string,
): string {
  const activitySummaries = activities
    .map(
      (a: any) =>
        `- ${a.name} (Phase: ${a.phase}, Goal: ${a.weeklyGoalMinutes}min/week, Actual: ${a.actualMinutesThisWeek}min, ` +
        `Completion: ${a.completionRate}%, Streak: ${a.currentStreak} days, Consistency: ${a.consecutiveDays} days)`,
    )
    .join('\n');

  return `You are a habit formation coach powered by behavioral science research.
Your recommendations must be grounded in these evidence-based thresholds:

SCIENCE-BACKED THRESHOLDS:
- Habit formation takes 18-254 days (average 66 days) [Lally 2010]
- Phase 1 "Establishing": Days 1-21 (building momentum)
- Phase 2 "Forming": Days 22-66 (critical consistency)
- Phase 3 "Established": Day 67+ (automatic, safe to add new)
- Safe to add new habit: ≥${SCIENCE_THRESHOLDS.adherence.safeToAddThreshold}% adherence for ${SCIENCE_THRESHOLDS.adherence.weeksBeforeNewHabit}+ weeks
- Max active establishing habits: ${SCIENCE_THRESHOLDS.limits.maxEstablishingHabits}
- Suggest increase: After ${SCIENCE_THRESHOLDS.progressiveOverload.weeksAt100BeforeIncrease} weeks at 100% completion
- Increase by: ${SCIENCE_THRESHOLDS.progressiveOverload.minIncreasePercent}-${SCIENCE_THRESHOLDS.progressiveOverload.maxIncreasePercent}%
- Scale back when: Below ${SCIENCE_THRESHOLDS.adherence.scaleBackThreshold}% for ${SCIENCE_THRESHOLDS.adherence.scaleBackWeeks} week(s)
- Distributed practice (3+ sessions/week) is better than massed practice
- "Never Miss Twice" rule: one missed day is fine, two consecutive is concerning

USER'S CURRENT STATUS:
Total active habits: ${totalActiveHabits}
Weeks of data: ${weeksOfData}
Overall completion rate: ${overallCompletionRate}%
Review type: ${requestType}

ACTIVITIES:
${activitySummaries}

Please provide a JSON response with these exact fields:
{
  "suggestion": "A concise, encouraging 2-3 sentence recommendation",
  "actionType": "add_activity" | "increase_duration" | "scale_back" | "maintain" | "celebrate",
  "confidence": 0-100,
  "reasoning": "One sentence explaining the science behind your recommendation"
}

Be encouraging, specific, and reference the science. Never suggest adding more than ${SCIENCE_THRESHOLDS.limits.maxEstablishingHabits} new habits at once.`;
}

function parseAiResponse(text: string, activities: any[], overallCompletionRate: number, weeksOfData: number): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        suggestion: parsed.suggestion || 'Keep building your habits consistently!',
        actionType: parsed.actionType || 'maintain',
        confidence: parsed.confidence || 70,
        reasoning: parsed.reasoning || 'Based on your current progress data.',
        isAiGenerated: true,
      };
    }
  } catch {
    // JSON parsing failed
  }

  // If AI response couldn't be parsed, use rule-based
  return generateRuleBasedSuggestion(activities, overallCompletionRate, weeksOfData);
}

function generateRuleBasedSuggestion(activities: any[], overallCompletionRate: number, weeksOfData: number): any {
  const { adherence, progressiveOverload } = SCIENCE_THRESHOLDS;

  // Check if all activities are at ≥80% for 3+ weeks
  const allOnTrack = activities.every((a: any) => a.completionRate >= adherence.onTrackThreshold);
  const hasEnoughData = weeksOfData >= adherence.weeksBeforeNewHabit;

  // Check if any activity is at 100% for 2+ weeks
  const anyAt100 = activities.some(
    (a: any) => a.completionRate >= 100 && a.consecutiveDays >= progressiveOverload.weeksAt100BeforeIncrease * 7,
  );

  // Check if any activity is below threshold
  const anyBelowThreshold = activities.some((a: any) => a.completionRate < adherence.scaleBackThreshold);

  if (allOnTrack && hasEnoughData) {
    return {
      suggestion:
        'Outstanding consistency! All your activities are above 80% completion for 3+ weeks. ' +
        "Based on habit formation research, you're ready to consider adding a new skill-building activity. " +
        'Start small — remember the Two-Minute Rule.',
      actionType: 'add_activity',
      confidence: 85,
      reasoning: 'Behavioral research shows habits are safe to stack after 3-4 weeks of consistent ≥80% adherence.',
      isAiGenerated: false,
    };
  }

  if (anyAt100) {
    const perfectActivity = activities.find(
      (a: any) => a.completionRate >= 100 && a.consecutiveDays >= progressiveOverload.weeksAt100BeforeIncrease * 7,
    );
    return {
      suggestion:
        `Great work on "${perfectActivity?.name}"! You've hit 100% completion for 2+ weeks. ` +
        `Consider increasing your weekly goal by 10-15% to maintain the challenge and continue growing. ` +
        `Progressive overload keeps habits engaging.`,
      actionType: 'increase_duration',
      confidence: 80,
      reasoning: 'Progressive overload principle: increase challenge by 10-15% after sustained mastery.',
      isAiGenerated: false,
    };
  }

  if (anyBelowThreshold) {
    const strugglingActivity = activities.find((a: any) => a.completionRate < adherence.scaleBackThreshold);
    return {
      suggestion:
        `"${strugglingActivity?.name}" is below 80% completion this week. ` +
        `This is completely normal — research shows missing occasionally doesn't derail habit formation. ` +
        `Consider reducing the weekly goal or splitting it into shorter, more frequent sessions.`,
      actionType: 'scale_back',
      confidence: 75,
      reasoning:
        "Lally 2010: Missing a single day does not significantly affect habit formation. Adjust, don't abandon.",
      isAiGenerated: false,
    };
  }

  return {
    suggestion:
      "You're on track! Keep maintaining your current pace. " +
      'Consistency is more important than perfection — your habits are forming well. ' +
      `Overall completion rate: ${overallCompletionRate}%.`,
    actionType: 'maintain',
    confidence: 70,
    reasoning: 'Steady consistency is the strongest predictor of long-term habit formation (Lally 2010).',
    isAiGenerated: false,
  };
}
