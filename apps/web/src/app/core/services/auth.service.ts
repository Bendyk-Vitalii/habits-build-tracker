import { Injectable, Signal, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, signInAnonymously, onAuthStateChanged, User } from '@angular/fire/auth';

/**
 * Manages Firebase Anonymous Authentication.
 *
 * On initialisation, silently signs in the user anonymously so they
 * get a stable UID.  All Firestore paths are scoped under this UID.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);

  private _user = signal<User | null>(null);
  private _ready = signal(false);

  /** Current Firebase user (null until auth settles). */
  readonly user: Signal<User | null> = this._user.asReadonly();

  /** True once the auth state has been determined. */
  readonly ready: Signal<boolean> = this._ready.asReadonly();

  /** Shorthand for the current user's UID. Empty string if not yet authed. */
  readonly uid: Signal<string> = computed(() => this._user()?.uid ?? '');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          this._user.set(user);
          this._ready.set(true);
        } else {
          // No user → sign in anonymously
          try {
            const cred = await signInAnonymously(this.auth);
            this._user.set(cred.user);
          } catch (err) {
            console.error('[AuthService] Anonymous sign-in failed:', err);
          }
          this._ready.set(true);
        }
      });
    } else {
      // SSR — mark ready immediately with no user
      this._ready.set(true);
    }
  }
}
