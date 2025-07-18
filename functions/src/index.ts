import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// Initialiser Firebase Admin
initializeApp();
const db = getFirestore();

// Fonction pour envoyer une push notification
async function sendPushNotification(expoPushToken: string, title: string, body: string, eventId?: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { 
      eventId: eventId || null,
      action: eventId ? 'open_event' : 'open_notifications'
    },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('✅ Push notification sent:', await response.json());
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
}

// Déclencheur : Nouvelle notification créée
export const onNotificationCreated = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const notification = snapshot.data();
      console.log('🔔 Nouvelle notification créée:', notification);
      
      // Récupérer le token Expo de l'utilisateur
      const userDoc = await db.collection('users').doc(notification.userId).get();
      if (!userDoc.exists) {
        console.log('❌ Utilisateur non trouvé:', notification.userId);
        return null;
      }

      const userData = userDoc.data();
      const expoPushToken = userData?.expoPushToken;
      
      if (!expoPushToken) {
        console.log('❌ Pas de token Expo pour:', notification.userId);
        return null;
      }

      // Envoyer la push notification
      await sendPushNotification(
        expoPushToken,
        notification.title,
        notification.message,
        notification.eventId
      );
      
      return null;
    } catch (error) {
      console.error('❌ Erreur dans onNotificationCreated:', error);
      return null;
    }
  }
);

export const testNotification = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new Error('Vous devez être connecté');
    }

    console.log('Test notification pour:', request.auth.uid);
    
    return { success: true, message: 'Test réussi avec firebase-functions v6' };
  } catch (error) {
    console.error('❌ Erreur dans testNotification:', error);
    throw new Error('Erreur lors du test');
  }
});