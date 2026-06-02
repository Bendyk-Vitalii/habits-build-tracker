import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '@habits-tracker/shared';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';

interface GoalActivity extends Activity {
  progressPercent: number;
}

@Component({
  selector: 'ht-goals-overview',
  standalone: true,
  imports: [CommonModule, RelativeDatePipe],
  templateUrl: './goals-overview.component.html',
  styleUrl: './goals-overview.component.scss',
})
export class GoalsOverviewComponent {
  @Input({ required: true }) activities!: Activity[];

  goals = computed<GoalActivity[]>(() => {
    return this.activities
      .filter((a) => a.goal && a.goalDeadline)
      .map((a) => {
        // Calculate progress based on phaseStartDate and goalDeadline
        let progress = 0;
        if (a.phaseStartDate && a.goalDeadline) {
          const start = new Date(a.phaseStartDate).getTime();
          const end = new Date(a.goalDeadline).getTime();
          const now = new Date().getTime();

          if (now >= end) {
            progress = 100;
          } else if (now <= start) {
            progress = 0;
          } else {
            progress = ((now - start) / (end - start)) * 100;
          }
        }

        return {
          ...a,
          progressPercent: Math.min(100, Math.max(0, progress)),
        };
      })
      .sort((a, b) => {
        // Sort by closest deadline
        const timeA = a.goalDeadline ? new Date(a.goalDeadline).getTime() : Infinity;
        const timeB = b.goalDeadline ? new Date(b.goalDeadline).getTime() : Infinity;
        return timeA - timeB;
      });
  });
}
