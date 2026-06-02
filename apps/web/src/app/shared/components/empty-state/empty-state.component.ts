import { Component, input } from '@angular/core';

@Component({
  selector: 'ht-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('info');
  readonly title = input('');
  readonly message = input('');
}
