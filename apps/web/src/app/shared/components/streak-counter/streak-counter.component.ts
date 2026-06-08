import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-streak-counter',
  standalone: true,
  templateUrl: './streak-counter.component.html',
  styleUrl: './streak-counter.component.scss',
})
export class StreakCounterComponent {
  readonly count = input(0);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly isActive = computed(() => this.count() > 0);
}
