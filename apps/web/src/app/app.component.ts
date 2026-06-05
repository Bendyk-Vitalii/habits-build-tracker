import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ShellComponent } from './layout/shell.component';
import { ActivityService } from './core/services/activity.service';
import { SettingsService } from './core/services/settings.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

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
  private pwaUpdateService = inject(PwaUpdateService);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Start listening for PWA updates (auto-reload on new deploy)
      this.pwaUpdateService.init();
      // Initialize default settings if first launch
      await this.settingsService.initSettings();
      // Seed default activities if database is empty
      await this.activityService.seedDefaultActivities();
    }
  }
}
