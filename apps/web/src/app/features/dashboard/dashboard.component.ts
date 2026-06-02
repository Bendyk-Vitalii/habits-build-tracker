import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { TodayOverviewComponent } from './components/today-overview/today-overview.component';
import { WeeklySummaryCardComponent } from './components/weekly-summary-card/weekly-summary-card.component';
import { AiInsightCardComponent } from './components/ai-insight-card/ai-insight-card.component';
import { GoalsOverviewComponent } from './components/goals-overview/goals-overview.component';
import { ProgressRingComponent } from '../../shared/components/progress-ring/progress-ring.component';
import { ActivityService } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';
import { TrackingService } from '../../core/services/tracking.service';
import { Activity, Session } from '@habits-tracker/shared';

@Component({
  selector: 'ht-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    TodayOverviewComponent,
    WeeklySummaryCardComponent,
    AiInsightCardComponent,
    GoalsOverviewComponent,
    ProgressRingComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);
  private trackingService = inject(TrackingService);

  activities = this.activityService.activities;
  todaySessions = signal<Session[]>([]);
  weeklyCompletionRate = signal(0);
  greeting = signal('');

  /** Computed: activities with their today's progress */
  activitiesWithProgress = computed(() => {
    const acts = this.activities();
    const sessions = this.todaySessions();

    return acts.map((activity) => {
      const todayMinutes = sessions
        .filter((s) => s.activityId === activity.id)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const dailyGoal = Math.round(activity.weeklyGoalMinutes / activity.sessionsPerWeek);

      return {
        ...activity,
        todayMinutes,
        dailyGoal,
        todayComplete: todayMinutes >= dailyGoal,
      };
    });
  });

  ngOnInit(): void {
    this.loadData();
    this.setGreeting();
  }

  private async loadData(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await this.sessionService.getSessionsForDate(today);
    this.todaySessions.set(sessions);

    const rate = await this.trackingService.getOverallCompletionRate();
    this.weeklyCompletionRate.set(rate);
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting.set('Good morning');
    else if (hour < 17) this.greeting.set('Good afternoon');
    else this.greeting.set('Good evening');
  }
}
