import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Event, User } from '../../../types';

interface EventDetailsScreenProps {
  route: {
    params: {
      eventId: string;
    };
  };
  navigation: any;
}

export default function EventDetailsScreen({ route, navigation }: EventDetailsScreenProps) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      // Charger l'événement
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        Alert.alert('Erreur', 'Événement introuvable');
        navigation.goBack();
        return;
      }

      const eventData = { ...eventDoc.data(), id: eventDoc.id } as Event;
      setEvent(eventData);

      // Charger les informations des participants
      const participantUsers: User[] = [];
      for (const participantId of eventData.participants) {
        const userDoc = await getDoc(doc(db, 'users', participantId));
        if (userDoc.exists()) {
          participantUsers.push(userDoc.data() as User);
        }
      }
      setParticipants(participantUsers);
    } catch (error) {
      console.error('Error loading event details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateRange = () => {
    if (!event) return '';
    
    if (event.startDate === event.endDate) {
      return formatDate(event.startDate);
    } else {
      return `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Événement introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Détails de l'événement</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.description && (
            <Text style={styles.eventDescription}>{event.description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Date</Text>
          <Text style={styles.sectionContent}>{formatDateRange()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Horaires</Text>
          <Text style={styles.sectionContent}>
            {event.startTime} - {event.endTime}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Durée</Text>
          <Text style={styles.sectionContent}>
            {event.startDate === event.endDate ? '1 jour' : `${event.duration} jour${event.duration > 1 ? 's' : ''}`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Participants ({participants.length})</Text>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <Text style={styles.participantName}>{participant.displayName}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Informations</Text>
          <Text style={styles.infoText}>
            Organisateur : {participants.find(p => p.id === event.creatorId)?.displayName || 'Inconnu'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    marginBottom: 6,
  },
  participantName: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  confirmedBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});