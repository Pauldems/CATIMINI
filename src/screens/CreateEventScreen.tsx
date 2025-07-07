import React, { useState, useEffect } from 'react';
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
import { auth, db } from '../config/firebase';
import { Friend, User, Availability, TimeSlot, Event } from '../types';
import { findAvailableSlots } from '../utils/slotFinder';
import { checkMultiParticipantConflicts, summarizeConflicts } from '../utils/conflictChecker';
import notificationService from '../services/notificationService';

export default function CreateEventScreen({ navigation }: any) {
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

  useEffect(() => {
    loadFriends();
    loadMyEvents();
    loadAllEvents();
    
    // Réinitialiser les champs quand on revient sur cet écran
    const unsubscribe = navigation.addListener('focus', () => {
      resetForm();
    });

    return unsubscribe;
  }, [navigation]);

  const loadFriends = async () => {
    if (!auth.currentUser) return;

    try {
      const friendsQuery = query(
        collection(db, 'friends'),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'accepted')
      );

      const snapshot = await getDocs(friendsQuery);
      const friendIds = snapshot.docs.map((doc) => doc.data().friendId);

      const friendsData: User[] = [];
      const names: { [userId: string]: string } = {};
      
      for (const friendId of friendIds) {
        const userDoc = await getDoc(doc(db, 'users', friendId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          friendsData.push(userData);
          names[friendId] = userData.displayName;
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
    if (!auth.currentUser) return;

    const eventsQuery = query(
      collection(db, 'events'),
      where('creatorId', '==', auth.currentUser.uid)
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
    if (!auth.currentUser) return;

    const eventsQuery = query(collection(db, 'events'));

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ ...doc.data(), id: doc.id } as Event);
      });
      setAllEvents(eventsData);
    });

    return unsubscribe;
  };

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
    try {
      const participants = [...selectedFriends, auth.currentUser!.uid];
      const availabilities: { [userId: string]: Availability[] } = {};

      // Charger les disponibilités de tous les participants
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
      }

      let durationInDays: number;
      let searchStartDate: Date;

      if (searchMode === 'time') {
        durationInDays = 1;
        searchStartDate = new Date();
      } else {
        durationInDays = parseInt(durationDays);
        searchStartDate = new Date();
      }
      
      const slots = findAvailableSlots(
        availabilities,
        participants,
        durationInDays,
        searchStartDate,
        searchMode === 'time' ? startTime : undefined,
        searchMode === 'time' ? endTime : undefined,
        allEvents
      );

      if (slots.length === 0) {
        Alert.alert(
          'Aucun créneau trouvé',
          'Impossible de trouver un créneau où tous les participants sont disponibles'
        );
      } else {
        setAvailableSlots(slots);
        setShowSlotSelector(true);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!selectedSlot) {
      Alert.alert('Erreur', 'Veuillez sélectionner un créneau');
      return;
    }

    // Vérifier les conflits avant la création
    const participants = [...selectedFriends, auth.currentUser!.uid];
    const startTime = selectedSlot.startDate.toTimeString().slice(0, 5);
    const endTime = selectedSlot.endDate.toTimeString().slice(0, 5);

    const conflictResults = checkMultiParticipantConflicts(
      participants,
      selectedSlot.startDate,
      selectedSlot.endDate,
      startTime,
      endTime,
      allEvents
    );

    const conflictSummary = summarizeConflicts(conflictResults, participantNames);

    if (conflictSummary.hasAnyConflict) {
      Alert.alert(
        'Conflit détecté',
        `${conflictSummary.conflictingSummary}\n\nVoulez-vous créer l'événement quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Créer quand même', onPress: () => proceedWithEventCreation() }
        ]
      );
      return;
    }

    // Pas de conflit, créer l'événement directement
    await proceedWithEventCreation();
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
        createdAt: new Date(),
      });

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
    <ScrollView style={styles.container}>
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
            <TextInput
              style={styles.input}
              placeholder="Nombre de jours"
              placeholderTextColor="#999"
              value={durationDays}
              onChangeText={setDurationDays}
              keyboardType="numeric"
            />
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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={searchSlots}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Recherche...' : 'Rechercher des créneaux'}
          </Text>
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
              <View key={event.id} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteEvent(event.id)}
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
              </View>
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
              textColor="#000000"
              accentColor="#007AFF"
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
              textColor="#000000"
              accentColor="#007AFF"
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: '#000',
    padding: 18,
    paddingTop: 80,
    paddingBottom: 12,
  },
  form: {
    paddingHorizontal: 20,
  },
  input: {
    height: 48,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 14,
    color: '#000',
  },
  textArea: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 14,
    marginTop: 6,
  },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  friendItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  selectedFriend: {
    backgroundColor: '#007AFF',
  },
  friendName: {
    fontSize: 15,
    color: '#000',
  },
  selectedFriendText: {
    color: '#FFF',
  },
  button: {
    height: 48,
    backgroundColor: '#000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#4CAF50',
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
    borderColor: '#007AFF',
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
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E6',
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  slotsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  slotItem: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSlotItem: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  slotTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  slotParticipants: {
    fontSize: 13,
    color: '#999',
  },
  selectedSlotText: {
    color: 'white',
  },
  createEventButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginTop: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedModeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedModeButtonText: {
    color: 'white',
  },
  myEventsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  noEventsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  eventsList: {
    marginTop: 8,
  },
  eventItem: {
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E1E6',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventParticipants: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});