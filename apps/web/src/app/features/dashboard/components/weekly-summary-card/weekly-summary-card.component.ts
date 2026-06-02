import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '@habits-tracker/shared';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';

@Component({
  selector: 'ht-weekly-summary-card',
  standalone: true,
  imports: [CommonModule, DurationPipe],
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
