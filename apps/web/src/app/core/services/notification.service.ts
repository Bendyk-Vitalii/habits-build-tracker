import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  PushSubscribeRequest,
  PushUnsubscribeRequest,
  VapidKeyResponse,
} from '@habits-tracker/shared';
import { environment } from '../../../environments/environment';

/**
 * Manages browser notifications, Web Push subscriptions, and
 * PWA-install detection.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  // ── Notification permission ───────────────────────────────

  /**
   * Requests notification permission from the user.
   * @returns The resulting permission state.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.requestPermission();
  }

  /**
   * Checks whether notification permission has already been granted.
   */
  isPermissionGranted(): boolean {
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  // ── Push subscription ─────────────────────────────────────

  /**
   * Subscribes the browser to push notifications:
   * 1. Fetches the VAPID public key from the backend.
   * 2. Subscribes via the service worker PushManager.
   * 3. Sends the subscription object to the backend.
   *
   * @param notificationTime Desired notification time "HH:MM".
   */
  async subscribeToPush(notificationTime: string): Promise<void> {
    const registration = await navigator.serviceWorker.ready;

    // 1. Get VAPID public key
    const { publicKey } = await firstValueFrom(
      this.http.get<VapidKeyResponse>(`${environment.apiBaseUrl}/push/vapid-key`),
    );

    // 2. Subscribe via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey) as any,
    });

    // 3. Send subscription to backend
    const payload: PushSubscribeRequest = {
      subscription: subscription.toJSON() as any,
      notificationTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/push/subscribe`, payload));
  }

  /**
   * Unsubscribes from push notifications on both the browser and
   * backend side.
   */
  async unsubscribeFromPush(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const payload: PushUnsubscribeRequest = {
        endpoint: subscription.endpoint,
      };

      await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/push/unsubscribe`, payload));

      await subscription.unsubscribe();
    }
  }

  // ── PWA detection ─────────────────────────────────────────

  /**
   * Checks whether the app is running as an installed PWA.
   * Uses `navigator.standalone` (iOS) and CSS `display-mode` (Android/desktop).
   */
  isInstalledAsPWA(): boolean {
    // iOS Safari
    if ('standalone' in navigator && (navigator as any).standalone) {
      return true;
    }

    // Android / desktop — CSS media query check
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    return false;
  }

  // ── Notification time ─────────────────────────────────────

  /**
   * Sends the updated notification time to the backend so the push
   * schedule can be adjusted.
   *
   * @param time New notification time "HH:MM".
   */
  async updateNotificationTime(time: string): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const payload: PushSubscribeRequest = {
        subscription: subscription.toJSON() as any,
        notificationTime: time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/push/subscribe`, payload));
    }
  }

  // ── helpers ───────────────────────────────────────────────

  /**
   * Converts a URL-safe base64 string to a Uint8Array
   * (required by PushManager.subscribe).
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
