import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { auth, db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import notificationService from '../../../services/notificationService';

export default function DebugScreen() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const info: any = {
        device: {
          isDevice: Device.isDevice,
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
        app: {
          name: Constants.expoConfig?.name,
          version: Constants.expoConfig?.version,
          appOwnership: Constants.appOwnership,
          isExpoGo: Constants.appOwnership === 'expo',
        },
        user: {
          uid: auth.currentUser?.uid,
          email: auth.currentUser?.email,
        },
        permissions: {},
        pushToken: null,
        userData: null,
      };

      // Vérifier les permissions
      const { status } = await Notifications.getPermissionsAsync();
      info.permissions.current = status;

      // Charger les données utilisateur depuis Firestore
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          info.userData = userDoc.data();
        }
      }

      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
    setLoading(false);
  };

  const testNotificationInit = async () => {
    try {
      setLogs(['🔄 Début du test...']);
      
      // Hook console.log pour capturer les logs
      const originalLog = console.log;
      console.log = (...args) => {
        setLogs(prev => [...prev, args.join(' ')]);
        originalLog(...args);
      };
      
      await notificationService.initialize();
      
      // Restaurer console.log
      console.log = originalLog;
      
      setLogs(prev => [...prev, '✅ Test terminé']);
      await loadDebugInfo();
      
    } catch (error) {
      setLogs(prev => [...prev, `❌ Erreur: ${error.message}`]);
    }
  };

  const testPushNotification = async () => {
    if (!debugInfo.userData?.pushToken) {
      Alert.alert('Erreur', 'Aucun token push trouvé');
      return;
    }

    try {
      Alert.alert('Test', 'Envoi de la notification...');
      await pushNotificationService.sendPushNotification(
        debugInfo.userData.pushToken,
        'Test Notification',
        'Ceci est une notification de test',
        { test: true }
      );
      Alert.alert('Succès', 'Notification envoyée');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Info</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <Text>Is Device: {String(debugInfo.device.isDevice)}</Text>
        <Text>Brand: {debugInfo.device.brand}</Text>
        <Text>Model: {debugInfo.device.modelName}</Text>
        <Text>OS: {debugInfo.device.osName} {debugInfo.device.osVersion}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <Text>Name: {debugInfo.app.name}</Text>
        <Text>Version: {debugInfo.app.version}</Text>
        <Text>Ownership: {debugInfo.app.appOwnership}</Text>
        <Text style={{ color: debugInfo.app.isExpoGo ? 'red' : 'green' }}>
          Is Expo Go: {String(debugInfo.app.isExpoGo)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User</Text>
        <Text>UID: {debugInfo.user.uid}</Text>
        <Text>Email: {debugInfo.user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text>Permission: {debugInfo.permissions.current}</Text>
        <Text>Has Token: {debugInfo.userData?.pushToken ? 'Oui' : 'Non'}</Text>
        {debugInfo.userData?.pushToken && (
          <>
            <Text>Token: {debugInfo.userData.pushToken.substring(0, 30)}...</Text>
            <Text>Platform: {debugInfo.userData.platform}</Text>
            <Text>Token Type: {debugInfo.userData.tokenType}</Text>
            <Text>Updated: {debugInfo.userData.pushTokenUpdatedAt?.toDate?.()?.toLocaleString?.() || 'Unknown'}</Text>
          </>
        )}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={testNotificationInit}>
          <Text style={styles.buttonText}>Tester génération token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, !debugInfo.userData?.pushToken && styles.buttonDisabled]} 
          onPress={testPushNotification}
          disabled={!debugInfo.userData?.pushToken}
        >
          <Text style={styles.buttonText}>Tester envoi notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={loadDebugInfo}>
          <Text style={styles.buttonText}>Rafraîchir</Text>
        </TouchableOpacity>
      </View>

      {/* Section Logs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logs en temps réel</Text>
        <TouchableOpacity style={styles.button} onPress={() => setLogs([])}>
          <Text style={styles.buttonText}>Vider les logs</Text>
        </TouchableOpacity>
        
        <View style={styles.logsContainer}>
          {logs.length === 0 ? (
            <Text style={styles.logText}>Aucun log pour le moment</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
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
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttons: {
    marginTop: 20,
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
  logsContainer: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
    maxHeight: 300,
  },
  logText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
});