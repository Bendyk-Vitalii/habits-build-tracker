import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { Activity } from '@habits-tracker/shared';
import { PhaseBadgeComponent } from '../../../../shared/components/phase-badge/phase-badge.component';
import { StreakCounterComponent } from '../../../../shared/components/streak-counter/streak-counter.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-activity-card',
  standalone: true,
  imports: [RouterLink, PhaseBadgeComponent, StreakCounterComponent],
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.scss',
})
export class ActivityCardComponent {
  @Input({ required: true }) activity!: Activity;
  @Input() streak = 0;
  @Input() weeklyMinutes = 0;
  @Input() weeklyGoal = 0;

  get progressPercent(): number {
    if (!this.weeklyGoal) return 0;
    return Math.min(100, Math.max(0, (this.weeklyMinutes / this.weeklyGoal) * 100));
  }
}
