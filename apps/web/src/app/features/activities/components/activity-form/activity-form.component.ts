import { Component, Inject, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Activity, ActivityCategory, HabitPhase } from '@habits-tracker/shared';
import { ActivityService } from '../../../../core/services/activity.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-activity-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './activity-form.component.html',
  styleUrl: './activity-form.component.scss',
})
export class ActivityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private activityService = inject(ActivityService);

  activityForm!: FormGroup;
  categories = Object.values(ActivityCategory);
  isEditMode = false;

  // Some predefined colors for easy selection
  presetColors = [
    '#FF9800', // Orange
    '#4CAF50', // Green
    '#00BCD4', // Cyan
    '#9C27B0', // Purple
    '#F44336', // Red
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#FFEB3B', // Yellow
  ];

  constructor(
    public dialogRef: MatDialogRef<ActivityFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Activity | null,
  ) {
    this.isEditMode = !!data;
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.activityForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required, Validators.maxLength(50)]],
      category: [this.data?.category || ActivityCategory.ProfessionalGrowth, Validators.required],
      icon: [this.data?.icon || 'star', Validators.required],
      color: [this.data?.color || this.presetColors[0], Validators.required],
      weeklyGoalMinutes: [
        this.data?.weeklyGoalMinutes || 30,
        [Validators.required, Validators.min(1)],
      ],
      sessionsPerWeek: [
        this.data?.sessionsPerWeek || 3,
        [Validators.required, Validators.min(1), Validators.max(21)],
      ],
      goal: [this.data?.goal || '', Validators.maxLength(100)],
      goalDeadline: [this.data?.goalDeadline || null],
    });
  }

  selectColor(color: string): void {
    this.activityForm.patchValue({ color });
  }

  async onSubmit(): Promise<void> {
    if (this.activityForm.invalid) return;

    const formValue = this.activityForm.value;

    try {
      if (this.isEditMode && this.data?.id) {
        // Update existing
        await this.activityService.updateActivity(this.data.id, formValue);
      } else {
        // Create new
        const newActivity: Omit<Activity, 'id' | 'createdAt'> = {
          ...formValue,
          currentPhase: HabitPhase.Establishing,
          phaseStartDate: new Date().toISOString().split('T')[0],
          consecutiveDays: 0,
          isArchived: 0,
          order: 999, // Will be placed at the end
        };
        await this.activityService.addActivity(newActivity);
      }
      this.dialogRef.close(true);
    } catch (error: any) {
      alert(error.message || 'An error occurred while saving the activity.');
    }
  }
}
