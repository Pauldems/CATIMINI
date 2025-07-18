const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialiser Firebase Admin
initializeApp();
const db = getFirestore();

// Version minimale pour tester le déploiement
exports.onNotificationCreated = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const notification = snapshot.data();
      console.log('🔔 Nouvelle notification créée:', notification);
      
      // Récupérer le token push de l'utilisateur
      const userDoc = await db.collection('users').doc(notification.userId).get();
      
      if (!userDoc.exists) {
        console.log('Utilisateur non trouvé:', notification.userId);
        return null;
      }

      const userData = userDoc.data();
      const token = userData.expoPushToken || userData.pushToken;
      
      if (!token) {
        console.log('Aucun token push trouvé pour l\'utilisateur:', notification.userId);
        return null;
      }

      console.log('📤 Envoi de la notification push...');
      
      // Validation du token (format ExponentPushToken[...])
      if (!token.startsWith('ExponentPushToken[')) {
        console.error('Token push invalide:', token);
        return null;
      }

      const message = {
        to: token,
        sound: 'default',
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: event.params.notificationId,
          type: notification.type,
          ...notification.data
        },
        priority: 'high',
        channelId: 'default',
      };

      // Envoyer directement via l'API Expo Push
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Erreur API Expo:', errorData);
          return null;
        }

        const result = await response.json();
        console.log('✅ Notification push envoyée avec succès:', result);
      } catch (error) {
        console.error('❌ Erreur lors de l\'envoi:', error);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur:', error);
      return null;
    }
  }
);

// Fonction de test simple
exports.testNotification = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new Error('Connectez-vous');
    }

    console.log('Test pour:', request.auth.uid);
    
    return { 
      success: true, 
      message: 'Firebase Functions v6 deployed successfully!',
      userId: request.auth.uid,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur dans testNotification:', error);
    throw new Error('Erreur lors du test');
  }
});