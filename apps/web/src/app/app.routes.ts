import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'activities',
    loadComponent: () =>
      import('./features/activities/activity-list.component').then((m) => m.ActivityListComponent),
  },
  {
    path: 'activities/:id',
    loadComponent: () =>
      import('./features/activities/activity-detail.component').then(
        (m) => m.ActivityDetailComponent,
      ),
  },
  {
    path: 'timer',
    loadComponent: () => import('./features/timer/timer.component').then((m) => m.TimerComponent),
  },
  {
    path: 'tasks',
    loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
  },
  {
    path: 'progress',
    loadComponent: () =>
      import('./features/progress/progress.component').then((m) => m.ProgressComponent),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./features/reviews/weekly-review.component').then((m) => m.WeeklyReviewComponent),
  },
  {
    path: 'reviews/monthly',
    loadComponent: () =>
      import('./features/reviews/monthly-review.component').then((m) => m.MonthlyReviewComponent),
  },
  {
    path: 'learn',
    loadComponent: () =>
      import('./features/learning/learning.component').then((m) => m.LearningComponent),
  },
  {
    path: 'learn/session/:topicId',
    loadComponent: () =>
      import('./features/learning/learning-session.component').then(
        (m) => m.LearningSessionComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
