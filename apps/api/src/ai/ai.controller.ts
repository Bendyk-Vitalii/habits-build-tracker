import * as functions from 'firebase-functions/v1';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SCIENCE_THRESHOLDS,
  AiSuggestRequest,
  AiSuggestResponse,
  AiLessonRequest,
  AiLessonResponse,
  ActivitySummary,
} from '@habits-tracker/shared';
// CORS is handled automatically by onCall

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
export const aiSuggest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    const { activities, totalActiveHabits, weeksOfData, overallCompletionRate, requestType } = data as AiSuggestRequest;

    if (!activities || !Array.isArray(activities)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request: activities array required');
    }

    // Rate limit check
    const clientId = context.auth.uid;
    if (!checkRateLimit(clientId)) {
      return generateRuleBasedSuggestion(activities, overallCompletionRate, weeksOfData);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return generateRuleBasedSuggestion(activities, overallCompletionRate, weeksOfData);
    }

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = buildPrompt(activities, totalActiveHabits, weeksOfData, overallCompletionRate, requestType);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return parseAiResponse(text, activities, overallCompletionRate, weeksOfData);
  } catch (error) {
    console.error('AI suggest error:', error);
    const { activities, overallCompletionRate, weeksOfData } = data as AiSuggestRequest;
    return generateRuleBasedSuggestion(activities || [], overallCompletionRate || 0, weeksOfData || 0);
  }
});

