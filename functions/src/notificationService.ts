import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

// Types
interface NotificationData {
  userId: string;
  type: 'new_event' | 'event_reminder' | 'participant_unavailable' | 'event_deleted';
  title: string;
  message: string;
  eventId?: string;
  read: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

interface TestNotificationRequest {
  userId?: string;
  title?: string;
  message?: string;
  testMode?: boolean;
}

// Fonction pour envoyer une notification push via Expo
async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  message: string,
  data: any = {}
): Promise<void> {
  try {
    const payload = {
      to: expoPushToken,
      sound: 'default',
      title,
      body: message,
      data,
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Expo Push Error: ${result.message || response.statusText}`);
    }

    console.log('✅ [NotificationService] Push notification sent:', result);
  } catch (error) {
    console.error('❌ [NotificationService] Error sending push notification:', error);
    throw error;
  }
}

// Fonction pour obtenir le token push d'un utilisateur
async function getUserPushToken(userId: string): Promise<string | null> {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`⚠️ [NotificationService] User ${userId} not found`);
      return null;
    }

    const userData = userDoc.data();
    const expoPushToken = userData?.expoPushToken;
    
    if (!expoPushToken) {
      console.log(`⚠️ [NotificationService] No push token for user ${userId}`);
      return null;
    }

    return expoPushToken;
  } catch (error) {
    console.error('❌ [NotificationService] Error getting user push token:', error);
    return null;
  }
}

// Fonction appelable pour tester les notifications
export const testNotification = onCall(
  { cors: true },
  async (request) => {
    try {
      console.log('🔄 [testNotification] Starting notification test');
      
      // Vérifier que l'utilisateur est authentifié
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Utilisateur non authentifié');
      }

      const { userId, title, message, testMode } = request.data as TestNotificationRequest;
      
      // Utiliser l'ID de l'utilisateur connecté si non fourni
      const targetUserId = userId || request.auth.uid;
      
      // Paramètres par défaut pour le test
      const testTitle = title || '🧪 Test Notification';
      const testMessage = message || 'Ceci est une notification de test depuis Firebase Functions';
      
      console.log(`📱 [testNotification] Sending test notification to user: ${targetUserId}`);
      
      // Obtenir le token push de l'utilisateur
      const pushToken = await getUserPushToken(targetUserId);
      
      if (!pushToken) {
        return {
          success: false,
          error: 'Aucun token push trouvé pour cet utilisateur',
          userId: targetUserId
        };
      }

      // Créer la notification dans Firestore si ce n'est pas juste un test
      if (!testMode) {
        const db = getFirestore();
        await db.collection('notifications').add({
          userId: targetUserId,
          type: 'new_event',
          title: testTitle,
          message: testMessage,
          read: false,
          createdAt: new Date()
        });
        console.log('✅ [testNotification] Test notification created in Firestore');
      }

      // Envoyer la notification push
      await sendExpoPushNotification(
        pushToken,
        testTitle,
        testMessage,
        { 
          test: true,
          userId: targetUserId,
          timestamp: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Notification de test envoyée avec succès',
        userId: targetUserId,
        pushToken: pushToken.substring(0, 20) + '...' // Masquer le token pour la sécurité
      };

    } catch (error) {
      console.error('❌ [testNotification] Error:', error);
      throw new HttpsError('internal', `Erreur lors de l'envoi de la notification: ${error}`);
    }
  }
);

// Trigger qui s'exécute quand une notification est créée dans Firestore
export const onNotificationCreated = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    try {
      const notificationId = event.params.notificationId;
      const notificationData = event.data?.data() as NotificationData;
      
      console.log(`🔔 [onNotificationCreated] Processing notification ${notificationId}`);
      console.log('📋 [onNotificationCreated] Notification data:', notificationData);
      
      if (!notificationData) {
        console.error('❌ [onNotificationCreated] No notification data found');
        return;
      }

      // Obtenir le token push de l'utilisateur
      const pushToken = await getUserPushToken(notificationData.userId);
      
      if (!pushToken) {
        console.log(`⚠️ [onNotificationCreated] No push token for user ${notificationData.userId}, skipping push notification`);
        return;
      }

      // Préparer les données pour la notification push
      const pushData: any = {
        notificationId,
        type: notificationData.type,
        timestamp: new Date().toISOString()
      };

      // Ajouter l'eventId si disponible
      if (notificationData.eventId) {
        pushData.eventId = notificationData.eventId;
      }

      // Envoyer la notification push
      await sendExpoPushNotification(
        pushToken,
        notificationData.title,
        notificationData.message,
        pushData
      );

      console.log(`✅ [onNotificationCreated] Push notification sent for notification ${notificationId}`);
      
      // Optionnel : Marquer la notification comme envoyée
      try {
        const db = getFirestore();
        await db.collection('notifications').doc(notificationId).update({
          pushSent: true,
          pushSentAt: new Date()
        });
        console.log(`✅ [onNotificationCreated] Notification ${notificationId} marked as sent`);
      } catch (updateError) {
        console.error('⚠️ [onNotificationCreated] Error updating notification status:', updateError);
        // Non-bloquant, on continue même si la mise à jour échoue
      }

    } catch (error) {
      console.error('❌ [onNotificationCreated] Error processing notification:', error);
      // Ne pas relancer l'erreur pour éviter les retry infinis
    }
  }
);