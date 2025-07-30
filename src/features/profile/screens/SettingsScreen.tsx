import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView, ActivityIndicator } from 'react-native';
import { auth } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { PremiumModal } from '../components/PremiumModal';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../../theme/colors';
import premiumService from '../../../services/premiumService';
import storeKitService from '../../../services/storeKitService';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    checkNotificationStatus();
    checkPremiumStatus();
    
    // Configurer un rafraîchissement toutes les 30 secondes
    const interval = setInterval(() => {
      checkPremiumStatus();
    }, 30000); // 30 secondes
    
    setRefreshInterval(interval);
    
    // Listener pour rafraîchir le statut quand on revient sur l'écran
    const unsubscribe = navigation.addListener('focus', () => {
      checkNotificationStatus();
      checkPremiumStatus();
      
      // TEMPORAIREMENT DÉSACTIVÉ - Modal premium
      // if (navigation.getState()?.routes?.find((r: any) => r.params?.showPremium)) {
      //   setShowPremiumModal(true);
      // }
    });

    return () => {
      unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [navigation]);

  const checkNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.log('Erreur vérification statut notifications:', error);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      setCheckingPremium(true);
      const premium = await premiumService.checkPremiumStatus();
      console.log('🎯 Statut premium dans SettingsScreen:', premium);
      setIsPremium(premium);
    } catch (error) {
      console.error('Erreur vérification premium dans Settings:', error);
      setIsPremium(false);
    } finally {
      setCheckingPremium(false);
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
        
        {/* Bouton Premium */}
        <TouchableOpacity 
          style={[
            styles.button, 
            isPremium ? styles.premiumActiveButton : styles.premiumButton
          ]}
          onPress={() => setShowPremiumModal(true)}
          disabled={checkingPremium}
        >
          <View style={styles.premiumButtonContent}>
            {checkingPremium ? (
              <ActivityIndicator size="small" color={isPremium ? '#4CAF50' : '#FFB800'} />
            ) : (
              <>
                <Ionicons 
                  name="star" 
                  size={20} 
                  color={isPremium ? '#FFD700' : '#FFB800'} 
                />
                <Text style={[styles.buttonText, styles.premiumButtonText]}>
                  {isPremium ? 'Créno Premium actif' : 'Passer à Premium'}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
        
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

        <TouchableOpacity 
          style={[styles.button, styles.privacyButton]}
          onPress={() => navigation.navigate('TermsOfUse')}
        >
          <Text style={styles.buttonText}>
            Conditions d'utilisation
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

      {/* Modal Premium */}
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        isPremium={isPremium}
        onUpgrade={async () => {
          setShowPremiumModal(false);
          
          // Forcer une vérification immédiate
          await checkPremiumStatus();
          
          // Puis vérifier plusieurs fois pour s'assurer que le statut est à jour
          const checkMultipleTimes = async () => {
            for (let i = 0; i < 5; i++) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
              await checkPremiumStatus();
              if (isPremium) break; // Arrêter si déjà premium
            }
          };
          
          checkMultipleTimes();
          
          // Rafraîchir plus fréquemment après un achat (toutes les 10 secondes pendant 1 minute)
          if (refreshInterval) {
            clearInterval(refreshInterval);
          }
          
          const fastInterval = setInterval(() => {
            checkPremiumStatus();
          }, 10000); // 10 secondes
          
          setRefreshInterval(fastInterval);
          
          // Revenir à l'intervalle normal après 1 minute
          setTimeout(() => {
            if (fastInterval) {
              clearInterval(fastInterval);
            }
            const normalInterval = setInterval(() => {
              checkPremiumStatus();
            }, 30000);
            setRefreshInterval(normalInterval);
          }, 60000);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  spacer: {
    flex: 1,
    minHeight: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 40,
    color: '#1A3B5C',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  button: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#1A3B5C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  enabledButton: {
  },
  disabledButton: {
  },
  privacyButton: {
  },
  debugButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  logoutButton: {
    marginBottom: 15,
  },
  deleteButton: {
    marginBottom: 20,
  },
  buttonText: {
    color: '#1A3B5C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  premiumButton: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFB800',
    marginBottom: 20,
    borderRadius: 16,
    padding: 0,
  },
  premiumActiveButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 20,
    borderRadius: 16,
  },
  premiumButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  premiumButtonText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  premiumTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 14,
    numberOfLines: 1,
  },
});