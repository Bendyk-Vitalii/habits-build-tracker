import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { LearningTopic } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-topic-card',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatRippleModule],
  template: `
    <div class="topic-card" matRipple (click)="startSession.emit()">
      <button class="edit-btn" mat-icon-button aria-label="Edit topic" (click)="onEdit($event)">
        <mat-icon class="edit-icon">edit</mat-icon>
      </button>

      <div class="icon-circle" [style.background-color]="iconBgColor()">
        <mat-icon [style.color]="topic().color">{{ topic().icon }}</mat-icon>
      </div>

      <span class="topic-name">{{ topic().name }}</span>
      <span class="topic-time">{{ formattedTime() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .topic-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ht-spacing-sm, 8px);
        padding: var(--ht-spacing-lg, 20px) var(--ht-spacing-md, 16px);
        background: var(--ht-glass-bg, rgba(255, 255, 255, 0.08));
        backdrop-filter: blur(var(--ht-glass-blur, 12px));
        border: 1px solid var(--ht-glass-border, rgba(255, 255, 255, 0.12));
        border-radius: var(--ht-radius-lg, 16px);
        cursor: pointer;
        transition:
          transform var(--ht-transition-fast, 150ms) ease,
          box-shadow var(--ht-transition-fast, 150ms) ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        &:active {
          transform: scale(0.97);
        }
      }

      .edit-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 28px;
        height: 28px;
        line-height: 28px;

        .edit-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--ht-text-secondary, #aaa);
        }
      }

      .icon-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        transition: transform var(--ht-transition-fast, 150ms) ease;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .topic-name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--ht-text-primary, #fff);
        text-align: center;
        line-height: 1.3;
      }

      .topic-time {
        font-size: 0.75rem;
        color: var(--ht-text-secondary, #aaa);
      }
    `,
  ],
})
export class TopicCardComponent {
  readonly topic = input.required<LearningTopic>();
  readonly totalMinutes = input<number>(0);
  readonly startSession = output<void>();
  readonly edit = output<void>();

  readonly iconBgColor = computed(() => {
    const color = this.topic().color;
    return `${color}26`; // 26 hex = ~15% opacity
  });

  readonly formattedTime = computed(() => {
    const minutes = this.totalMinutes();
    if (minutes === 0) return 'No sessions yet';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  });

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }
}
