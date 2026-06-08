import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Activity, Session } from '@habits-tracker/shared';
import { ActivityService } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';
import { TrackingService } from '../../core/services/tracking.service';
import { ActivityFormComponent } from './components/activity-form/activity-form.component';
import { PhaseBadgeComponent } from '../../shared/components/phase-badge/phase-badge.component';
import { StreakCounterComponent } from '../../shared/components/streak-counter/streak-counter.component';
import { ProgressRingComponent } from '../../shared/components/progress-ring/progress-ring.component';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'ht-activity-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    PhaseBadgeComponent,
    DurationPipe,
    RelativeDatePipe,
  ],
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.scss',
})
export class ActivityDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);
  private trackingService = inject(TrackingService);
  private dialog = inject(MatDialog);

  activity = signal<Activity | null>(null);
  recentSessions = signal<Session[]>([]);
  streak = signal<number>(0);
  longestStreak = signal<number>(0);
  weeklyMinutes = signal<number>(0);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadData(id);
      }
    });
  }

  async loadData(id: string | number): Promise<void> {
    const act = await this.activityService.getActivity(id);
    if (!act) {
      this.router.navigate(['/activities']);
      return;
    }
    this.activity.set(act);

    // Load stats
    const streak = await this.trackingService.getStreak(id);
    const longestStreak = await this.trackingService.getLongestStreak(id);
    const weeklyRate = await this.trackingService.getWeeklyCompletionRate(id);

    this.streak.set(streak);
    this.longestStreak.set(longestStreak);
    this.weeklyMinutes.set(Math.round((weeklyRate / 100) * act.weeklyGoalMinutes));

    // Load recent sessions (last 30 days roughly)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sessions = await this.sessionService.getSessionsForActivity(
      id,
      thirtyDaysAgo.toISOString().split('T')[0],
    );
    this.recentSessions.set(sessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5));
  }

  openEditDialog(): void {
    const currentActivity = this.activity();
    if (!currentActivity) return;

    const dialogRef = this.dialog.open(ActivityFormComponent, {
      width: '100%',
      maxWidth: '500px',
      panelClass: 'bottom-sheet-dialog',
      data: currentActivity,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && currentActivity.id) {
        this.loadData(currentActivity.id);
      }
    });
  }

  async archiveActivity(): Promise<void> {
    const currentActivity = this.activity();
    if (!currentActivity || !currentActivity.id) return;

    if (confirm(`Are you sure you want to archive ${currentActivity.name}?`)) {
      await this.activityService.archiveActivity(currentActivity.id);
      this.router.navigate(['/activities']);
    }
  }

  async deleteActivity(): Promise<void> {
    const currentActivity = this.activity();
    if (!currentActivity || !currentActivity.id) return;

    if (
      confirm(
        `DANGER: Are you sure you want to permanently delete ${currentActivity.name} and all its sessions?`,
      )
    ) {
      await this.activityService.deleteActivity(currentActivity.id);
      this.router.navigate(['/activities']);
    }
  }
}
