import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ht-star-rating',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
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
