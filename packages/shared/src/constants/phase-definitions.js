'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PHASE_DEFINITIONS = void 0;
exports.getPhaseDefinition = getPhaseDefinition;
exports.getPhaseForDays = getPhaseForDays;
exports.getPhaseProgress = getPhaseProgress;
const habit_phase_enum_1 = require('../enums/habit-phase.enum');
const science_thresholds_1 = require('./science-thresholds');
exports.PHASE_DEFINITIONS = [
  {
    phase: habit_phase_enum_1.HabitPhase.Establishing,
    label: 'Establishing',
    emoji: '🌱',
    description: 'Building momentum — focus on consistency, not perfection',
    color: '#66bb6a',
    minDays: 0,
    maxDays: science_thresholds_1.SCIENCE_THRESHOLDS.phases.establishingToForming,
  },
  {
    phase: habit_phase_enum_1.HabitPhase.Forming,
    label: 'Forming',
    emoji: '🌿',
    description: 'Critical consistency period — the habit is taking root',
    color: '#42a5f5',
    minDays: science_thresholds_1.SCIENCE_THRESHOLDS.phases.establishingToForming,
    maxDays: science_thresholds_1.SCIENCE_THRESHOLDS.phases.formingToEstablished,
  },
  {
    phase: habit_phase_enum_1.HabitPhase.Established,
    label: 'Established',
    emoji: '🌳',
    description: 'Automatic — safe to add new challenges',
    color: '#ab47bc',
    minDays: science_thresholds_1.SCIENCE_THRESHOLDS.phases.formingToEstablished,
    maxDays: null,
  },
];
function getPhaseDefinition(phase) {
  return exports.PHASE_DEFINITIONS.find((p) => p.phase === phase);
}
function getPhaseForDays(consecutiveDays) {
  if (consecutiveDays >= science_thresholds_1.SCIENCE_THRESHOLDS.phases.formingToEstablished) {
    return habit_phase_enum_1.HabitPhase.Established;
  }
  if (consecutiveDays >= science_thresholds_1.SCIENCE_THRESHOLDS.phases.establishingToForming) {
    return habit_phase_enum_1.HabitPhase.Forming;
  }
  return habit_phase_enum_1.HabitPhase.Establishing;
}
function getPhaseProgress(phase, consecutiveDays) {
  const def = getPhaseDefinition(phase);
  if (def.maxDays === null) return 100;
  const range = def.maxDays - def.minDays;
  const progress = consecutiveDays - def.minDays;
  return Math.min(100, Math.round((progress / range) * 100));
}
//# sourceMappingURL=phase-definitions.js.map
