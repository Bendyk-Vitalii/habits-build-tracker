import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SavedLesson } from '@habits-tracker/shared';
import { LearningService } from '../../core/services/learning.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-saved-lesson-viewer',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSnackBarModule,
    FormsModule,
    KeyValuePipe,
    TitleCasePipe,
    DatePipe,
  ],
  templateUrl: './saved-lesson-viewer.component.html',
  styleUrl: './saved-lesson-viewer.component.scss',
})
export class SavedLessonViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learningService = inject(LearningService);
  private snackBar = inject(MatSnackBar);

  lesson = signal<SavedLesson | null>(null);
  isLoading = signal(true);

  // Quiz state
  quizAnswers = signal<Record<number, string>>({});
  quizSubmitted = signal(false);
  quizScore = signal(0);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const lessonId = params.get('lessonId');
      if (lessonId) {
        this.loadLesson(lessonId);
      } else {
        this.router.navigate(['/learn/saved']);
      }
    });
  }

  private async loadLesson(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const saved = await this.learningService.getSavedLessonById(id);
      if (!saved) {
        this.router.navigate(['/learn/saved']);
        return;
      }
      this.lesson.set(saved);
    } catch (err) {
      console.error('Failed to load saved lesson', err);
      this.router.navigate(['/learn/saved']);
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/learn/saved']);
  }

  async deleteLesson(): Promise<void> {
    const current = this.lesson();
    if (!current?.id) return;

    try {
      await this.learningService.deleteSavedLesson(current.id);
      this.snackBar.open('Lesson deleted', 'OK', { duration: 3000 });
      this.router.navigate(['/learn/saved']);
    } catch (err) {
      console.error('Failed to delete lesson', err);
      this.snackBar.open('Failed to delete lesson', 'OK', { duration: 3000 });
    }
  }

  // ── Quiz Logic ──────────────────────────────────────────

  selectAnswer(questionIndex: number, answer: string): void {
    if (this.quizSubmitted()) return;
    this.quizAnswers.update((prev) => ({ ...prev, [questionIndex]: answer }));
  }

  submitQuiz(): void {
    const currentLesson = this.lesson();
    if (!currentLesson || !currentLesson.quiz) return;

    let score = 0;
    currentLesson.quiz.forEach((q, i) => {
      if (this.quizAnswers()[i] === q.correctAnswer) {
        score++;
      }
    });

    this.quizScore.set(score);
    this.quizSubmitted.set(true);
  }

  isAnswerCorrect(questionIndex: number, option: string): boolean {
    const currentLesson = this.lesson();
    if (!currentLesson || !currentLesson.quiz) return false;
    return currentLesson.quiz[questionIndex].correctAnswer === option;
  }

  isAnswerSelected(questionIndex: number, option: string): boolean {
    return this.quizAnswers()[questionIndex] === option;
  }
}
