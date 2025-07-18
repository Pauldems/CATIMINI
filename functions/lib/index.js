"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNotification = exports.onNotificationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const node_fetch_1 = require("node-fetch");
// Initialiser Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// Fonction pour envoyer une push notification
async function sendPushNotification(expoPushToken, title, body, eventId) {
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
        const response = await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        console.log('✅ Push notification sent:', await response.json());
    }
    catch (error) {
        console.error('❌ Error sending push notification:', error);
    }
}
// Déclencheur : Nouvelle notification créée
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)('notifications/{notificationId}', async (event) => {
    try {
        const snapshot = event.data;
        if (!snapshot)
            return;
        const notification = snapshot.data();
        console.log('🔔 Nouvelle notification créée:', notification);
        // Récupérer le token Expo de l'utilisateur
        const userDoc = await db.collection('users').doc(notification.userId).get();
        if (!userDoc.exists) {
            console.log('❌ Utilisateur non trouvé:', notification.userId);
            return null;
        }
        const userData = userDoc.data();
        const expoPushToken = userData === null || userData === void 0 ? void 0 : userData.expoPushToken;
        if (!expoPushToken) {
            console.log('❌ Pas de token Expo pour:', notification.userId);
            return null;
        }
        // Envoyer la push notification
        await sendPushNotification(expoPushToken, notification.title, notification.message, notification.eventId);
        return null;
    }
    catch (error) {
        console.error('❌ Erreur dans onNotificationCreated:', error);
        return null;
    }
});
exports.testNotification = (0, https_1.onCall)(async (request) => {
    try {
        if (!request.auth) {
            throw new Error('Vous devez être connecté');
        }
        console.log('Test notification pour:', request.auth.uid);
        return { success: true, message: 'Test réussi avec firebase-functions v6' };
    }
    catch (error) {
        console.error('❌ Erreur dans testNotification:', error);
        throw new Error('Erreur lors du test');
    }
});
//# sourceMappingURL=index.js.map