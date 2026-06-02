import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StreakCounterComponent } from '../../../../shared/components/streak-counter/streak-counter.component';
import { PhaseBadgeComponent } from '../../../../shared/components/phase-badge/phase-badge.component';

interface ActivityWithProgress {
  id?: number;
  name: string;
  icon: string;
  color: string;
  currentPhase: string;
  consecutiveDays: number;
  todayMinutes: number;
  dailyGoal: number;
  todayComplete: boolean;
}

@Component({
  selector: 'ht-today-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, StreakCounterComponent, PhaseBadgeComponent],
  templateUrl: './today-overview.component.html',
  styleUrl: './today-overview.component.scss',
})
export class TodayOverviewComponent {
  @Input() activities: ActivityWithProgress[] = [];
  
  Math = Math;
}
