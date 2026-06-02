import { Component, OnInit, inject } from '@angular/core';
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

  async ngOnInit(): Promise<void> {
    // Initialize default settings if first launch
    await this.settingsService.initSettings();
    // Seed default activities if database is empty
    await this.activityService.seedDefaultActivities();
  }
}
