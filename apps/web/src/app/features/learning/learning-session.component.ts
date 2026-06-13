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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LearningTopic } from '@habits-tracker/shared';
import { LearningService } from '../../core/services/learning.service';
import { SessionCompleteDialogComponent } from './components/session-complete-dialog/session-complete-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-learning-session',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './learning-session.component.html',
  styleUrl: './learning-session.component.scss',
})
export class LearningSessionComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learningService = inject(LearningService);
  private dialog = inject(MatDialog);

  topic = signal<LearningTopic | null>(null);
  isRunning = signal(false);
  isPaused = signal(false);
  isComplete = signal(false);

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
    this.startTimer();
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
