import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReviewService } from '../../core/services/review.service';
import { MonthlyReview } from '@habits-tracker/shared';

@Component({
  selector: 'ht-monthly-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './monthly-review.component.html',
  styleUrl: './monthly-review.component.scss',
})
export class MonthlyReviewComponent implements OnInit {
  private reviewService = inject(ReviewService);

  review = signal<MonthlyReview | null>(null);
  isSaving = signal<boolean>(false);

  notes = signal<string>('');

  async ngOnInit(): Promise<void> {
    const today = new Date();
    // YYYY-MM
    const monthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      const r = await this.reviewService.generateMonthlyReview(monthStr);
      this.review.set(r);
      this.notes.set(r.notes || '');
    } catch (e) {
      console.error('Failed to load monthly review', e);
    }
  }

  async saveReview(): Promise<void> {
    const r = this.review();
    if (!r) return;

    this.isSaving.set(true);
    try {
      await this.reviewService.saveMonthlyReview({
        ...r,
        notes: this.notes(),
        isCompleted: true,
      });
      alert('Monthly review saved successfully!');
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      this.isSaving.set(false);
    }
  }
}
