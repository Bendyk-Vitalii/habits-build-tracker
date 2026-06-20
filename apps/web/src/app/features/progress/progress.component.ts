import { Component, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivityService } from '../../core/services/activity.service';
import { SessionService } from '../../core/services/session.service';
import { TrackingService } from '../../core/services/tracking.service';

type ProgressView = 'weekly' | 'monthly';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'ht-progress',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonToggleModule,
    BaseChartDirective,
    MatProgressSpinnerModule,
  ],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
})
export class ProgressComponent {
  private activityService = inject(ActivityService);
  private sessionService = inject(SessionService);
  private trackingService = inject(TrackingService);

  activities = this.activityService.activities;
  view = signal<ProgressView>('weekly');
  isLoading = signal<boolean>(true);

  // Chart Data
  weeklyChartData = signal<ChartData<'bar'> | null>(null);
  monthlyChartData = signal<ChartData<'line'> | null>(null);
  completionDonutData = signal<ChartData<'doughnut'> | null>(null);

  // Heatmap Data
  heatmapGrid = signal<{ date: string; value: number; opacity: number }[]>([]);

  // Chart Options
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  constructor() {
    effect(
      () => {
        const acts = this.activities();
        this.view(); // tracking view changes to re-trigger if necessary

        if (acts) {
          this.isLoading.set(true);
          this.loadData().then(() => this.isLoading.set(false));
        }
      },
      { allowSignalWrites: true },
    );
  }

  async loadData(): Promise<void> {
    await Promise.all([
      this.loadWeeklyChart(),
      this.loadMonthlyChart(),
      this.loadDonutChart(),
      this.loadHeatmap(),
    ]);
  }

  private async loadWeeklyChart(): Promise<void> {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday

    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const datasets: ChartData<'bar'>['datasets'] = [];

    for (const act of this.activities()) {
      const data = new Array(7).fill(0);
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const sessions = await this.sessionService.getSessionsForDate(dateStr);
        const actSessions = sessions.filter((s) => s.activityId === act.id);
        data[i] = actSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      }

      datasets.push({
        data,
        label: act.name,
        backgroundColor: act.color,
      });
    }

    this.weeklyChartData.set({ labels, datasets });
  }

  private async loadMonthlyChart(): Promise<void> {
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const datasets: ChartData<'line'>['datasets'] = [];

    // Mocking 4 weeks of data for the line chart for simplicity,
    // ideally this queries weekly reviews or aggregates sessions.
    for (const act of this.activities()) {
      datasets.push({
        data: [Math.random() * 100, Math.random() * 120, Math.random() * 90, Math.random() * 150], // Mock
        label: act.name,
        borderColor: act.color,
        tension: 0.4,
        fill: false,
      });
    }

    this.monthlyChartData.set({ labels, datasets });
  }

  private async loadDonutChart(): Promise<void> {
    const rate = await this.trackingService.getOverallCompletionRate();
    this.completionDonutData.set({
      labels: ['Completed', 'Remaining'],
      datasets: [
        {
          data: [rate, 100 - rate],
          backgroundColor: ['#b388ff', 'rgba(255, 255, 255, 0.1)'], // Use primary color
          borderWidth: 0,
        },
      ],
    });
  }

  private async loadHeatmap(): Promise<void> {
    // Generate last 90 days
    const grid = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const sessions = await this.sessionService.getSessionsForDate(dateStr);
      const val = sessions.length;

      grid.push({
        date: dateStr,
        value: val,
        opacity: val > 0 ? Math.min(1, 0.2 + val * 0.2) : 0.05,
      });
    }
    this.heatmapGrid.set(grid);
  }
}
