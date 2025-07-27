import { initializeApp } from 'firebase-admin/app';

// Initialiser Firebase Admin
initializeApp();

// Importer et exporter les fonctions
export { sendVerificationEmail } from './emailService';
export { testNotification, onNotificationCreated } from './notificationService';
export { scheduledCleanup, manualCleanup } from './cleanupService';