import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Activity, SessionType } from '@habits-tracker/shared';
import { ActivityService } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';
import { SettingsService } from '../../core/services/settings.service';

type TimerMode = 'pomodoro' | 'stopwatch' | 'manual';
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

@Component({
  selector: 'ht-timer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatButtonToggleModule,
  ],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent implements OnInit, OnDestroy {
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);
  private settingsService = inject(SettingsService);

  activities = this.activityService.activities;
  settings = this.settingsService.settings;

  // State
  mode = signal<TimerMode>('pomodoro');
  selectedActivityId = signal<number | null>(null);

  // Expose Math for template
  Math = Math;

  // Timer State
  isRunning = signal(false);
  timeRemainingSeconds = signal(0);
  stopwatchElapsedSeconds = signal(0);

  // Pomodoro State
  pomodoroPhase = signal<PomodoroPhase>('work');
  pomodoroSessionsCompleted = signal(0);

  // Manual Entry State
  manualMinutes = signal<number>(30);
  manualNotes = signal<string>('');

  private intervalId: any;
  private wakeLock: any = null;

  // Computed
  formattedTime = computed(() => {
    const totalSeconds =
      this.mode() === 'stopwatch' ? this.stopwatchElapsedSeconds() : this.timeRemainingSeconds();
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  progressPercent = computed(() => {
    if (this.mode() !== 'pomodoro') return 0;

    const sets = this.settings();
    if (!sets) return 0;

    let total = sets.pomodoroWorkMinutes * 60;
    if (this.pomodoroPhase() === 'shortBreak') total = sets.pomodoroBreakMinutes * 60;
    if (this.pomodoroPhase() === 'longBreak') total = sets.pomodoroLongBreakMinutes * 60;

    const remaining = this.timeRemainingSeconds();
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  });

  constructor() {
    // Reset timer when mode changes
    effect(() => {
      const currentMode = this.mode();
      this.pauseTimer();
      if (currentMode === 'pomodoro') {
        this.resetPomodoro();
      } else if (currentMode === 'stopwatch') {
        this.stopwatchElapsedSeconds.set(0);
      }
    });

    // Reset pomodoro timer when settings change, if we're not running
    effect(() => {
      const sets = this.settings();
      if (sets && !this.isRunning() && this.mode() === 'pomodoro') {
        this.resetPomodoroPhase();
      }
    });
  }

  ngOnInit(): void {
    // Auto-select first activity if none selected
    if (this.activities().length > 0 && !this.selectedActivityId()) {
      this.selectedActivityId.set(this.activities()[0].id!);
    }
  }

  ngOnDestroy(): void {
    this.pauseTimer();
  }

  // --- Controls ---

  toggleTimer(): void {
    if (this.isRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    if (!this.selectedActivityId()) {
      alert('Please select an activity first');
      return;
    }

    this.isRunning.set(true);
    this.requestWakeLock();

    this.intervalId = setInterval(() => {
      if (this.mode() === 'pomodoro') {
        this.timeRemainingSeconds.update((t) => t - 1);
        if (this.timeRemainingSeconds() <= 0) {
          this.handlePomodoroPhaseComplete();
        }
      } else if (this.mode() === 'stopwatch') {
        this.stopwatchElapsedSeconds.update((t) => t + 1);
      }
    }, 1000);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    this.releaseWakeLock();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resetTimer(): void {
    this.pauseTimer();
    if (this.mode() === 'pomodoro') {
      this.resetPomodoroPhase();
    } else if (this.mode() === 'stopwatch') {
      this.stopwatchElapsedSeconds.set(0);
    }
  }

  // --- Pomodoro Logic ---

  skipPhase(): void {
    this.pauseTimer();
    this.advancePomodoroPhase();
  }

  private resetPomodoro(): void {
    this.pomodoroPhase.set('work');
    this.pomodoroSessionsCompleted.set(0);
    this.resetPomodoroPhase();
  }

  private resetPomodoroPhase(): void {
    const sets = this.settings();
    if (!sets) return;

    let minutes = sets.pomodoroWorkMinutes;
    if (this.pomodoroPhase() === 'shortBreak') minutes = sets.pomodoroBreakMinutes;
    if (this.pomodoroPhase() === 'longBreak') minutes = sets.pomodoroLongBreakMinutes;

    this.timeRemainingSeconds.set(minutes * 60);
  }

  private async handlePomodoroPhaseComplete(): Promise<void> {
    this.pauseTimer();
    this.playAudioNotification();

    // If we just finished a work session, log it
    if (this.pomodoroPhase() === 'work') {
      this.pomodoroSessionsCompleted.update((c) => c + 1);
      await this.logSession(this.settings()?.pomodoroWorkMinutes || 25);
    }

    this.advancePomodoroPhase();
  }

  private advancePomodoroPhase(): void {
    const phase = this.pomodoroPhase();
    const sessions = this.pomodoroSessionsCompleted();
    const sets = this.settings();
    const sessionsBeforeLongBreak = sets?.pomodoroSessionsBeforeLongBreak || 4;

    if (phase === 'work') {
      if (sessions > 0 && sessions % sessionsBeforeLongBreak === 0) {
        this.pomodoroPhase.set('longBreak');
      } else {
        this.pomodoroPhase.set('shortBreak');
      }
    } else {
      this.pomodoroPhase.set('work');
    }

    this.resetPomodoroPhase();
  }

  // --- Stopwatch & Manual Logic ---

  async saveStopwatchSession(): Promise<void> {
    this.pauseTimer();
    const minutes = Math.round(this.stopwatchElapsedSeconds() / 60);
    if (minutes > 0) {
      await this.logSession(minutes);
      this.stopwatchElapsedSeconds.set(0);
    } else {
      alert('Session too short to save (less than 1 minute).');
    }
  }

  async saveManualSession(): Promise<void> {
    if (this.manualMinutes() > 0) {
      await this.logSession(this.manualMinutes(), this.manualNotes());
      this.manualNotes.set('');
    }
  }

  // --- Common Logic ---

  private async logSession(durationMinutes: number, notes?: string): Promise<void> {
    const actId = this.selectedActivityId();
    if (!actId) return;

    try {
      const typeStr =
        this.mode() === 'pomodoro'
          ? SessionType.Pomodoro
          : this.mode() === 'stopwatch'
            ? SessionType.Stopwatch
            : SessionType.Manual;

      await this.sessionService.logSession(actId, durationMinutes, typeStr, notes);
      alert(`Successfully logged ${durationMinutes} minutes!`);
    } catch (e) {
      console.error('Failed to log session', e);
      alert('Failed to log session.');
    }
  }

  private playAudioNotification(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio notification failed/blocked', e);
    }
  }

  // --- WakeLock ---

  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('WakeLock error', err);
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
