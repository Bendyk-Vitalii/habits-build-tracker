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
  templateUrl: './session-complete-dialog.component.html',
  styleUrl: './session-complete-dialog.component.scss',
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
