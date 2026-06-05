import { Injectable, inject, ApplicationRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval, concat } from 'rxjs';

/**
 * Handles PWA lifecycle updates.
 *
 * When a new service-worker version is detected (after deploy), this service:
 *   1. Periodically checks for updates (every 30 seconds when the app is in the foreground).
 *   2. Listens for the `versionReady` event from Angular's SwUpdate.
 *   3. Activates the new version immediately and reloads the page so the
 *      homescreen PWA always runs the latest code — not a stale cache.
 *
 * References:
 *   - https://angular.dev/ecosystem/service-workers/communications
 *   - https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);
  private platformId = inject(PLATFORM_ID);

  /**
   * Call once from AppComponent.ngOnInit().
   * Does nothing when SW is not enabled (dev mode / unsupported browser).
   */
  init(): void {
    if (!isPlatformBrowser(this.platformId) || !this.swUpdate.isEnabled) {
      return;
    }

    this.pollForUpdates();
    this.listenForUpdates();
    this.listenForActivation();
  }

  /**
   * Polls the server for a new ngsw manifest every 30 s,
   * but only after the app has stabilised (first render done).
   */
  private pollForUpdates(): void {
    const appIsStable$ = this.appRef.isStable.pipe(first((stable) => stable));
    const everyThirtySeconds$ = interval(30_000);
    const pollWhenStable$ = concat(appIsStable$, everyThirtySeconds$);

    pollWhenStable$.subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        console.warn('[PwaUpdateService] Update check failed:', err);
      }
    });
  }

  /**
   * When a new version is downloaded and ready, activate it
   * and reload the page so the user always sees the latest code.
   */
  private listenForUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async (evt) => {
        console.log(
          `[PwaUpdateService] New version ready — current: ${evt.currentVersion.hash}, latest: ${evt.latestVersion.hash}`,
        );

        // Activate the new SW immediately
        const activated = await this.swUpdate.activateUpdate();
        if (activated) {
          // Reload so the app boots from the fresh cache
          document.location.reload();
        }
      });
  }

  /**
   * Handle unrecoverable state — when the cached assets no longer
   * match what the running app expects, force a full reload.
   */
  private listenForActivation(): void {
    this.swUpdate.unrecoverable.subscribe((evt) => {
      console.error('[PwaUpdateService] Unrecoverable state:', evt.reason);
      document.location.reload();
    });
  }
}
