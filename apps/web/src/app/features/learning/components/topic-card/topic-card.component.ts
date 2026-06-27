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
  templateUrl: './topic-card.component.html',
  styleUrl: './topic-card.component.scss',
})
export class TopicCardComponent {
  readonly topic = input.required<LearningTopic>();
  readonly totalMinutes = input<number>(0);
  readonly sessionCount = input<number>(0);
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

  readonly formattedCount = computed(() => {
    const count = this.sessionCount();
    if (count === 0) return '';
    return count === 1 ? '1 session' : `${count} sessions`;
  });

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }
}
