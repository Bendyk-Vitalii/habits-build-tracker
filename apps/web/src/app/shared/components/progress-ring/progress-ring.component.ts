import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'ht-progress-ring',
  standalone: true,
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.scss',
})
export class ProgressRingComponent {
  readonly progress = input(0);
  readonly size = input(80);
  readonly strokeWidth = input(6);
  readonly color = input('var(--ht-primary)');
  readonly label = input('');

  readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashOffset = computed(() => {
    const clampedProgress = Math.max(0, Math.min(100, this.progress()));
    return this.circumference() * (1 - clampedProgress / 100);
  });
  readonly center = computed(() => this.size() / 2);
  readonly viewBox = computed(() => `0 0 ${this.size()} ${this.size()}`);
}
