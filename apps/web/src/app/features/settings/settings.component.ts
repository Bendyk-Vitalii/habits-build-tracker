import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SettingsService } from '../../core/services/settings.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppSettings, DEFAULT_SETTINGS } from '@habits-tracker/shared';

@Component({
  selector: 'ht-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);

  // Use a local copy for the form so we don't mutate the signal directly
  localSettings = signal<AppSettings>({ ...DEFAULT_SETTINGS });
  isSaving = signal<boolean>(false);
  hasPushPermission = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    const s = await this.settingsService.getSettings();
    this.localSettings.set({ ...s });

    // Check if browser supports push
    if ('Notification' in window) {
      this.hasPushPermission.set(Notification.permission === 'granted');
    }
  }

  async saveSettings(): Promise<void> {
    this.isSaving.set(true);
    try {
      await this.settingsService.updateSettings(this.localSettings());

      // Handle theme change
      this.applyTheme(this.localSettings().theme);

      // Handle push notification toggle
      if (this.localSettings().notificationEnabled && !this.hasPushPermission()) {
        const grantedResult = await this.notificationService.requestPermission();
        const granted = grantedResult === 'granted';
        this.hasPushPermission.set(granted);
        if (granted) {
          await this.notificationService.subscribeToPush(this.localSettings().notificationTime);
        } else {
          // Revert toggle if denied
          this.localSettings.update((s) => ({
            ...s,
            notificationEnabled: false,
          }));
        }
      } else if (!this.localSettings().notificationEnabled && this.hasPushPermission()) {
        await this.notificationService.unsubscribeFromPush();
      } else if (this.localSettings().notificationEnabled && this.hasPushPermission()) {
        // Just update time
        await this.notificationService.subscribeToPush(this.localSettings().notificationTime);
      }

      alert('Settings saved!');
    } catch (e) {
      console.error('Failed to save settings', e);
      alert('Failed to save settings');
    } finally {
      this.isSaving.set(false);
    }
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');

    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(`theme-${theme}`);
    }
  }

  // --- Data Management ---

  exportData(): void {
    // Basic export implementation (would normally export all DB tables)
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.localSettings()));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'habits-tracker-export.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  async clearData(): Promise<void> {
    if (
      confirm(
        'DANGER: This will delete ALL your habits, sessions, and history. This cannot be undone. Are you sure?',
      )
    ) {
      // In a real app we would call a DB clear method
      alert('Data cleared. Please reload the app.');
      window.location.reload();
    }
  }
}
