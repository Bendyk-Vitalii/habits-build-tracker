import { HabitPhase } from '../enums/habit-phase.enum';
import { SCIENCE_THRESHOLDS } from './science-thresholds';

export interface PhaseDefinition {
  phase: HabitPhase;
  label: string;
  emoji: string;
  description: string;
  color: string;
  minDays: number;
  maxDays: number | null; // null = no upper limit
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    phase: HabitPhase.Establishing,
    label: 'Establishing',
    emoji: '🌱',
    description: 'Building momentum — focus on consistency, not perfection',
    color: '#66bb6a',
    minDays: 0,
    maxDays: SCIENCE_THRESHOLDS.phases.establishingToForming,
  },
  {
    phase: HabitPhase.Forming,
    label: 'Forming',
    emoji: '🌿',
    description: 'Critical consistency period — the habit is taking root',
    color: '#42a5f5',
    minDays: SCIENCE_THRESHOLDS.phases.establishingToForming,
    maxDays: SCIENCE_THRESHOLDS.phases.formingToEstablished,
  },
  {
    phase: HabitPhase.Established,
    label: 'Established',
    emoji: '🌳',
    description: 'Automatic — safe to add new challenges',
    color: '#ab47bc',
    minDays: SCIENCE_THRESHOLDS.phases.formingToEstablished,
    maxDays: null,
  },
];

export function getPhaseDefinition(phase: HabitPhase): PhaseDefinition {
  return PHASE_DEFINITIONS.find((p) => p.phase === phase)!;
}

export function getPhaseForDays(consecutiveDays: number): HabitPhase {
  if (consecutiveDays >= SCIENCE_THRESHOLDS.phases.formingToEstablished) {
    return HabitPhase.Established;
  }
  if (consecutiveDays >= SCIENCE_THRESHOLDS.phases.establishingToForming) {
    return HabitPhase.Forming;
  }
  return HabitPhase.Establishing;
}

export function getPhaseProgress(phase: HabitPhase, consecutiveDays: number): number {
  const def = getPhaseDefinition(phase);
  if (def.maxDays === null) return 100;
  const range = def.maxDays - def.minDays;
  const progress = consecutiveDays - def.minDays;
  return Math.min(100, Math.round((progress / range) * 100));
}
