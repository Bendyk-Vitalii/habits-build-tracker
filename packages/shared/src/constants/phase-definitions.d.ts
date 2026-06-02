import { HabitPhase } from '../enums/habit-phase.enum';
export interface PhaseDefinition {
    phase: HabitPhase;
    label: string;
    emoji: string;
    description: string;
    color: string;
    minDays: number;
    maxDays: number | null;
}
export declare const PHASE_DEFINITIONS: PhaseDefinition[];
export declare function getPhaseDefinition(phase: HabitPhase): PhaseDefinition;
export declare function getPhaseForDays(consecutiveDays: number): HabitPhase;
export declare function getPhaseProgress(phase: HabitPhase, consecutiveDays: number): number;
//# sourceMappingURL=phase-definitions.d.ts.map