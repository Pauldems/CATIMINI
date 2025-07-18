import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { auth } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../../theme/colors';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
    
    // Listener pour rafraîchir le statut quand on revient sur l'écran
    const unsubscribe = navigation.addListener('focus', () => {
      checkNotificationStatus();
    });

    return unsubscribe;
  }, [navigation]);

  const checkNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.log('Erreur vérification statut notifications:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!auth.currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      if (notificationsEnabled) {
        // Pour désactiver, on doit rediriger vers les paramètres système
        Alert.alert(
          'Désactiver les notifications',
          'Pour désactiver les notifications, vous devez aller dans les paramètres de votre appareil.\n\nParamètres > Notifications > Créno',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Ouvrir Paramètres', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      } else {
        // Si désactivées, ouvrir directement les paramètres système
        Linking.openSettings();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleAccountDeleted = () => {
    Alert.alert(
      'Compte supprimé',
      'Votre compte a été supprimé avec succès.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Paramètres</Text>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            notificationsEnabled ? styles.enabledButton : styles.disabledButton
          ]}
          onPress={handleToggleNotifications}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading 
              ? 'Traitement...' 
              : notificationsEnabled 
                ? 'Notifications activées ✓' 
                : 'Activer les notifications'
            }
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.privacyButton]}
          onPress={handlePrivacyPolicy}
        >
          <Text style={styles.buttonText}>
            Politique de confidentialité
          </Text>
        </TouchableOpacity>

        {/* Spacer pour pousser les boutons vers le bas */}
        <View style={styles.spacer} />

        <TouchableOpacity 
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deleteButtonText}>
            Supprimer mon compte
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onAccountDeleted={handleAccountDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120, // Espace pour éviter le menu flottant
  },
  spacer: {
    flex: 1,
    minHeight: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: Colors.white,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  enabledButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.secondaryLight,
  },
  disabledButton: {
    backgroundColor: Colors.gray500,
    borderWidth: 2,
    borderColor: Colors.gray600,
  },
  privacyButton: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  logoutButton: {
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.secondaryLight,
    marginBottom: 15,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    borderWidth: 2,
    borderColor: '#E85D75',
    marginBottom: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});