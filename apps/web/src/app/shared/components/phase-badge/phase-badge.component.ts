import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { HabitPhase, getPhaseDefinition, getPhaseProgress } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-phase-badge',
  standalone: true,
  templateUrl: './phase-badge.component.html',
  styleUrl: './phase-badge.component.scss',
})
export class PhaseBadgeComponent {
  readonly phase = input.required<HabitPhase>();
  readonly consecutiveDays = input(0);
  readonly showProgress = input(false);

  readonly definition = computed(() => getPhaseDefinition(this.phase()));
  readonly progress = computed(() => getPhaseProgress(this.phase(), this.consecutiveDays()));
  readonly phaseClass = computed(() => `phase-badge--${this.phase()}`);
}
