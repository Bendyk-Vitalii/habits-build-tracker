import { Component, ChangeDetectionStrategy, input, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ExerciseBlank, ExerciseType } from '@habits-tracker/shared';

interface BlankState {
  userAnswer: string;
  isChecked: boolean;
  isCorrect: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-exercise-block',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './exercise-block.component.html',
  styleUrl: './exercise-block.component.scss',
})
export class ExerciseBlockComponent implements OnInit {
  readonly blanks = input.required<ExerciseBlank[]>();
  readonly exerciseType = input<ExerciseType>('fill-blank');
  readonly title = input<string>('');

  readonly states = signal<BlankState[]>([]);
  readonly isAllChecked = signal(false);

  readonly score = computed(() => {
    const s = this.states();
    if (s.length === 0) return { correct: 0, total: 0 };
    const correct = s.filter((b) => b.isCorrect).length;
    return { correct, total: s.length };
  });

  ngOnInit(): void {
    this.states.set(
      this.blanks().map(() => ({ userAnswer: '', isChecked: false, isCorrect: false })),
    );
  }

  updateAnswer(index: number, value: string): void {
    this.states.update((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], userAnswer: value };
      return updated;
    });
  }

  checkAnswers(): void {
    const currentBlanks = this.blanks();
    this.states.update((prev) =>
      prev.map((state, i) => ({
        ...state,
        isChecked: true,
        isCorrect:
          state.userAnswer.trim().toLowerCase() === currentBlanks[i].answer.trim().toLowerCase(),
      })),
    );
    this.isAllChecked.set(true);
  }

  retry(): void {
    this.states.set(
      this.blanks().map(() => ({ userAnswer: '', isChecked: false, isCorrect: false })),
    );
    this.isAllChecked.set(false);
  }

  showHint(index: number): void {
    const blank = this.blanks()[index];
    if (blank.hint) {
      this.states.update((prev) => {
        const updated = [...prev];
        // Use hint as a partial fill
        updated[index] = { ...updated[index], userAnswer: blank.hint ?? '' };
        return updated;
      });
    }
  }

  getExerciseIcon(): string {
    switch (this.exerciseType()) {
      case 'translate':
        return 'translate';
      case 'reorder':
        return 'swap_vert';
      default:
        return 'edit_note';
    }
  }

  getExerciseLabel(): string {
    switch (this.exerciseType()) {
      case 'translate':
        return 'Translation';
      case 'reorder':
        return 'Reorder';
      default:
        return 'Fill in the Blank';
    }
  }
}
