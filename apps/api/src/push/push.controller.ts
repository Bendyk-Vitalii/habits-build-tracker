import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';
import cors from 'cors';

const corsMiddleware = cors({ origin: true });

// Get VAPID keys from environment
function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@habits-tracker.app';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured. Run: npx web-push generate-vapid-keys');
  }

  return { publicKey, privateKey, subject };
}

/**
 * POST /api/push/subscribe
 * Store a push subscription in Firestore
 */
export const pushSubscribe = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { subscription, notificationTime, timezone } = req.body;

      if (!subscription?.endpoint) {
        res.status(400).json({ error: 'Invalid subscription: missing endpoint' });
        return;
      }

      const db = admin.firestore();
      const docRef = db
        .collection('pushSubscriptions')
        .doc(Buffer.from(subscription.endpoint).toString('base64url').slice(0, 128));

      await docRef.set({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        notificationTime: notificationTime || '21:00',
        timezone: timezone || 'Europe/Kiev',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastNotifiedAt: null,
        trackedToday: false,
        trackedDate: null,
      });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Push subscribe error:', error);
      res.status(500).json({ error: 'Failed to store subscription' });
    }
  });
});

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription from Firestore
 */
export const pushUnsubscribe = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json({ error: 'Missing endpoint' });
        return;
      }

      const db = admin.firestore();
      const docId = Buffer.from(endpoint).toString('base64url').slice(0, 128);
      await db.collection('pushSubscriptions').doc(docId).delete();

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });
});

/**
 * POST /api/push/tracked
 * Mark that the user has tracked today (skip notification)
 */
export const pushTracked = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { endpoint, date } = req.body;

      if (!endpoint) {
        res.status(400).json({ error: 'Missing endpoint' });
        return;
      }

      const db = admin.firestore();
      const docId = Buffer.from(endpoint).toString('base64url').slice(0, 128);

      await db
        .collection('pushSubscriptions')
        .doc(docId)
        .update({
          trackedToday: true,
          trackedDate: date || new Date().toISOString().split('T')[0],
        });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Push tracked error:', error);
      res.status(500).json({ error: 'Failed to update tracking status' });
    }
  });
});

/**
 * GET /api/push/vapid-key
 * Return the public VAPID key for client-side push subscription
 */
export const getVapidKey = functions.https.onRequest((req, res) => {
  corsMiddleware(req, res, () => {
    try {
      const { publicKey } = getVapidKeys();
      res.status(200).json({ publicKey });
    } catch (error) {
      console.error('VAPID key error:', error);
      res.status(500).json({ error: 'VAPID keys not configured' });
    }
  });
});
