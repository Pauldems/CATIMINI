import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { auth, db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import pushNotificationService from '../../../services/pushNotificationService';
import notificationService from '../../../services/notificationService';
import NotificationUtils from '../../../utils/notificationUtils';
import Constants from 'expo-constants';

export default function TestNotificationsScreen() {
  const [pushTokenInfo, setPushTokenInfo] = useState<any>(null);
  const [isProduction, setIsProduction] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotificationStatus();
  }, []);

  const loadNotificationStatus = async () => {
    try {
      // Vérifier les permissions
      const perms = await NotificationUtils.checkNotificationPermissions();
      setPermissions(perms);

      // Vérifier l'environnement
      const isProd = Constants.appOwnership === 'standalone' || 
                    Constants.executionEnvironment === 'standalone' ||
                    !__DEV__;
      setIsProduction(isProd);

      // Charger les infos du token si disponibles
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPushTokenInfo(userData.pushTokenData || null);
        }
      }
    } catch (error) {
      console.error('Erreur chargement status notifications:', error);
    }
  };

  const testPushTokenGeneration = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      Alert.alert('Test', 'Génération du token push...');
      
      const token = await pushNotificationService.registerForPushNotifications(auth.currentUser.uid);
      
      if (token) {
        await loadNotificationStatus();
        Alert.alert('✅ Succès', `Token généré avec succès\n\nToken: ${token.substring(0, 30)}...`);
      } else {
        Alert.alert('❌ Échec', 'Impossible de générer le token. Vérifiez que vous êtes sur une build de production.');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
    setLoading(false);
  };

  const testPushNotificationSend = async () => {
    if (!pushTokenInfo?.token) {
      Alert.alert('❌ Erreur', 'Aucun token push disponible');
      return;
    }

    setLoading(true);
    try {
      Alert.alert('Test', 'Envoi de la notification push...');
      
      await pushNotificationService.sendPushNotification(
        pushTokenInfo.token,
        '🧪 Test Notification',
        'Ceci est une notification de test depuis l\'app Créno',
        { test: true, timestamp: new Date().toISOString() }
      );
      
      Alert.alert('✅ Succès', 'Notification push envoyée avec succès');
    } catch (error) {
      Alert.alert('❌ Erreur', `Échec envoi notification: ${error.message}`);
    }
    setLoading(false);
  };

  const testLocalNotification = async () => {
    try {
      const config = NotificationUtils.formatNotificationForEventType('new_event', {
        eventTitle: 'Test Event Local',
        eventId: 'test123'
      });

      const scheduledTime = new Date(Date.now() + 5000); // Dans 5 secondes
      
      await NotificationUtils.scheduleLocalNotification(config, scheduledTime);
      
      Alert.alert('✅ Programmée', 'Notification locale programmée dans 5 secondes');
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const testFirestoreNotification = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      Alert.alert('Test', 'Création d\'une notification Firestore...');
      
      await notificationService.createNotification({
        userId: auth.currentUser.uid,
        type: 'new_event',
        title: '🧪 Test Firestore',
        message: 'Test notification via Firestore avec push automatique',
        eventId: 'test-event-123',
        read: false
      });
      
      Alert.alert('✅ Succès', 'Notification créée dans Firestore et push envoyé automatiquement');
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
    setLoading(false);
  };

  const openNotificationSettings = async () => {
    try {
      await NotificationUtils.openAppSettings();
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible d\'ouvrir les paramètres');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Test Notifications Push</Text>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>État du système</Text>
        <Text>Environnement: {isProduction ? '🟢 Production' : '🟡 Développement'}</Text>
        <Text>Permissions: {permissions?.granted ? '✅ Accordées' : '❌ Refusées'}</Text>
        <Text>Token disponible: {pushTokenInfo ? '✅ Oui' : '❌ Non'}</Text>
        {pushTokenInfo && (
          <>
            <Text>Plateforme: {pushTokenInfo.platform}</Text>
            <Text>Environnement token: {pushTokenInfo.environment}</Text>
            <Text>Version app: {pushTokenInfo.appVersion}</Text>
          </>
        )}
      </View>

      {/* Boutons de test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={testPushTokenGeneration}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Générer token push</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, !pushTokenInfo && styles.buttonDisabled]} 
          onPress={testPushNotificationSend}
          disabled={!pushTokenInfo || loading}
        >
          <Text style={styles.buttonText}>2. Test notification push</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testLocalNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Test notification locale</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={testFirestoreNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Test Firestore + Push</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={loadNotificationStatus}>
          <Text style={styles.secondaryButtonText}>Rafraîchir status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={openNotificationSettings}>
          <Text style={styles.secondaryButtonText}>Ouvrir paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => NotificationUtils.clearBadge()}
        >
          <Text style={styles.secondaryButtonText}>Effacer badge</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info */}
      {pushTokenInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Token</Text>
          <Text style={styles.debugText}>
            {JSON.stringify(pushTokenInfo, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
  },
});