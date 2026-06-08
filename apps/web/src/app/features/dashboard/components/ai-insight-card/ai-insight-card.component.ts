import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiSuggestionService } from '../../../../core/services/ai-suggestion.service';
import { AiSuggestResponse } from '@habits-tracker/shared';
import { MatRippleModule } from '@angular/material/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-ai-insight-card',
  standalone: true,
  imports: [CommonModule, MatRippleModule],
  templateUrl: './ai-insight-card.component.html',
  styleUrl: './ai-insight-card.component.scss',
})
export class AiInsightCardComponent implements OnInit {
  private aiService = inject(AiSuggestionService);

  suggestion = signal<AiSuggestResponse | null>(null);
  isLoading = signal<boolean>(true);
  isExpanded = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    try {
      this.isLoading.set(true);
      const res = await this.aiService.getSuggestion('on_demand');
      this.suggestion.set(res);
    } catch (e) {
      console.error('Failed to get AI insight', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleExpand(): void {
    this.isExpanded.update((v) => !v);
  }
}
