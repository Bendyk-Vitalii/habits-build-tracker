import { Component, computed, input } from '@angular/core';

@Component({
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
