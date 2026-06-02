import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';

/**
 * Cloud Scheduler function — runs every minute between 6 PM and 11 PM UTC.
 * Queries Firestore for subscriptions whose notificationTime matches the current
 * time in their timezone, and sends push notifications if not already tracked today.
 *
 * Schedule: every 1 minute, 18:00–23:00 UTC (covers most EU/US timezones for evening notifications)
 */
export const sendScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes from 18:00 to 23:00')
  .timeZone('UTC')
  .onRun(async () => {
    const now = new Date();
    const db = admin.firestore();

    // Get VAPID keys
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@habits-tracker.app';

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not configured, skipping notifications');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Get all subscriptions
    const snapshot = await db.collection('pushSubscriptions').get();

    if (snapshot.empty) {
      return;
    }

    const today = now.toISOString().split('T')[0];
    const promises: Promise<void>[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Skip if already tracked today
      if (data.trackedToday && data.trackedDate === today) {
        continue;
      }

      // Skip if already notified today
      if (data.lastNotifiedAt) {
        const lastNotified = data.lastNotifiedAt.toDate
          ? data.lastNotifiedAt.toDate()
          : new Date(data.lastNotifiedAt);
        if (lastNotified.toISOString().split('T')[0] === today) {
          continue;
        }
      }

      // Check if current time matches the user's notification time in their timezone
      const userTime = data.notificationTime || '21:00';
      const userTimezone = data.timezone || 'UTC';

      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        const currentTimeInUserTz = formatter.format(now);
        // Format to HH:MM
        const [hours, minutes] = currentTimeInUserTz.split(':');
        const currentHHMM = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

        if (currentHHMM !== userTime) {
          continue;
        }
      } catch {
        // Invalid timezone, skip
        continue;
      }

      // Send notification
      const pushSubscription = {
        endpoint: data.endpoint,
        keys: data.keys,
      };

      const payload = JSON.stringify({
        title: 'Time to reflect! 🌙',
        body: 'Tap to track your daily progress and keep your streaks alive.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: '/dashboard',
          type: 'daily_reminder',
        },
      });

      const promise = webpush
        .sendNotification(pushSubscription as webpush.PushSubscription, payload)
        .then(async () => {
          // Update lastNotifiedAt
          await doc.ref.update({
            lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        })
        .catch(async (error: { statusCode?: number }) => {
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or invalid — remove it
            console.log(`Removing expired subscription: ${doc.id}`);
            await doc.ref.delete();
          } else {
            console.error(`Failed to send notification to ${doc.id}:`, error);
          }
        });

      promises.push(promise);
    }

    await Promise.allSettled(promises);

    // Reset trackedToday flag at midnight UTC (for the next day)
    const currentUTCHour = now.getUTCHours();
    const currentUTCMinute = now.getUTCMinutes();

    if (currentUTCHour === 0 && currentUTCMinute === 0) {
      const resetPromises = snapshot.docs.map((doc) =>
        doc.ref.update({ trackedToday: false, trackedDate: null })
      );
      await Promise.allSettled(resetPromises);
    }
  });
