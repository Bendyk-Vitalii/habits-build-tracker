import { Injectable, Signal, PLATFORM_ID, inject, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore, setDoc, updateDoc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { AppSettings, DEFAULT_SETTINGS } from '@habits-tracker/shared';
import { userDoc } from '../db/firestore.helpers';
import { AuthService } from './auth.service';

/**
 * Manages application-wide settings persisted in Firestore.
 *
 * Settings are stored as a single document at `users/{uid}/settings/default`.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private platformId = inject(PLATFORM_ID);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private _settings = signal<AppSettings | undefined>(undefined);
  private unsubscribe: (() => void) | null = null;

  /** Reactive signal that mirrors the current settings from Firestore. */
  readonly settings: Signal<AppSettings | undefined> = this._settings.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const uid = this.authService.uid();
        if (!uid) return;

        this.unsubscribe?.();

        const docRef = userDoc(this.firestore, uid, 'settings', 'default');
        this.unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            this._settings.set({ ...snapshot.data(), id: 1 } as AppSettings);
          } else {
            this._settings.set(undefined);
          }
        });
      });
    }
  }

  /**
   * Returns the current settings. If no settings doc exists yet,
   * initialises with `DEFAULT_SETTINGS` first.
   */
  async getSettings(): Promise<AppSettings> {
    const uid = this.authService.uid();
    if (!uid) return { ...DEFAULT_SETTINGS, id: 1 } as AppSettings;

    const docRef = userDoc(this.firestore, uid, 'settings', 'default');
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { ...snapshot.data(), id: 1 } as AppSettings;
    }
    return this.initSettings();
  }

  /**
   * Merges a partial update into the persisted settings.
   */
  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    const uid = this.authService.uid();
    if (!uid) return;

    // Ensure settings exist first
    await this.getSettings();

    const docRef = userDoc(this.firestore, uid, 'settings', 'default');
    const { id, ...data } = partial as any;
    await updateDoc(docRef, data);
  }

  /**
   * Ensures a settings doc exists in Firestore.
   * Creates one from `DEFAULT_SETTINGS` if none is found.
   */
  async initSettings(): Promise<AppSettings> {
    const uid = this.authService.uid();
    if (!uid) return { ...DEFAULT_SETTINGS, id: 1 } as AppSettings;

    const docRef = userDoc(this.firestore, uid, 'settings', 'default');
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { ...snapshot.data(), id: 1 } as AppSettings;
    }

    const { id, ...settingsData } = DEFAULT_SETTINGS as any;
    await setDoc(docRef, settingsData);
    return { ...DEFAULT_SETTINGS, id: 1 } as AppSettings;
  }
}
