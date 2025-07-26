import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Friend, User, Availability, TimeSlot, Event } from '../../../types';
import { findAvailableSlots } from '../../../utils/slotFinder';
import { checkMultiParticipantConflicts, summarizeConflicts } from '../../../utils/conflictChecker';
import notificationService from '../../../services/notificationService';
import GroupSelector from '../components/GroupSelector';
import { useCurrentGroup } from '../../../hooks/useCurrentGroup';
import GroupRequiredScreen from './GroupRequiredScreen';
import { Colors } from '../../../theme/colors';


export default function CreateEventScreen({ navigation }: any) {
  const { currentGroup, loading: groupLoading, needsGroupSelection } = useCurrentGroup();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const time = new Date();
    time.setHours(14, 0, 0, 0);
    return time;
  });
  const [endTime, setEndTime] = useState(() => {
    const time = new Date();
    time.setHours(18, 0, 0, 0);
    return time;
  });
  const [durationDays, setDurationDays] = useState('');
  const [searchMode, setSearchMode] = useState<'time' | 'duration'>('time');
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [participantNames, setParticipantNames] = useState<{ [userId: string]: string }>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchStartDate, setSearchStartDate] = useState(new Date());
  const [showSearchDatePicker, setShowSearchDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime(() => {
      const time = new Date();
      time.setHours(14, 0, 0, 0);
      return time;
    });
    setEndTime(() => {
      const time = new Date();
      time.setHours(18, 0, 0, 0);
      return time;
    });
    setDurationDays('');
    setSearchMode('time');
    setSelectedFriends([]);
    setShowSlotSelector(false);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setSearchStartDate(new Date());
  };

  useEffect(() => {
    if (currentGroup) {
      loadFriends();
      loadMyEvents();
      loadAllEvents();
    }
    
    // Réinitialiser les champs quand on revient sur cet écran
    const unsubscribe = navigation.addListener('focus', () => {
      resetForm();
    });

    return unsubscribe;
  }, [navigation, currentGroup, refreshTrigger]);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Si l'utilisateur n'a pas de groupe, afficher l'écran de sélection
  if (needsGroupSelection) {
    return (
      <GroupRequiredScreen 
        onGroupSelected={() => setRefreshTrigger(prev => prev + 1)}
      />
    );
  }

  if (groupLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const loadFriends = async () => {
    if (!auth.currentUser || !currentGroup) return;

    try {
      const friendsData: User[] = [];
      const names: { [userId: string]: string } = {};
      
      // Charger tous les membres du groupe sauf l'utilisateur actuel
      for (const memberId of currentGroup.members) {
        if (memberId !== auth.currentUser.uid) {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            friendsData.push(userData);
            names[memberId] = userData.displayName;
          }
        }
      }

      // Ajouter le nom de l'utilisateur actuel
      if (auth.currentUser) {
        const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (currentUserDoc.exists()) {
          names[auth.currentUser.uid] = currentUserDoc.data().displayName;
        }
      }

      setFriends(friendsData);
      setParticipantNames(names);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadMyEvents = () => {
    if (!auth.currentUser || !currentGroup) return;

    const eventsQuery = query(
      collection(db, 'events'),
      where('creatorId', '==', auth.currentUser.uid),
      where('groupId', '==', currentGroup.id)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ ...doc.data(), id: doc.id } as Event);
      });
      setMyEvents(eventsData);
    });

    return unsubscribe;
  };

  const loadAllEvents = () => {
    if (!auth.currentUser || !currentGroup) return;

    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', currentGroup.id)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ ...doc.data(), id: doc.id } as Event);
      });
      setAllEvents(eventsData);
    });

    return unsubscribe;
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const searchSlots = async () => {
    if (!title) {
      Alert.alert('Erreur', 'Veuillez donner un titre à votre événement');
      return;
    }

    if (selectedFriends.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un ami');
      return;
    }

    if (searchMode === 'time') {
      if (endTime <= startTime) {
        Alert.alert('Erreur', "L'heure de fin doit être après l'heure de début");
        return;
      }
    } else {
      if (!durationDays || parseInt(durationDays) <= 0) {
        Alert.alert('Erreur', 'Veuillez entrer une durée valide en jours');
        return;
      }
    }

    setLoading(true);
    
    // Attendre un délai plus long pour s'assurer que les données sont synchronisées
    // Particulièrement important après la création d'un événement
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const participants = [...selectedFriends, auth.currentUser!.uid];
      const availabilities: { [userId: string]: Availability[] } = {};

      // Charger les disponibilités de tous les participants avec rechargement forcé
      console.log('🔄 Rechargement des indisponibilités pour tous les participants...');
      for (const userId of participants) {
        const availQuery = query(
          collection(db, 'availabilities'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(availQuery);
        
        availabilities[userId] = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as Availability));
        
        // Debug détaillé des indisponibilités
        const userUnavails = availabilities[userId].filter(a => !a.isAvailable);
        const eventCreatedUnavails = userUnavails.filter(a => a.createdByEvent);
        
        console.log(`✅ Chargé ${availabilities[userId].length} disponibilités totales pour l'utilisateur ${userId}`);
        console.log(`   - ${userUnavails.length} indisponibilités (isAvailable: false)`);
        console.log(`   - ${eventCreatedUnavails.length} créées par des événements`);
        
        // Afficher quelques exemples d'indisponibilités
        userUnavails.slice(0, 3).forEach((unavail, index) => {
          console.log(`   [${index + 1}] ${unavail.date} ${unavail.startTime}-${unavail.endTime} ${unavail.createdByEvent ? `(événement: ${unavail.createdByEvent})` : '(manuelle)'}`);
        });
      }
      
      // Recharger tous les événements du groupe pour s'assurer d'avoir les dernières données
      console.log('🔄 Rechargement des événements du groupe...');
      const eventsQuery = query(
        collection(db, 'events'),
        where('groupId', '==', currentGroup!.id)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const freshEvents: Event[] = eventsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as Event));
      
      console.log(`✅ Chargé ${freshEvents.length} événements pour le groupe`);

      let durationInDays: number;

      if (searchMode === 'time') {
        durationInDays = 1;
      } else {
        durationInDays = parseInt(durationDays);
      }
      
      const slots = findAvailableSlots(
        availabilities,
        participants,
        durationInDays,
        searchStartDate,
        searchMode === 'time' ? startTime : undefined,
        searchMode === 'time' ? endTime : undefined,
        freshEvents // Utiliser les événements fraîchement chargés
      );

      if (slots.length === 0) {
        Alert.alert(
          'Aucun créneau trouvé',
          'Impossible de trouver un créneau où tous les participants sont disponibles'
        );
      } else {
        setAvailableSlots(slots);
        setSelectedSlot(null); // Réinitialiser la sélection
        setShowSlotSelector(true);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };


  const createUnavailabilityForParticipants = async (participants: string[], startDate: Date, endDate: Date, startTime: string, endTime: string, eventId: string) => {
    const promises = participants.map(async (participantId) => {
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        await addDoc(collection(db, 'availabilities'), {
          userId: participantId,
          date: dateStr,
          startTime: startTime,
          endTime: endTime,
          isAvailable: false,
          createdAt: new Date(),
          createdByEvent: eventId, // Lier l'indisponibilité à l'événement
          groupId: currentGroup?.id, // Ajouter le groupId pour la cohérence
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    await Promise.all(promises);
  };

  const deleteUnavailabilitiesForEvent = async (eventId: string) => {
    // Supprimer toutes les indisponibilités créées par cet événement
    const availabilitiesQuery = query(
      collection(db, 'availabilities'),
      where('createdByEvent', '==', eventId)
    );
    
    const snapshot = await getDocs(availabilitiesQuery);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
  };

  const createEvent = async () => {
    if (!selectedSlot) {
      Alert.alert('Erreur', 'Veuillez sélectionner un créneau');
      return;
    }

    // Créer l'événement et les indisponibilités pour tous les participants
    const participants = [...selectedFriends, auth.currentUser!.uid];
    const startTime = selectedSlot.startDate.toTimeString().slice(0, 5);
    const endTime = selectedSlot.endDate.toTimeString().slice(0, 5);

    // Créer des dates locales
    const startDateLocal = new Date(selectedSlot.startDate);
    const endDateLocal = new Date(selectedSlot.endDate);

    try {
      // Créer l'événement d'abord pour obtenir son ID
      await proceedWithEventCreation();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const proceedWithEventCreation = async () => {
    if (!selectedSlot) return;

    setLoading(true);
    try {
      const eventDoc = await addDoc(collection(db, 'events'), {
        creatorId: auth.currentUser!.uid,
        title,
        description,
        startDate: selectedSlot.startDate.toISOString().split('T')[0],
        endDate: selectedSlot.endDate.toISOString().split('T')[0],
        startTime: selectedSlot.startDate.toTimeString().slice(0, 5),
        endTime: selectedSlot.endDate.toTimeString().slice(0, 5),
        duration: Math.max(1, Math.ceil((selectedSlot.endDate.getTime() - selectedSlot.startDate.getTime()) / (1000 * 60 * 60 * 24))),
        participants: [...selectedFriends, auth.currentUser!.uid],
        confirmedParticipants: [auth.currentUser!.uid],
        groupId: currentGroup!.id,
        createdAt: new Date(),
      });


      // Créer les indisponibilités pour tous les participants
      const participants = [...selectedFriends, auth.currentUser!.uid];
      const startDateLocal = new Date(selectedSlot.startDate);
      const endDateLocal = new Date(selectedSlot.endDate);
      const startTime = selectedSlot.startDate.toTimeString().slice(0, 5);
      const endTime = selectedSlot.endDate.toTimeString().slice(0, 5);
      
      await createUnavailabilityForParticipants(participants, startDateLocal, endDateLocal, startTime, endTime, eventDoc.id);

      // Envoyer des notifications aux participants
      console.log('Envoi de notifications aux participants:', selectedFriends);
      console.log('Titre de l\'événement:', title);
      console.log('ID de l\'événement:', eventDoc.id);
      
      try {
        await notificationService.createEventNotification(
          title,
          eventDoc.id,
          selectedFriends // Ne pas notifier le créateur
        );
        console.log('Notifications envoyées avec succès');
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi des notifications:', notificationError);
        // Ne pas faire échouer la création d'événement si notifications échouent
      }

      Alert.alert('Succès', 'Événement créé avec succès');
      
      setShowSlotSelector(false);
      setSelectedSlot(null);
      resetForm();
      // Forcer le rechargement des événements
      setRefreshTrigger(prev => prev + 1);
      
      // Attendre un peu pour que les indisponibilités soient bien propagées
      setTimeout(() => {
        console.log('Indisponibilités créées et propagées');
      }, 1000);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Récupérer les détails de l'événement avant de le supprimer
              const eventDoc = await getDoc(doc(db, 'events', eventId));
              if (!eventDoc.exists()) {
                Alert.alert('Erreur', 'Événement introuvable');
                return;
              }

              const eventData = eventDoc.data() as Event;
              
              // Supprimer l'événement
              await deleteDoc(doc(db, 'events', eventId));
              
              // Supprimer les indisponibilités créées par cet événement
              await deleteUnavailabilitiesForEvent(eventId);
              
              // Envoyer des notifications aux participants (sauf le créateur)
              const otherParticipants = eventData.participants.filter(id => id !== auth.currentUser!.uid);
              if (otherParticipants.length > 0) {
                await notificationService.createEventDeletedNotification(
                  eventData.title,
                  otherParticipants
                );
              }
              
              Alert.alert('Succès', 'Événement supprimé');
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Créer un événement</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Titre de l'événement"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optionnel)"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.searchModeSection}>
          <Text style={styles.sectionTitle}>Mode de recherche</Text>
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[styles.modeButton, searchMode === 'time' && styles.selectedModeButton]}
              onPress={() => setSearchMode('time')}
            >
              <Text style={[styles.modeButtonText, searchMode === 'time' && styles.selectedModeButtonText]}>
                Heures spécifiques
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, searchMode === 'duration' && styles.selectedModeButton]}
              onPress={() => setSearchMode('duration')}
            >
              <Text style={[styles.modeButtonText, searchMode === 'duration' && styles.selectedModeButtonText]}>
                Durée en jours
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {searchMode === 'time' ? (
          <View style={styles.dateTimeSection}>
            <Text style={styles.sectionTitle}>Horaires souhaités</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartTime(true)}
              >
                <Text style={styles.dateTimeLabel}>Heure début</Text>
                <Text style={styles.dateTimeValue}>
                  {startTime.toTimeString().slice(0, 5)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndTime(true)}
              >
                <Text style={styles.dateTimeLabel}>Heure fin</Text>
                <Text style={styles.dateTimeValue}>
                  {endTime.toTimeString().slice(0, 5)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dateTimeSection}>
            <Text style={styles.sectionTitle}>Durée souhaitée</Text>
            <TouchableOpacity
              style={styles.durationSelector}
              onPress={() => setShowDurationPicker(true)}
            >
              <Text style={styles.durationSelectorText}>
                {durationDays ? `${durationDays} jour${parseInt(durationDays) > 1 ? 's' : ''}` : 'Sélectionner la durée'}
              </Text>
              <Text style={styles.durationSelectorIcon}>⌄</Text>
            </TouchableOpacity>
          </View>
        )}


        <Text style={styles.sectionTitle}>Participants</Text>
        <View style={styles.friendsList}>
          {friends.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={[
                styles.friendItem,
                selectedFriends.includes(friend.id) && styles.selectedFriend,
              ]}
              onPress={() => toggleFriend(friend.id)}
            >
              <Text
                style={[
                  styles.friendName,
                  selectedFriends.includes(friend.id) && styles.selectedFriendText,
                ]}
              >
                {friend.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sélecteur de date de début de recherche */}
        <View style={styles.searchDateSection}>
          <Text style={styles.sectionTitle}>Rechercher à partir du :</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowSearchDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {searchStartDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
            <Text style={styles.dateButtonHint}>Toucher pour changer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.buttonDisabled]}
          onPress={searchSlots}
          disabled={loading}
        >
          <View style={styles.searchButtonContent}>
            <Text style={styles.searchButtonIcon}>🔍</Text>
            <Text style={styles.searchButtonText}>
              {loading ? 'Actualisation des données...' : 'Rechercher des créneaux'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section des événements créés */}
      <View style={styles.myEventsSection}>
        <Text style={styles.sectionTitle}>Mes événements créés ({myEvents.length})</Text>
        {myEvents.length === 0 ? (
          <Text style={styles.noEventsText}>Aucun événement créé</Text>
        ) : (
          <View style={styles.eventsList}>
            {myEvents.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventItem}
                onPress={() => {
                  const friendsFormatted = friends.map(friend => ({
                    id: friend.id,
                    userId: auth.currentUser!.uid,
                    friendId: friend.id,
                    status: 'accepted' as const,
                    createdAt: friend.createdAt,
                    friendData: friend
                  }));
                  navigation.navigate('EditEvent', { event, friends: friendsFormatted });
                }}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteEvent(event.id);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.eventDate}>
                  {new Date(event.startDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                  {event.startDate !== event.endDate && 
                    ` - ${new Date(event.endDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}`
                  }
                </Text>
                <Text style={styles.eventTime}>
                  {event.startTime} - {event.endTime}
                </Text>
                <Text style={styles.eventParticipants}>
                  {event.participants.length} participant(s)
                </Text>
                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Modals pour les sélecteurs de temps */}

      <Modal visible={showStartTime} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Heure de début</Text>
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              textColor="#1A3B5C"
              accentColor="#1A3B5C"
              onChange={(event, time) => {
                if (time) setStartTime(time);
              }}
              style={styles.picker}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowStartTime(false)}
            >
              <Text style={styles.modalButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEndTime} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Heure de fin</Text>
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              textColor="#1A3B5C"
              accentColor="#1A3B5C"
              onChange={(event, time) => {
                if (time) setEndTime(time);
              }}
              style={styles.picker}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowEndTime(false)}
            >
              <Text style={styles.modalButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal pour la date de début de recherche */}
      <Modal visible={showSearchDatePicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Date de début de recherche</Text>
            <DateTimePicker
              value={searchStartDate}
              mode="date"
              display="spinner"
              textColor="#1A3B5C"
              accentColor="#1A3B5C"
              minimumDate={new Date()}
              onChange={(event, date) => {
                if (date) setSearchStartDate(date);
              }}
              style={styles.picker}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSearchDatePicker(false)}
            >
              <Text style={styles.modalButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection des créneaux */}
      <Modal visible={showSlotSelector} transparent={true} animationType="slide">
        <View style={styles.slotModalOverlay}>
          <View style={styles.slotModalContainer}>
            <View style={styles.slotModalHeader}>
              <Text style={styles.slotModalTitle}>Créneaux disponibles</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSlotSelector(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.slotsList}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotItem,
                    selectedSlot === slot && styles.selectedSlotItem
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotDate, selectedSlot === slot && styles.selectedSlotText]}>
                    {slot.startDate.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {slot.startDate.toDateString() !== slot.endDate.toDateString() &&
                      ` - ${slot.endDate.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}`}
                  </Text>
                  <Text style={[styles.slotTime, selectedSlot === slot && styles.selectedSlotText]}>
                    {slot.startDate.toTimeString().slice(0, 5)} - {slot.endDate.toTimeString().slice(0, 5)}
                  </Text>
                  <Text style={[styles.slotParticipants, selectedSlot === slot && styles.selectedSlotText]}>
                    {slot.availableUsers.length} participant(s) disponible(s)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedSlot && (
              <TouchableOpacity
                style={[styles.button, styles.createEventButton]}
                onPress={createEvent}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Création...' : 'Créer l\'événement'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de la durée */}
      <Modal
        visible={showDurationPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <View style={styles.slotModalOverlay}>
          <View style={styles.durationModalContainer}>
            <View style={styles.slotModalHeader}>
              <Text style={styles.slotModalTitle}>Durée en jours</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDurationPicker(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.durationList}>
              {[1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationItem,
                    durationDays === days.toString() && styles.selectedDurationItem
                  ]}
                  onPress={() => {
                    setDurationDays(days.toString());
                    setShowDurationPicker(false);
                  }}
                >
                  <Text style={[
                    styles.durationItemText,
                    durationDays === days.toString() && styles.selectedDurationText
                  ]}>
                    {days} jour{days > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#1A3B5C',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingTop: 80,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  form: {
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 15,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  input: {
    height: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    marginBottom: 16,
    color: '#1A3B5C',
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    fontWeight: '500',
  },
  textArea: {
    height: 88,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  friendItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFriend: {
    backgroundColor: '#1A3B5C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  friendName: {
    fontSize: 15,
    color: '#1A3B5C',
    fontWeight: '600',
  },
  selectedFriendText: {
    color: '#FFFFFF',
  },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButton: {
    height: 56,
    backgroundColor: '#1A3B5C',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    shadowColor: '#1A3B5C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  searchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: Colors.secondary,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedSlot: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dateTimeSection: {
    marginBottom: 24,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#FFB800',
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    color: '#1A3B5C',
    letterSpacing: 0.3,
  },
  modalButton: {
    backgroundColor: '#1A3B5C',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  picker: {
    width: 250,
    height: 180,
    backgroundColor: 'white',
  },
  slotModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  slotModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  slotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  slotModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '700',
  },
  slotsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  slotItem: {
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 18,
    marginVertical: 8,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedSlotItem: {
    backgroundColor: '#1A3B5C',
    borderLeftColor: '#FFB800',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  slotDate: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  slotTime: {
    fontSize: 15,
    color: '#1A3B5C',
    marginBottom: 4,
    fontWeight: '600',
  },
  slotParticipants: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '600',
  },
  selectedSlotText: {
    color: '#FFFFFF',
  },
  createEventButton: {
    backgroundColor: '#1A3B5C',
    marginHorizontal: 20,
    marginTop: 16,
    height: 56,
    borderRadius: 18,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  searchModeSection: {
    marginBottom: 24,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedModeButton: {
    backgroundColor: '#1A3B5C',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3B5C',
  },
  selectedModeButtonText: {
    color: '#FFFFFF',
  },
  durationSelector: {
    height: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  durationSelectorText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '600',
  },
  durationSelectorIcon: {
    fontSize: 18,
    color: '#1A3B5C',
    fontWeight: '700',
  },
  durationModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '60%',
    paddingBottom: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  durationList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  durationItem: {
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 18,
    marginVertical: 6,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDurationItem: {
    backgroundColor: '#1A3B5C',
    borderLeftColor: '#FFB800',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  durationItemText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A3B5C',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  selectedDurationText: {
    color: '#FFFFFF',
  },
  myEventsSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 15,
    borderRadius: 28,
    marginBottom: 140,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  noEventsText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 25,
    opacity: 0.8,
  },
  eventsList: {
    marginTop: 8,
  },
  eventItem: {
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3B5C',
    flex: 1,
    letterSpacing: 0.2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  eventDate: {
    fontSize: 15,
    color: '#1A3B5C',
    fontWeight: '600',
    marginBottom: 6,
  },
  eventTime: {
    fontSize: 14,
    color: '#1A3B5C',
    fontWeight: '600',
    marginBottom: 6,
  },
  eventParticipants: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '600',
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 13,
    color: '#2C3E50',
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.8,
  },
  searchDateSection: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 16,
    borderWidth: 0,
    marginTop: 8,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '700',
    textAlign: 'center',
  },
  dateButtonHint: {
    fontSize: 12,
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});