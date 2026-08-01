import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SavedFlashcard } from '@habits-tracker/shared';
import { LearningService } from '../../core/services/learning.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-saved-flashcards',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, KeyValuePipe],
  templateUrl: './saved-flashcards.component.html',
  styleUrl: './saved-flashcards.component.scss',
})
export class SavedFlashcardsComponent implements OnInit, OnDestroy {
  private learningService = inject(LearningService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  isLoading = signal(true);
  flashcards = signal<SavedFlashcard[]>([]);

  // Grouped by topicName
  groupedCards = computed(() => {
    const cards = this.flashcards();
    const groups: Record<string, SavedFlashcard[]> = {};
    for (const card of cards) {
      if (!groups[card.topicName]) {
        groups[card.topicName] = [];
      }
      groups[card.topicName].push(card);
    }
    return groups;
  });

  // Review State
  activeReviewTopic = signal<string | null>(null);
  reviewCards = computed(() => {
    const topic = this.activeReviewTopic();
    if (!topic) return [];
    return this.groupedCards()[topic] || [];
  });

  currentIndex = signal(0);
  isFlipped = signal(false);

  // Track cards deleted during this session so we don't fetch from DB repeatedly
  deletedCardIds = signal<Set<string>>(new Set());

  // Filtered review cards (removing ones we just deleted)
  currentReviewList = computed(() => {
    const deleted = this.deletedCardIds();
    return this.reviewCards().filter((c) => !deleted.has(c.id!));
  });

  currentCard = computed(() => {
    const list = this.currentReviewList();
    const idx = this.currentIndex();
    return list[idx] ?? null;
  });

  progressPercent = computed(() => {
    const total = this.reviewCards().length;
    if (total === 0) return 0;
    const deleted = this.deletedCardIds().size;
    return Math.round((deleted / total) * 100);
  });

  ngOnInit(): void {
    this.loadFlashcards();
  }

  ngOnDestroy(): void {
    this.exitReview();
  }

  async loadFlashcards(): Promise<void> {
    this.isLoading.set(true);
    try {
      const cards = await this.learningService.getSavedFlashcards();
      this.flashcards.set(cards);
    } catch (err) {
      console.error('Failed to load flashcards', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/learn']);
  }

  startReview(topicName: string): void {
    this.activeReviewTopic.set(topicName);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.deletedCardIds.set(new Set());
    this.document.body.classList.add('hide-layout-nav');
  }

  exitReview(): void {
    // If we deleted cards, refresh the list to permanently remove them from the UI groups
    if (this.deletedCardIds().size > 0 && this.activeReviewTopic()) {
      const deleted = this.deletedCardIds();
      this.flashcards.update((cards) => cards.filter((c) => !deleted.has(c.id!)));
    }
    this.activeReviewTopic.set(null);
    this.document.body.classList.remove('hide-layout-nav');
  }

  toggleFlip(): void {
    this.isFlipped.update((f) => !f);
  }

  nextCard(): void {
    const list = this.currentReviewList();
    if (this.currentIndex() < list.length - 1) {
      this.currentIndex.update((i) => i + 1);
      this.isFlipped.set(false);
    }
  }

  prevCard(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
      this.isFlipped.set(false);
    }
  }

  async markKnown(card: SavedFlashcard): Promise<void> {
    if (!card.id) return;

    // Add to local deleted set
    this.deletedCardIds.update((set) => {
      const updated = new Set(set);
      updated.add(card.id!);
      return updated;
    });

    // We don't advance the index because the array just shrunk,
    // so the element at currentIndex is now the *next* card.
    // However, if we were at the end of the list, we might need to decrement index.
    const remainingCount = this.currentReviewList().length;
    if (this.currentIndex() >= remainingCount && remainingCount > 0) {
      this.currentIndex.set(remainingCount - 1);
    }

    this.isFlipped.set(false);

    try {
      await this.learningService.deleteSavedFlashcard(card.id);
    } catch (err) {
      console.error('Failed to delete flashcard', err);
      // Ideally, revert the deletion from the Set on failure, but for UX optimism is fine.
    }
  }
}
