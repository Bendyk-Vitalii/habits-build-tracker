import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyValuePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { LearningTopic, AiLessonResponse, LessonDifficulty } from '@habits-tracker/shared';
import { LearningService } from '../../core/services/learning.service';
import { SessionCompleteDialogComponent } from './components/session-complete-dialog/session-complete-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-learning-session',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    FormsModule,
    KeyValuePipe,
    TitleCasePipe,
  ],
  templateUrl: './learning-session.component.html',
  styleUrl: './learning-session.component.scss',
})
export class LearningSessionComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learningService = inject(LearningService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  topic = signal<LearningTopic | null>(null);
  isRunning = signal(false);
  isPaused = signal(false);
  isComplete = signal(false);

  lesson = signal<AiLessonResponse | null>(null);
  isLoadingLesson = signal(true);
  lessonError = signal<string | null>(null);

  // Difficulty state
  currentDifficulty = signal<LessonDifficulty>('intermediate');
  isRegenerating = signal(false);
  isSaved = signal(false);
  isSaving = signal(false);

  // Quiz state
  quizAnswers = signal<Record<number, string>>({});
  quizSubmitted = signal(false);
  quizScore = signal(0);

  /** Default session duration in seconds (10 minutes) */
  private readonly defaultDurationSeconds = 10 * 60;
  timeRemainingSeconds = signal(this.defaultDurationSeconds);

  private targetEndTimeMs = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;

  Math = Math;

  formattedTime = computed(() => {
    const total = this.timeRemainingSeconds();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  progressPercent = computed(() => {
    const remaining = this.timeRemainingSeconds();
    const total = this.defaultDurationSeconds;
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const topicId = params.get('topicId');
      if (topicId) {
        this.loadTopic(topicId);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.releaseWakeLock();
  }

  private async loadTopic(topicId: string): Promise<void> {
    const t = await this.learningService.getTopicById(topicId);
    if (!t) {
      this.router.navigate(['/learn']);
      return;
    }
    this.topic.set(t);
    this.isLoadingLesson.set(true);
    this.lessonError.set(null);

    try {
      // Generate a 10-minute lesson based on the topic at current difficulty
      const generated = await this.learningService.generateLesson(
        t.name,
        10,
        this.currentDifficulty(),
      );
      this.lesson.set(generated);
      this.startTimer();
    } catch (err) {
      console.error('Failed to load lesson', err);
      this.lessonError.set('Failed to generate the lesson. Please try again later.');
    } finally {
      this.isLoadingLesson.set(false);
    }
  }

  startTimer(): void {
    this.isRunning.set(true);
    this.isPaused.set(false);
    this.targetEndTimeMs = Date.now() + this.timeRemainingSeconds() * 1000;
    this.requestWakeLock();

    this.intervalId = setInterval(() => {
      const remaining = Math.round((this.targetEndTimeMs - Date.now()) / 1000);
      this.timeRemainingSeconds.set(Math.max(0, remaining));

      if (remaining <= 0) {
        this.completeSession();
      }
    }, 500);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    this.isPaused.set(true);
    this.releaseWakeLock();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resumeTimer(): void {
    this.startTimer();
  }

  toggleTimer(): void {
    if (this.isRunning()) {
      this.pauseTimer();
    } else {
      this.resumeTimer();
    }
  }

  extendTime(): void {
    const additionalSeconds = 5 * 60; // 5 minutes
    this.timeRemainingSeconds.update((t) => t + additionalSeconds);
    if (this.isRunning()) {
      this.targetEndTimeMs += additionalSeconds * 1000;
    }
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning.set(false);
  }

  private completeSession(): void {
    this.stopTimer();
    this.isComplete.set(true);
    this.releaseWakeLock();
    this.playNotification();

    const currentTopic = this.topic();
    if (!currentTopic) return;

    const elapsed = this.defaultDurationSeconds - this.timeRemainingSeconds();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    const dialogRef = this.dialog.open(SessionCompleteDialogComponent, {
      width: '100%',
      maxWidth: '440px',
      panelClass: 'bottom-sheet-dialog',
      disableClose: true,
      data: {
        topicName: currentTopic.name,
        durationMinutes: Math.round(this.defaultDurationSeconds / 60),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.learningService.logLearningSession(
          currentTopic.id!,
          currentTopic.name,
          result.durationMinutes || durationMinutes,
          result.rating,
          result.notes,
        );
      } else {
        // User skipped rating, still log the session
        this.learningService.logLearningSession(
          currentTopic.id!,
          currentTopic.name,
          durationMinutes,
        );
      }
      this.router.navigate(['/learn']);
    });
  }

  finishEarly(): void {
    this.stopTimer();
    this.isComplete.set(true);
    this.releaseWakeLock();

    const currentTopic = this.topic();
    if (!currentTopic) return;

    const elapsed = this.defaultDurationSeconds - this.timeRemainingSeconds();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    const dialogRef = this.dialog.open(SessionCompleteDialogComponent, {
      width: '100%',
      maxWidth: '440px',
      panelClass: 'bottom-sheet-dialog',
      disableClose: true,
      data: {
        topicName: currentTopic.name,
        durationMinutes,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.learningService.logLearningSession(
          currentTopic.id!,
          currentTopic.name,
          result.durationMinutes || durationMinutes,
          result.rating,
          result.notes,
        );
      } else {
        this.learningService.logLearningSession(
          currentTopic.id!,
          currentTopic.name,
          durationMinutes,
        );
      }
      this.router.navigate(['/learn']);
    });
  }

  goBack(): void {
    this.stopTimer();
    this.releaseWakeLock();
    this.router.navigate(['/learn']);
  }

  // ── Difficulty Controls ─────────────────────────────────

  private getNextDifficulty(current: LessonDifficulty): LessonDifficulty {
    switch (current) {
      case 'intermediate':
        return 'advanced';
      case 'advanced':
        return 'expert';
      case 'expert':
        return 'expert';
    }
  }

  goDeeper(): void {
    const next = this.getNextDifficulty(this.currentDifficulty());
    if (next === this.currentDifficulty()) return;
    this.currentDifficulty.set(next);
    this.regenerateLesson();
  }

  async regenerateLesson(): Promise<void> {
    const currentTopic = this.topic();
    if (!currentTopic) return;

    this.isRegenerating.set(true);
    this.lessonError.set(null);
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
    this.quizScore.set(0);
    this.isSaved.set(false);
    this.isSaving.set(false);

    try {
      const generated = await this.learningService.generateLesson(
        currentTopic.name,
        10,
        this.currentDifficulty(),
      );
      this.lesson.set(generated);
    } catch (err) {
      console.error('Failed to regenerate lesson', err);
      this.lessonError.set('Failed to generate the lesson. Please try again.');
    } finally {
      this.isRegenerating.set(false);
    }
  }

  // ── Save/Bookmark ──────────────────────────────────────

  async saveLesson(): Promise<void> {
    const currentTopic = this.topic();
    const currentLesson = this.lesson();
    if (!currentTopic || !currentLesson || this.isSaved() || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      await this.learningService.saveLesson(currentTopic, currentLesson, this.currentDifficulty());
      this.isSaved.set(true);
      this.snackBar.open('Lesson saved to your library!', 'View', {
        duration: 4000,
        panelClass: 'success-snackbar',
      });
    } catch (err) {
      console.error('Failed to save lesson', err);
      this.snackBar.open('Failed to save lesson', 'Dismiss', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
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

  private playNotification(): void {
    try {
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc2.connect(gainNode);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 350);
    } catch {
      // Audio blocked
    }
  }

  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      // WakeLock unavailable
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
      });
    }
  }
}
