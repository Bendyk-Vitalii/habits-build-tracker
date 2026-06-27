import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  OnDestroy,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FlashcardItem } from '@habits-tracker/shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-flashcard-block',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './flashcard-block.component.html',
  styleUrl: './flashcard-block.component.scss',
})
export class FlashcardBlockComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  readonly flashcards = input.required<FlashcardItem[]>();
  readonly title = input<string>('');

  readonly currentIndex = signal(0);
  readonly isFlipped = signal(false);
  readonly isFullscreen = signal(false);

  /** Track which cards user marked as "known" */
  readonly knownCards = signal<Set<number>>(new Set());

  readonly progress = computed(() => {
    const total = this.flashcards().length;
    const known = this.knownCards().size;
    return { current: this.currentIndex() + 1, total, known };
  });

  readonly currentCard = computed(() => {
    const cards = this.flashcards();
    const idx = this.currentIndex();
    return cards[idx] ?? null;
  });

  readonly progressPercent = computed(() => {
    const total = this.flashcards().length;
    if (total === 0) return 0;
    return Math.round((this.knownCards().size / total) * 100);
  });

  toggleFlip(): void {
    this.isFlipped.update((f) => !f);
  }

  nextCard(): void {
    const total = this.flashcards().length;
    if (this.currentIndex() < total - 1) {
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

  markKnown(): void {
    this.knownCards.update((set) => {
      const updated = new Set(set);
      updated.add(this.currentIndex());
      return updated;
    });
    this.nextCard();
  }

  markStudyAgain(): void {
    this.knownCards.update((set) => {
      const updated = new Set(set);
      updated.delete(this.currentIndex());
      return updated;
    });
    this.nextCard();
  }

  enterFullscreen(): void {
    this.isFullscreen.set(true);
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.document.body.classList.add('hide-layout-nav');
  }

  exitFullscreen(): void {
    this.isFullscreen.set(false);
    this.document.body.classList.remove('hide-layout-nav');
  }

  isCardKnown(index: number): boolean {
    return this.knownCards().has(index);
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('hide-layout-nav');
  }
}
