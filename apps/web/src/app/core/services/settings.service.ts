import { Injectable, Signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of } from 'rxjs';
import { liveQuery } from 'dexie';
import { AppSettings, DEFAULT_SETTINGS } from '@habits-tracker/shared';
import { db } from '../db/app.database';

/**
 * Manages application-wide settings persisted in IndexedDB.
 *
 * The reactive `settings` signal automatically updates whenever the
 * underlying `appSettings` table changes thanks to Dexie `liveQuery`.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private platformId = inject(PLATFORM_ID);

  /** Reactive signal that mirrors the current settings row from IndexedDB. */
  readonly settings: Signal<AppSettings | undefined> = toSignal(
    isPlatformBrowser(this.platformId)
      ? from(liveQuery(() => db.appSettings.toCollection().first()))
      : of(undefined)
  );

  /**
   * Returns the current settings. If no settings row exists yet,
   * initialises with `DEFAULT_SETTINGS` first.
   */
  async getSettings(): Promise<AppSettings> {
    const existing = await db.appSettings.toCollection().first();
    if (existing) {
      return existing;
    }
    return this.initSettings();
  }

  /**
   * Merges a partial update into the persisted settings.
   * @param partial Fields to update.
   */
  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    const settings = await this.getSettings();
    await db.appSettings.update(settings.id!, partial);
  }

  /**
   * Ensures a settings row exists in the database.
   * Creates one from `DEFAULT_SETTINGS` if none is found.
   * Should be called once on application bootstrap.
   */
  async initSettings(): Promise<AppSettings> {
    const existing = await db.appSettings.toCollection().first();
    if (existing) {
      return existing;
    }
    const id = await db.appSettings.add({ ...DEFAULT_SETTINGS } as AppSettings);
    return { ...DEFAULT_SETTINGS, id } as AppSettings;
  }
}
