import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-star-rating',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="star-rating" [class.readonly]="readonly()">
      @for (star of stars; track star) {
        <mat-icon
          class="star"
          [class.filled]="star <= displayRating()"
          (mouseenter)="onHover(star)"
          (mouseleave)="onLeave()"
          (click)="onSelect(star)"
        >
          {{ star <= displayRating() ? 'star' : 'star_border' }}
        </mat-icon>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .star-rating {
        display: flex;
        gap: 2px;
        align-items: center;
      }

      .star {
        cursor: pointer;
        color: var(--ht-text-secondary, #aaa);
        transition:
          color var(--ht-transition-fast, 150ms) ease,
          transform var(--ht-transition-fast, 150ms) ease;
        font-size: 24px;
        width: 24px;
        height: 24px;
        user-select: none;

        &:hover {
          transform: scale(1.15);
        }

        &.filled {
          color: var(--ht-warning, #ffa726);
        }
      }

      .readonly .star {
        cursor: default;
        pointer-events: none;

        &.filled {
          color: var(--ht-warning, #ffa726);
        }
      }
    `,
  ],
})
export class StarRatingComponent {
  readonly rating = input<number>(0);
  readonly readonly = input<boolean>(false);
  readonly ratingChange = output<number>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly hoveredStar = signal<number>(0);

  readonly displayRating = computed(() => {
    const hovered = this.hoveredStar();
    return hovered > 0 ? hovered : this.rating();
  });

  onHover(star: number): void {
    if (!this.readonly()) {
      this.hoveredStar.set(star);
    }
  }

  onLeave(): void {
    this.hoveredStar.set(0);
  }

  onSelect(star: number): void {
    if (!this.readonly()) {
      this.ratingChange.emit(star);
    }
  }
}
