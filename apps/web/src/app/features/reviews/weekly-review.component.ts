import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReviewService } from '../../core/services/review.service';
import { TrackingService } from '../../core/services/tracking.service';
import { AiInsightCardComponent } from '../dashboard/components/ai-insight-card/ai-insight-card.component';
import { WeeklyReview } from '@habits-tracker/shared';

@Component({
  selector: 'ht-weekly-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    AiInsightCardComponent,
  ],
  templateUrl: './weekly-review.component.html',
  styleUrl: './weekly-review.component.scss',
})
export class WeeklyReviewComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private trackingService = inject(TrackingService);

  review = signal<WeeklyReview | null>(null);
  completionRate = signal<number>(0);
  isSaving = signal<boolean>(false);

  notesWell = signal<string>('');
  notesImprove = signal<string>('');

  async ngOnInit(): Promise<void> {
    const today = new Date();
    // Use last Sunday as start date
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const dateStr = weekStart.toISOString().split('T')[0];

    try {
      // Generate review if not exists
      const r = await this.reviewService.generateWeeklyReview(dateStr);
      this.review.set(r);
      this.notesWell.set(r.highlights || '');
      this.notesImprove.set(r.improvements || '');

      const rate = await this.trackingService.getOverallCompletionRate();
      this.completionRate.set(rate);
    } catch (e) {
      console.error('Failed to load review', e);
    }
  }

  async saveReview(): Promise<void> {
    const r = this.review();
    if (!r) return;

    this.isSaving.set(true);
    try {
      await this.reviewService.saveWeeklyReview({
        ...r,
        highlights: this.notesWell(),
        improvements: this.notesImprove(),
        isCompleted: true,
      });
      // Optionally show toast or navigate
      alert('Review saved successfully!');
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      this.isSaving.set(false);
    }
  }
}
