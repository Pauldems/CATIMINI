import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.initialized = false;
    this.expoPushToken = null;
  }

  // Log en mode développement uniquement
  async logToFirestore(message, level = 'info', error = null) {
    // Seulement en mode développement
    if (__DEV__) {
      console.log(`[NOTIFICATIONS ${level.toUpperCase()}] ${message}`, error || '');
    }
    
    // Pas de logging en production dans Firestore pour éviter la collecte excessive de données
    if (__DEV__) {
      try {
        await addDoc(collection(db, 'logs'), {
          message,
          level,
          error: error ? error.toString() : null,
          timestamp: new Date(),
          userId: auth.currentUser?.uid || 'unknown',
          service: 'notifications'
        });
      } catch (e) {
        console.error('Failed to log to Firestore:', e);
      }
    }
  }

  async initialize() {
    if (this.initialized) return;

    await this.logToFirestore('🔄 Début initialisation notifications');

    // Vérifier si c'est un vrai appareil
    if (!Device.isDevice) {
      await this.logToFirestore('❌ Pas un appareil physique - simulateur détecté', 'error');
      console.log('Notifications non disponibles sur simulateur');
      return;
    }

    await this.logToFirestore('✅ Appareil physique confirmé');

    // Demander la permission
    const { status } = await Notifications.getPermissionsAsync();
    await this.logToFirestore(`📋 Permissions actuelles: ${status}`);
    
    let finalStatus = status;

    if (status !== 'granted') {
      await this.logToFirestore('🔐 Demande de permissions...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = newStatus;
      await this.logToFirestore(`📋 Nouvelles permissions: ${newStatus}`);
    }

    if (finalStatus !== 'granted') {
      await this.logToFirestore('❌ Permissions refusées par l\'utilisateur', 'error');
      console.log('Permission notifications refusée');
      return;
    }

    await this.logToFirestore('✅ Permissions accordées');

    // Obtenir le token Expo
    try {
      await this.logToFirestore('🎯 Génération du token Expo...');
      
      // Récupérer le projectId pour la production
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.manifest?.extra?.eas?.projectId;
      await this.logToFirestore(`📱 ProjectId: ${projectId || 'non trouvé'}`);
      
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      this.expoPushToken = token;
      await this.logToFirestore(`🎫 Token généré: ${token.substring(0, 30)}...`);

      // Canal Android
      if (Platform.OS === 'android') {
        await this.logToFirestore('📱 Configuration canal Android...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      // Sauvegarder le token
      await this.logToFirestore('💾 Sauvegarde du token en cours...');
      await this.saveTokenToDatabase(token);

      await this.logToFirestore('✅ Initialisation terminée avec succès');
      this.initialized = true;
    } catch (error) {
      await this.logToFirestore(`❌ Erreur lors de la génération du token: ${error.message}`, 'error', error);
      await this.logToFirestore(`📊 Stack trace: ${error.stack}`, 'error');
      
      // Log des informations de debug supplémentaires
      await this.logToFirestore(`🔍 Constants.manifest: ${JSON.stringify(Constants.manifest)}`, 'info');
      await this.logToFirestore(`🔍 Constants.expoConfig: ${JSON.stringify(Constants.expoConfig)}`, 'info');
      
      throw error;
    }
  }

  async saveTokenToDatabase(token) {
    const user = auth.currentUser;
    if (!user || !token) {
      await this.logToFirestore(`❌ Données manquantes - User: ${!!user}, Token: ${!!token}`, 'error');
      return;
    }

    try {
      await this.logToFirestore(`🔍 Vérification document user: ${user.uid}`);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      await this.logToFirestore(`📋 Document existe: ${userDoc.exists()}`);

      if (userDoc.exists()) {
        // Mettre à jour le document existant
        await updateDoc(userDocRef, {
          expoPushToken: token,
          lastTokenUpdate: new Date().toISOString(),
          notificationPermissions: 'granted'
        });
        await this.logToFirestore(`✅ Token mis à jour pour: ${user.uid}`);
      } else {
        // Créer le document avec le token
        await setDoc(userDocRef, {
          expoPushToken: token,
          lastTokenUpdate: new Date().toISOString(),
          notificationPermissions: 'granted'
        }, { merge: true });
        await this.logToFirestore(`✅ Document créé avec token pour: ${user.uid}`);
      }
    } catch (error) {
      await this.logToFirestore(`❌ Erreur sauvegarde token pour ${user.uid}`, 'error', error);
      throw error;
    }
  }
}

export default new NotificationService();