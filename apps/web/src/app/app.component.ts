import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ShellComponent } from './layout/shell.component';
import { ActivityService } from './core/services/activity.service';
import { SettingsService } from './core/services/settings.service';

@Component({
  selector: 'ht-root',
  standalone: true,
  imports: [ShellComponent],
  template: '<ht-shell />',
  styles: [':host { display: block; height: 100%; }'],
})
export class AppComponent implements OnInit {
  private activityService = inject(ActivityService);
  private settingsService = inject(SettingsService);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize default settings if first launch
      await this.settingsService.initSettings();
      // Seed default activities if database is empty
      await this.activityService.seedDefaultActivities();
    }
  }
}
