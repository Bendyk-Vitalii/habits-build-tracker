import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { LearningTopic } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-topic-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Edit Topic' : 'New Topic' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="topic-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Topic Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Rust Programming" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Icon</mat-label>
          <mat-select formControlName="icon">
            @for (icon of iconOptions; track icon) {
              <mat-option [value]="icon">
                <div class="icon-option">
                  <mat-icon>{{ icon }}</mat-icon>
                  <span>{{ icon }}</span>
                </div>
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="color-section">
          <label class="color-label">Color</label>
          <div class="color-swatches">
            @for (color of colorOptions; track color) {
              <button
                type="button"
                class="color-swatch"
                [class.selected]="selectedColor() === color"
                [style.background-color]="color"
                (click)="selectColor(color)"
                [attr.aria-label]="'Select color ' + color"
              >
                @if (selectedColor() === color) {
                  <mat-icon class="check-icon">check</mat-icon>
                }
              </button>
            }
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (isEditMode) {
        <button mat-button color="warn" (click)="onDelete()" class="delete-btn">Delete</button>
      }
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .topic-form {
        display: flex;
        flex-direction: column;
        gap: var(--ht-spacing-sm, 8px);
        min-width: 280px;
        padding-top: var(--ht-spacing-sm, 8px);
      }

      .full-width {
        width: 100%;
      }

      .icon-option {
        display: flex;
        align-items: center;
        gap: var(--ht-spacing-sm, 8px);

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: var(--ht-text-secondary, #aaa);
        }

        span {
          font-size: 0.875rem;
        }
      }

      .color-section {
        display: flex;
        flex-direction: column;
        gap: var(--ht-spacing-sm, 8px);
        margin-bottom: var(--ht-spacing-sm, 8px);
      }

      .color-label {
        font-size: 0.875rem;
        color: var(--ht-text-secondary, #aaa);
      }

      .color-swatches {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ht-spacing-sm, 8px);
      }

      .color-swatch {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          transform var(--ht-transition-fast, 150ms) ease,
          border-color var(--ht-transition-fast, 150ms) ease;
        padding: 0;
        outline: none;

        &:hover {
          transform: scale(1.15);
        }

        &.selected {
          border-color: var(--ht-text-primary, #fff);
          transform: scale(1.1);
        }

        .check-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #fff;
        }
      }

      .delete-btn {
        margin-right: auto;
      }
    `,
  ],
})
export class TopicFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<TopicFormComponent>>(MatDialogRef);
  data = inject<LearningTopic | null>(MAT_DIALOG_DATA, { optional: true });

  form!: FormGroup;
  isEditMode = false;

  readonly selectedColor = signal<string>('#42a5f5');

  readonly iconOptions = [
    'translate',
    'database',
    'dns',
    'code',
    'web',
    'cloud',
    'smart_toy',
    'psychology',
    'terminal',
    'storage',
    'memory',
    'hub',
  ];

  readonly colorOptions = [
    '#42a5f5',
    '#66bb6a',
    '#ffa726',
    '#ef5350',
    '#ab47bc',
    '#ff7043',
    '#26c6da',
    '#78909c',
  ];

  constructor() {
    this.isEditMode = !!this.data;
  }

  ngOnInit(): void {
    const d = this.data;
    this.form = this.fb.group({
      name: [d?.name || '', [Validators.required, Validators.maxLength(50)]],
      icon: [d?.icon || 'code', Validators.required],
      color: [d?.color || this.colorOptions[0], Validators.required],
    });

    this.selectedColor.set(d?.color || this.colorOptions[0]);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
    this.form.patchValue({ color });
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  onDelete(): void {
    this.dialogRef.close('DELETE');
  }
}
