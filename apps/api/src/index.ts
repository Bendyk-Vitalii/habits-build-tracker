import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Cloud Functions
export { pushSubscribe, pushUnsubscribe, pushTracked, getVapidKey } from './push/push.controller';
export { sendScheduledNotifications } from './push/notification.scheduler';
export { aiSuggest } from './ai/ai.controller';
