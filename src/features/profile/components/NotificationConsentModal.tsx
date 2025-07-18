import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface NotificationConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const NotificationConsentModal: React.FC<NotificationConsentModalProps> = ({
  visible,
  onAccept,
  onDecline
}) => {
  const handleAccept = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        onAccept();
      } else {
        Alert.alert(
          'Notifications désactivées',
          'Vous pouvez activer les notifications plus tard dans les paramètres de votre appareil.',
          [{ text: 'OK', onPress: onDecline }]
        );
      }
    } catch (error) {
      console.log('Erreur demande permission notifications:', error);
      onDecline();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={48} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Notifications</Text>
          
          <Text style={styles.description}>
            Créno souhaite vous envoyer des notifications pour :
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.feature}>
              <Ionicons name="calendar" size={20} color="#666" />
              <Text style={styles.featureText}>Nouveaux événements</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.featureText}>Invitations de groupe</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="time" size={20} color="#666" />
              <Text style={styles.featureText}>Rappels d'événements</Text>
            </View>
          </View>
          
          <Text style={styles.note}>
            Vous pouvez modifier ce choix à tout moment dans les paramètres.
          </Text>
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
            >
              <Text style={styles.declineButtonText}>Plus tard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>Autoriser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  note: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});