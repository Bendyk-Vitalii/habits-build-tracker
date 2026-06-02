import * as webpush from 'web-push';

/**
 * Generate VAPID keys for web push notifications.
 * Run this once: `npx ts-node apps/api/src/push/vapid.ts`
 * Then add the keys to your .env file.
 */
function generateVapidKeys(): void {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('=== VAPID Keys Generated ===');
  console.log('Add these to your apps/api/.env file:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
  console.log('\n============================');
}

// Run if executed directly
if (require.main === module) {
  generateVapidKeys();
}

export { generateVapidKeys };
