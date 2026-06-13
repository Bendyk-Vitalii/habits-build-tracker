import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatRippleModule } from '@angular/material/core';
import { LearningService } from '../../core/services/learning.service';
import { LearningSession } from '@habits-tracker/shared';
import { TopicCardComponent } from './components/topic-card/topic-card.component';
import { TopicFormComponent } from './components/topic-form/topic-form.component';
import { StarRatingComponent } from './components/star-rating/star-rating.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-learning',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatRippleModule,
    TopicCardComponent,
    StarRatingComponent,
  ],
  templateUrl: './learning.component.html',
  styleUrl: './learning.component.scss',
})
export class LearningComponent implements OnInit {
  private learningService = inject(LearningService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  topics = this.learningService.topics;
  recentSessions = signal<LearningSession[]>([]);
  topicMinutes = signal<Record<string, number>>({});

  ngOnInit(): void {
    this.learningService.seedDefaultTopics();
    this.loadData();
  }

  async loadData(): Promise<void> {
    const sessions = await this.learningService.getRecentSessions(10);
    this.recentSessions.set(sessions);

    // Load total minutes per topic
    const minutes: Record<string, number> = {};
    for (const topic of this.topics()) {
      if (topic.id) {
        minutes[topic.id] = await this.learningService.getTotalMinutesForTopic(topic.id);
      }
    }
    this.topicMinutes.set(minutes);
  }

  startSession(topicId: string): void {
    this.router.navigate(['/learn/session', topicId]);
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(TopicFormComponent, {
      width: '100%',
      maxWidth: '440px',
      panelClass: 'bottom-sheet-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const order = this.topics().length;
        this.learningService.addTopic({ ...result, order }).then(() => this.loadData());
      }
    });
  }

  openEditDialog(topicId: string): void {
    const topic = this.topics().find((t) => t.id === topicId);
    if (!topic) return;

    const dialogRef = this.dialog.open(TopicFormComponent, {
      width: '100%',
      maxWidth: '440px',
      panelClass: 'bottom-sheet-dialog',
      data: topic,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'DELETE') {
        this.learningService.deleteTopic(topicId).then(() => this.loadData());
      } else if (result) {
        this.learningService.updateTopic(topicId, result).then(() => this.loadData());
      }
    });
  }

  formatMinutes(minutes: number): string {
    if (minutes === 0) return 'No sessions yet';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }
}
