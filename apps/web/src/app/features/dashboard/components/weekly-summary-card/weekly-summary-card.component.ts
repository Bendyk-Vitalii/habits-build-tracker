import { Component, Input, computed, ChangeDetectionStrategy } from '@angular/core';

import { Activity } from '@habits-tracker/shared';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-weekly-summary-card',
  standalone: true,
  imports: [DurationPipe],
  templateUrl: './weekly-summary-card.component.html',
  styleUrl: './weekly-summary-card.component.scss',
})
export class WeeklySummaryCardComponent {
  @Input({ required: true }) activities!: Activity[];
  @Input({ required: true }) completionRate!: number;

  totalGoalMinutes = computed(() => {
    return this.activities.reduce((sum, a) => sum + (a.weeklyGoalMinutes || 0), 0);
  });
}