function buildPrompt(
  activities: ActivitySummary[],
  totalActiveHabits: number,
  weeksOfData: number,
  overallCompletionRate: number,
  requestType: string,
): string {
  const activitySummaries = activities
    .map(
      (a: ActivitySummary) =>
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

function parseAiResponse(
  text: string,
  activities: ActivitySummary[],
  overallCompletionRate: number,
  weeksOfData: number,
): AiSuggestResponse {
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

function generateRuleBasedSuggestion(
  activities: ActivitySummary[],
  overallCompletionRate: number,
  weeksOfData: number,
): AiSuggestResponse {
  const { adherence, progressiveOverload } = SCIENCE_THRESHOLDS;

  // Check if all activities are at ≥80% for 3+ weeks
  const allOnTrack = activities.every((a: ActivitySummary) => a.completionRate >= adherence.onTrackThreshold);
  const hasEnoughData = weeksOfData >= adherence.weeksBeforeNewHabit;

  // Check if any activity is at 100% for 2+ weeks
  const anyAt100 = activities.some(
    (a: ActivitySummary) =>
      a.completionRate >= 100 && a.consecutiveDays >= progressiveOverload.weeksAt100BeforeIncrease * 7,
  );

  // Check if any activity is below threshold
  const anyBelowThreshold = activities.some((a: ActivitySummary) => a.completionRate < adherence.scaleBackThreshold);

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
      (a: ActivitySummary) =>
        a.completionRate >= 100 && a.consecutiveDays >= progressiveOverload.weeksAt100BeforeIncrease * 7,
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
    const strugglingActivity = activities.find((a: ActivitySummary) => a.completionRate < adherence.scaleBackThreshold);
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

/**
 * POST /api/ai/generate-lesson
 * Generates an interactive, practical lesson on a given topic with exercises, flashcards, and quizzes.
 */
export const aiGenerateLesson = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    const { topicName, durationMinutes, difficulty } = data as AiLessonRequest;

    if (!topicName || typeof durationMinutes !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid request: topicName and durationMinutes required',
      );
    }

    const level = difficulty || 'intermediate';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('unavailable', 'AI service not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const difficultyInstructions: Record<string, string> = {
      intermediate:
        'Focus on practical, real-world applications and patterns. Skip basic definitions but provide enough context for someone with foundational knowledge. Include industry best practices and common pitfalls.',
      advanced:
        'Target experienced practitioners. Cover advanced patterns, optimization techniques, edge cases, and architectural decisions. Include performance considerations, trade-offs, and lesser-known features. Do NOT explain basic concepts — assume strong foundational knowledge.',
      expert:
        'Target senior/staff-level professionals. Dive into internals, cutting-edge techniques, research-backed approaches, and system design considerations. Cover topics like performance tuning at scale, novel patterns, contributions to the field, and cross-domain insights. Assume mastery of the topic and focus on pushing boundaries.',
    };

    const prompt = `You are an expert tutor creating an INTERACTIVE learning lesson about "${topicName}".
The lesson should take about ${durationMinutes} minutes of ACTIVE LEARNING (not just reading).

DIFFICULTY LEVEL: ${level.toUpperCase()}
${difficultyInstructions[level] || difficultyInstructions['intermediate']}

CRITICAL INSTRUCTION — DETECT THE TOPIC CATEGORY:
First, determine if "${topicName}" is:
A) A LANGUAGE topic (English, Spanish, French, German, Japanese, any human language, vocabulary, grammar, etc.)
B) A TECHNICAL/PROGRAMMING topic (coding, databases, frameworks, DevOps, etc.)
C) A GENERAL KNOWLEDGE topic (science, history, math, music theory, etc.)

FOR LANGUAGE TOPICS (Category A):
- Create PRACTICAL, hands-on language exercises — NOT theoretical reading about the language.
- Include vocabulary flashcards with the word and its translation/definition.
- Include fill-in-the-blank grammar exercises.
- Include sentence translation exercises.
- Include word-matching exercises (word ↔ meaning).
- Minimal reading paragraphs — focus on PRACTICE.
- Content ratio: 60% interactive exercises, 20% brief explanations, 20% quiz.

FOR TECHNICAL TOPICS (Category B):
- Mix explanatory content with hands-on code exercises.
- Include code-completion exercises (fill in the blank in code snippets).
- Include concept-matching exercises (term ↔ definition).
- Content ratio: 40% interactive exercises, 40% explanatory text with code, 20% quiz.

FOR GENERAL TOPICS (Category C):
- Mix engaging explanations with knowledge-testing exercises.
- Include concept flashcards and matching exercises.
- Content ratio: 30% interactive exercises, 50% explanatory text, 20% quiz.

You MUST return a raw JSON object (no markdown, no backticks) matching this schema:
{
  "title": "A catchy, specific title for the lesson",
  "contentBlocks": [
    { "type": "heading", "value": "Section heading" },
    { "type": "text", "value": "A brief paragraph explaining a concept. Keep these SHORT." },
    { "type": "code", "value": "code snippet (only for technical topics)" },
    {
      "type": "exercise",
      "value": "Exercise section title",
      "exerciseType": "fill-blank",
      "blanks": [
        { "prompt": "The sentence with a ___ to fill in.", "answer": "correct word", "hint": "Optional hint" },
        { "prompt": "Another ___ exercise.", "answer": "answer", "hint": "hint" }
      ]
    },
    {
      "type": "exercise",
      "value": "Translation Practice",
      "exerciseType": "translate",
      "blanks": [
        { "prompt": "Translate: 'Hello, how are you?'", "answer": "Hola, ¿cómo estás?", "hint": "Spanish greeting" }
      ]
    },
    {
      "type": "flashcard",
      "value": "Key Vocabulary",
      "flashcards": [
        { "front": "Term or word", "back": "Definition or translation" },
        { "front": "Another term", "back": "Another definition" }
      ]
    },
    {
      "type": "matching",
      "value": "Match the Pairs",
      "matchPairs": [
        { "left": "Term A", "right": "Definition A" },
        { "left": "Term B", "right": "Definition B" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "A question testing understanding?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    }
  ],
  "difficulty": "${level}"
}

RULES:
1. Include AT LEAST 2 interactive blocks (exercise, flashcard, or matching).
2. For language topics: include AT LEAST 1 flashcard block (5-8 cards), 1 fill-blank exercise (4-6 blanks), and 1 matching block (4-6 pairs).
3. For technical topics: include AT LEAST 1 exercise block and 1 matching or flashcard block.
4. Include exactly 3 quiz questions.
5. Keep "text" blocks SHORT (2-3 sentences max) — this is active learning, not a textbook.
6. Each flashcard block should have 5-8 flashcards.
7. Each matching block should have 4-6 pairs.
8. Each exercise block should have 3-6 blanks.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    text = text
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    return JSON.parse(text) as AiLessonResponse;
  } catch (error) {
    console.error('AI generate lesson error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate lesson');
  }
});
