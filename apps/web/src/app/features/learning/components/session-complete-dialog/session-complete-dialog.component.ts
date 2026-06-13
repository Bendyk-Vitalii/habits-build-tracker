import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface SessionCompleteData {
  topicName: string;
  durationMinutes: number;
}

export interface SessionCompleteResult {
  rating: number;
  notes: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-session-complete-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    StarRatingComponent,
  ],
  template: `
    <div class="session-complete">
      <div class="celebration-glow"></div>

      <div class="header">
        <mat-icon class="trophy-icon">emoji_events</mat-icon>
        <h2>Session Complete! 🎉</h2>
        <p class="topic-name">{{ data.topicName }}</p>
        <p class="duration">{{ data.durationMinutes }} minutes of learning</p>
      </div>

      <div class="rating-section">
        <label class="section-label">How was this session?</label>
        <ht-star-rating [rating]="rating()" (ratingChange)="rating.set($event)" />
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes (optional)</mat-label>
        <textarea
          matInput
          [value]="notes()"
          (input)="notes.set(notesInput.value)"
          #notesInput
          rows="3"
          placeholder="What did you learn?"
        ></textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button (click)="onSkip()">Skip</button>
        <button mat-flat-button color="primary" (click)="onSave()">Save</button>
      </div>
    </div>
  `,
  styles: [
    `
      .session-complete {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ht-spacing-lg, 20px);
        padding: var(--ht-spacing-xl, 24px);
        overflow: hidden;
      }

      .celebration-glow {
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 167, 38, 0.25) 0%, transparent 70%);
        pointer-events: none;
        animation: pulse-glow 2s ease-in-out infinite;
      }

      @keyframes pulse-glow {
        0%,
        100% {
          opacity: 0.6;
          transform: translateX(-50%) scale(1);
        }
        50% {
          opacity: 1;
          transform: translateX(-50%) scale(1.15);
        }
      }

      .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ht-spacing-xs, 4px);
        text-align: center;
        z-index: 1;
      }

      .trophy-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--ht-warning, #ffa726);
        animation: bounce-in 0.5s ease-out;
      }

      @keyframes bounce-in {
        0% {
          transform: scale(0);
        }
        60% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
        }
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ht-text-primary, #fff);
      }

      .topic-name {
        font-size: 1rem;
        font-weight: 500;
        color: var(--ht-primary, #90caf9);
        margin: 0;
      }

      .duration {
        font-size: 0.875rem;
        color: var(--ht-text-secondary, #aaa);
        margin: 0;
      }

      .rating-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ht-spacing-sm, 8px);
        z-index: 1;
      }

      .section-label {
        font-size: 0.875rem;
        color: var(--ht-text-secondary, #aaa);
      }

      .full-width {
        width: 100%;
        z-index: 1;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--ht-spacing-sm, 8px);
        width: 100%;
        z-index: 1;
      }
    `,
  ],
})
export class SessionCompleteDialogComponent {
  data = inject<SessionCompleteData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<SessionCompleteDialogComponent>>(MatDialogRef);

  readonly rating = signal<number>(0);
  readonly notes = signal<string>('');

  onSave(): void {
    const result: SessionCompleteResult = {
      rating: this.rating(),
      notes: this.notes(),
    };
    this.dialogRef.close(result);
  }

  onSkip(): void {
    this.dialogRef.close(null);
  }
}
