import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TaskService } from '../../core/services/task.service';
import { TaskPriority } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-tasks',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private taskService = inject(TaskService);

  // Signals for state
  tasks = this.taskService.tasks;
  completedTasks = this.taskService.completedTasks;
  showCompleted = signal(false);

  // Form state
  newTaskTitle = signal('');
  newTaskPriority = signal<TaskPriority>('medium');

  async addTask() {
    const title = this.newTaskTitle().trim();
    if (!title) return;

    await this.taskService.addTask(title, this.newTaskPriority());
    this.newTaskTitle.set('');
    this.newTaskPriority.set('medium');
  }

  async toggleTaskCompletion(id: number) {
    await this.taskService.toggleComplete(id);
  }

  async deleteTask(id: number) {
    await this.taskService.deleteTask(id);
  }

  toggleCompletedSection() {
    this.showCompleted.update((v) => !v);
  }
}
