import { Component, ChangeDetectionStrategy, input, signal, computed, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatchPair } from '@habits-tracker/shared';

interface MatchItem {
  text: string;
  side: 'left' | 'right';
  originalIndex: number;
  isMatched: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-matching-block',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './matching-block.component.html',
  styleUrl: './matching-block.component.scss',
})
export class MatchingBlockComponent implements OnInit {
  readonly pairs = input.required<MatchPair[]>();
  readonly title = input<string>('');

  readonly leftItems = signal<MatchItem[]>([]);
  readonly rightItems = signal<MatchItem[]>([]);
  readonly selectedLeft = signal<number | null>(null);
  readonly selectedRight = signal<number | null>(null);
  readonly matchedPairs = signal<Set<number>>(new Set());
  readonly incorrectFlash = signal<{ left: number; right: number } | null>(null);

  readonly isComplete = computed(() => {
    return this.matchedPairs().size === this.pairs().length;
  });

  readonly score = computed(() => {
    return { matched: this.matchedPairs().size, total: this.pairs().length };
  });

  ngOnInit(): void {
    this.initItems();
  }

  private initItems(): void {
    const p = this.pairs();
    // Left items in original order
    this.leftItems.set(
      p.map((pair, i) => ({
        text: pair.left,
        side: 'left' as const,
        originalIndex: i,
        isMatched: false,
      })),
    );
    // Right items shuffled
    const shuffled = p
      .map((pair, i) => ({
        text: pair.right,
        side: 'right' as const,
        originalIndex: i,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);
    this.rightItems.set(shuffled);
  }

  selectLeft(index: number): void {
    const item = this.leftItems()[index];
    if (item.isMatched) return;

    this.selectedLeft.set(index);

    // Check if right is also selected
    const rightIdx = this.selectedRight();
    if (rightIdx !== null) {
      this.checkMatch(index, rightIdx);
    }
  }

  selectRight(index: number): void {
    const item = this.rightItems()[index];
    if (item.isMatched) return;

    this.selectedRight.set(index);

    // Check if left is also selected
    const leftIdx = this.selectedLeft();
    if (leftIdx !== null) {
      this.checkMatch(leftIdx, index);
    }
  }

  private checkMatch(leftIdx: number, rightIdx: number): void {
    const left = this.leftItems()[leftIdx];
    const right = this.rightItems()[rightIdx];

    if (left.originalIndex === right.originalIndex) {
      // Correct match!
      this.matchedPairs.update((set) => {
        const updated = new Set(set);
        updated.add(left.originalIndex);
        return updated;
      });

      this.leftItems.update((items) => {
        const updated = [...items];
        updated[leftIdx] = { ...updated[leftIdx], isMatched: true };
        return updated;
      });

      this.rightItems.update((items) => {
        const updated = [...items];
        updated[rightIdx] = { ...updated[rightIdx], isMatched: true };
        return updated;
      });
    } else {
      // Incorrect — flash red
      this.incorrectFlash.set({ left: leftIdx, right: rightIdx });
      setTimeout(() => this.incorrectFlash.set(null), 600);
    }

    // Clear selections
    this.selectedLeft.set(null);
    this.selectedRight.set(null);
  }

  retry(): void {
    this.matchedPairs.set(new Set());
    this.selectedLeft.set(null);
    this.selectedRight.set(null);
    this.incorrectFlash.set(null);
    this.initItems();
  }

  isLeftSelected(index: number): boolean {
    return this.selectedLeft() === index;
  }

  isRightSelected(index: number): boolean {
    return this.selectedRight() === index;
  }

  isLeftIncorrect(index: number): boolean {
    return this.incorrectFlash()?.left === index;
  }

  isRightIncorrect(index: number): boolean {
    return this.incorrectFlash()?.right === index;
  }
}
