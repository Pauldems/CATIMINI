import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Event, Availability, Friend, User } from '../../../types';
import { Colors } from '../../../theme/colors';

interface EventWithCreator extends Event {
  creatorName?: string;
  participantNames?: string[];
  hasConflict?: boolean;
  userStillParticipating?: boolean;
}

interface MyEventsScreenProps {
  navigation: any;
}

const MyEventsScreen: React.FC<MyEventsScreenProps> = ({ navigation }) => {
  const flatListRef = useRef<FlatList>(null);
  const [events, setEvents] = useState<EventWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [friends, setFriends] = useState<(Friend & { friendData?: User })[]>([]);

  // Listener pour remettre la page en haut quand on arrive sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return unsubscribe;
  }, [navigation]);

  // Fonction pour vérifier si un événement est en conflit avec les indisponibilités
  const hasEventConflict = (event: Event, userAvailabilities: Availability[]): boolean => {
    const user = auth.currentUser;
    if (!user) return false;

    // Vérifier seulement les indisponibilités de l'utilisateur actuel (en excluant celles créées par l'événement lui-même)
    const userUnavailabilities = userAvailabilities.filter(
      avail => avail.userId === user.uid && !avail.isAvailable && avail.createdByEvent !== event.id
    );

    // Vérifier chaque jour de l'événement
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    for (let date = new Date(eventStart); date <= eventEnd; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Chercher les indisponibilités pour cette date
      const dayUnavailabilities = userUnavailabilities.filter(avail => avail.date === dateStr);
      
      for (const unavail of dayUnavailabilities) {
        // Convertir les heures en minutes pour faciliter la comparaison
        const [eventStartHour, eventStartMin] = event.startTime.split(':').map(Number);
        const [eventEndHour, eventEndMin] = event.endTime.split(':').map(Number);
        const [unavailStartHour, unavailStartMin] = unavail.startTime.split(':').map(Number);
        const [unavailEndHour, unavailEndMin] = unavail.endTime.split(':').map(Number);

        const eventStartMinutes = eventStartHour * 60 + eventStartMin;
        const eventEndMinutes = eventEndHour * 60 + eventEndMin;
        const unavailStartMinutes = unavailStartHour * 60 + unavailStartMin;
        const unavailEndMinutes = unavailEndHour * 60 + unavailEndMin;

        // Vérifier le chevauchement
        if (unavailStartMinutes < eventEndMinutes && unavailEndMinutes > eventStartMinutes) {
          return true;
        }
      }
    }

    return false;
  };

  // Charger les indisponibilités de l'utilisateur
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const availQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(availQuery, (snapshot) => {
      const availData: Availability[] = [];
      snapshot.forEach((doc) => {
        availData.push({ id: doc.id, ...doc.data() } as Availability);
      });
      setAvailabilities(availData);
    });

    return unsubscribe;
  }, []);

  // Charger les amis
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(friendsQuery, async (snapshot) => {
      const friendsData: (Friend & { friendData?: User })[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const friendData = { ...docSnapshot.data(), id: docSnapshot.id } as Friend;
        
        // Récupérer les données de l'ami
        try {
          const friendDoc = await getDoc(doc(db, 'users', friendData.friendId));
          if (friendDoc.exists()) {
            friendsData.push({
              ...friendData,
              friendData: { ...friendDoc.data(), id: friendDoc.id } as User
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des données de l\'ami:', error);
        }
      }
      
      setFriends(friendsData);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Récupérer tous les événements où l'utilisateur est encore participant
    const q = query(
      collection(db, 'events'),
      where('participants', 'array-contains', user.uid),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const eventsData: EventWithCreator[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const eventData = { id: docSnapshot.id, ...docSnapshot.data() } as Event;
        
        // Vérifier si l'utilisateur actuel est encore dans les participants
        const userStillParticipating = eventData.participants.includes(user.uid);
        
        // Si l'utilisateur n'est plus participant mais que l'événement avait des conflits,
        // on peut supposer qu'il a été retiré automatiquement
        const hasConflictWithUser = hasEventConflict(eventData, availabilities);
        
        // Récupérer le nom du créateur et des participants
        try {
          const creatorDoc = await getDoc(doc(db, 'users', eventData.creatorId));
          const creatorName = creatorDoc.exists() ? creatorDoc.data().displayName : 'Utilisateur inconnu';
          
          // Récupérer les noms de tous les participants ACTUELS
          const participantNames: string[] = [];
          for (const participantId of eventData.participants) {
            try {
              const participantDoc = await getDoc(doc(db, 'users', participantId));
              if (participantDoc.exists()) {
                participantNames.push(participantDoc.data().displayName);
              }
            } catch (error) {
              console.error('Erreur lors de la récupération du participant:', error);
            }
          }
          
          eventsData.push({
            ...eventData,
            creatorName,
            participantNames,
            hasConflict: hasConflictWithUser,
            userStillParticipating
          });
        } catch (error) {
          console.error('Erreur lors de la récupération des données:', error);
          eventsData.push({
            ...eventData,
            creatorName: 'Utilisateur inconnu',
            participantNames: [],
            hasConflict: hasConflictWithUser,
            userStillParticipating
          });
        }
      }

      setEvents(eventsData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [availabilities]);

  const onRefresh = () => {
    setRefreshing(true);
    // Forcer le rechargement des événements en mettant à jour les dépendances
    setAvailabilities([...availabilities]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Si c'est le même jour
    if (start.toDateString() === end.toDateString()) {
      return formatDate(startDate);
    }
    
    // Si c'est plusieurs jours
    return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`;
  };

  const handleEventPress = (event: EventWithCreator) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const isMultiDay = startDate.toDateString() !== endDate.toDateString();
    const isCreator = event.creatorId === auth.currentUser?.uid;
    
    let dateInfo = '';
    if (isMultiDay) {
      dateInfo = `📅 ${formatDateRange(event.startDate, event.endDate)}`;
    } else {
      dateInfo = `📅 ${formatDate(event.startDate)}\n⏰ ${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
    }

    let participantInfo = '';
    if (event.hasConflict) {
      participantInfo = `👥 Participants: ${event.participantNames?.join(', ')}\n\n⚠️ Vous avez été retiré de cet événement à cause d'une indisponibilité`;
    } else {
      participantInfo = `👥 Participants: ${event.participantNames?.join(', ')}`;
    }

    const message = `👤 Créé par: ${event.creatorName}\n\n${dateInfo}\n\n${participantInfo}\n\n📝 ${event.description || 'Aucune description'}`;

    // Afficher seulement les détails sans option de modification
    Alert.alert(
      event.title,
      message,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderEvent = ({ item }: { item: EventWithCreator }) => {
    const isParticipant = item.participants.includes(auth.currentUser?.uid || '');
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const isMultiDay = startDate.toDateString() !== endDate.toDateString();
    
    // Vérifier si l'événement est terminé en prenant en compte l'heure
    const now = new Date();
    
    // Créer une date complète avec l'heure de fin
    const eventEndDateTime = new Date(endDate);
    const [endHour, endMinute] = item.endTime.split(':').map(Number);
    eventEndDateTime.setHours(endHour, endMinute, 0, 0);
    
    const isFinished = eventEndDateTime < now;
    
    return (
      <TouchableOpacity
        style={[
          styles.eventCard, 
          isParticipant && !item.hasConflict && styles.confirmedEvent,
          item.hasConflict && styles.conflictEvent,
          isFinished && styles.finishedEvent
        ]}
        onPress={() => handleEventPress(item)}
      >
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, isFinished && styles.finishedText]}>{item.title}</Text>
          {isFinished && (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedBadgeText}>TERMINÉ</Text>
            </View>
          )}
          {!isFinished && isParticipant && !item.hasConflict && (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          )}
          {!isFinished && item.hasConflict && (
            <Ionicons name="close-circle" size={20} color="#FF5252" />
          )}
        </View>
        
        <Text style={[styles.eventCreator, isFinished && styles.finishedText]}>👤 {item.creatorName}</Text>
        
        <View style={styles.eventDetails}>
          {isMultiDay ? (
            <Text style={[styles.eventDate, isFinished && styles.finishedText]}>
              📅 {formatDateRange(item.startDate, item.endDate)}
            </Text>
          ) : (
            <>
              <Text style={[styles.eventDate, isFinished && styles.finishedText]}>
                📅 {formatDate(item.startDate)}
              </Text>
              <Text style={[styles.eventTime, isFinished && styles.finishedText]}>
                ⏰ {formatTime(item.startTime)} - {formatTime(item.endTime)}
              </Text>
            </>
          )}
        </View>
        
        <Text style={[styles.participantsList, isFinished && styles.finishedText]}>
          👥 {item.participantNames?.join(', ')}
        </Text>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Aucun événement</Text>
      <Text style={styles.emptySubText}>
        Vous ne participez à aucun événement pour le moment
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Événements</Text>
        <Text style={styles.headerSubtitle}>
          {events.length} événement{events.length > 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 25,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFB800',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
    flexGrow: 1,
    paddingBottom: 120,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  confirmedEvent: {
    borderLeftWidth: 5,
    borderLeftColor: '#1A3B5C', // Bleu pour participant
  },
  conflictEvent: {
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B6B', // Rouge pour conflit
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3B5C',
    flex: 1,
    letterSpacing: 0.2,
  },
  eventCreator: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 10,
    fontWeight: '600',
  },
  eventDetails: {
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 15,
    color: '#1A3B5C',
    marginBottom: 4,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 15,
    color: '#1A3B5C',
    fontWeight: '600',
  },
  participantsList: {
    fontSize: 13,
    color: '#1A3B5C',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A3B5C',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  finishedEvent: {
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    opacity: 0.7,
  },
  finishedText: {
    color: '#999999',
  },
  finishedBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: '15deg' }],
  },
  finishedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default MyEventsScreen;