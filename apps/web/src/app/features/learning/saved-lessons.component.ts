import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { SavedLesson, LessonDifficulty } from '@habits-tracker/shared';
import { LearningService } from '../../core/services/learning.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-saved-lessons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatRippleModule, FormsModule, TitleCasePipe],
  templateUrl: './saved-lessons.component.html',
  styleUrl: './saved-lessons.component.scss',
})
export class SavedLessonsComponent implements OnInit {
  private learningService = inject(LearningService);
  private router = inject(Router);

  lessons = signal<SavedLesson[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedDifficulty = signal<'all' | LessonDifficulty>('all');

  filteredLessons = computed(() => {
    let result = this.lessons();
    const query = this.searchQuery().toLowerCase().trim();
    const difficulty = this.selectedDifficulty();

    if (query) {
      result = result.filter(
        (l) => l.title.toLowerCase().includes(query) || l.topicName.toLowerCase().includes(query),
      );
    }

    if (difficulty !== 'all') {
      result = result.filter((l) => l.difficulty === difficulty);
    }

    return result;
  });

  uniqueTopics = computed(() => {
    const names = this.lessons().map((l) => l.topicName);
    return [...new Set(names)];
  });

  ngOnInit(): void {
    this.loadLessons();
  }

  private async loadLessons(): Promise<void> {
    this.isLoading.set(true);
    try {
      const saved = await this.learningService.getSavedLessons();
      this.lessons.set(saved);
    } catch (err) {
      console.error('Failed to load saved lessons', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  openLesson(id: string): void {
    this.router.navigate(['/learn/saved', id]);
  }

  async deleteSavedLesson(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.learningService.deleteSavedLesson(id);
      this.lessons.update((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Failed to delete saved lesson', err);
    }
  }

  goBack(): void {
    this.router.navigate(['/learn']);
  }

  setDifficulty(level: string): void {
    this.selectedDifficulty.set(level as 'all' | LessonDifficulty);
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
