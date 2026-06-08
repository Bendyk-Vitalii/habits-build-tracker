import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavTab {
  route: string;
  icon: string;
  label: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  readonly tabs: NavTab[] = [
    { route: '/dashboard', icon: 'home', label: 'Home' },
    { route: '/activities', icon: 'checklist', label: 'Activities' },
    { route: '/timer', icon: 'timer', label: 'Timer' },
    { route: '/tasks', icon: 'task_alt', label: 'Tasks' },
    { route: '/progress', icon: 'bar_chart', label: 'Progress' },
    { route: '/settings', icon: 'settings', label: 'Settings' },
  ];
}
