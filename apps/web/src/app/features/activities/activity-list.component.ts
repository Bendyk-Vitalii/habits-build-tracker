import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivityService } from '../../core/services/activity.service';
import { TrackingService } from '../../core/services/tracking.service';
import { ActivityCardComponent } from './components/activity-card/activity-card.component';
import { ActivityFormComponent } from './components/activity-form/activity-form.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Activity } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-activity-list',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    DragDropModule,
    ActivityCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './activity-list.component.html',
  styleUrl: './activity-list.component.scss',
})
export class ActivityListComponent implements OnInit {
  private activityService = inject(ActivityService);
  private trackingService = inject(TrackingService);
  private dialog = inject(MatDialog);

  activities = this.activityService.activities;
  activityStats = signal<Record<number, { streak: number; weeklyMinutes: number }>>({});

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    const stats = await this.trackingService.getAllActivityStatsMap();
    this.activityStats.set(stats);
  }

  openAddActivityDialog(): void {
    const dialogRef = this.dialog.open(ActivityFormComponent, {
      width: '100%',
      maxWidth: '500px',
      panelClass: 'bottom-sheet-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Activity added, re-load stats if needed
        this.loadStats();
      }
    });
  }

  async drop(event: CdkDragDrop<Activity[]>): Promise<void> {
    const currentActivities = [...this.activities()];
    moveItemInArray(currentActivities, event.previousIndex, event.currentIndex);
    const orderedIds = currentActivities.map((a) => a.id!).filter((id) => id !== undefined);
    await this.activityService.reorderActivities(orderedIds);
  }
}
