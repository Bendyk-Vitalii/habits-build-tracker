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
  templateUrl: './topic-form.component.html',
  styleUrl: './topic-form.component.scss',
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
