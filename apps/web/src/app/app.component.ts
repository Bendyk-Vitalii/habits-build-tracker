import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ShellComponent } from './layout/shell.component';
import { ActivityService } from './core/services/activity.service';
import { SettingsService } from './core/services/settings.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { AuthService } from './core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

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
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private initialized = false;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      // Wait for auth to settle, then initialize data
      effect(async () => {
        const ready = this.authService.ready();
        const uid = this.authService.uid();
        if (ready && uid && !this.initialized) {
          this.initialized = true;
          await this.settingsService.initSettings();
          await this.activityService.seedDefaultActivities();
        }
      });
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Start listening for PWA updates (auto-reload on new deploy)
      this.pwaUpdateService.init();
    }
  }
}
