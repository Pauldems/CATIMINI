import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Friend, User, Event, Availability } from '../../../types';
import { useCurrentGroup } from '../../../hooks/useCurrentGroup';
import { Colors } from '../../../theme/colors';

interface EditEventScreenProps {
  navigation: any;
  route: {
    params: {
      event: Event;
      friends: (Friend & { friendData?: User })[];
    };
  };
}

export default function EditEventScreen({ navigation, route }: EditEventScreenProps) {
  const { event, friends } = route.params;
  const { currentGroup } = useCurrentGroup();
  
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    event.participants.filter(id => id !== auth.currentUser!.uid)
  );
  const [loading, setLoading] = useState(false);
  
  const [unavailabilities, setUnavailabilities] = useState<{ [userId: string]: Availability[] }>({});

  useEffect(() => {
    loadUnavailabilities();
  }, []);

  const loadUnavailabilities = async () => {
    const availQuery = query(collection(db, 'availabilities'));
    const snapshot = await getDocs(availQuery);
    
    const allUnavails: { [userId: string]: Availability[] } = {};
    snapshot.forEach((doc) => {
      const data = doc.data() as Availability;
      if (!data.isAvailable) {
        if (!allUnavails[data.userId]) {
          allUnavails[data.userId] = [];
        }
        allUnavails[data.userId].push({ ...data, id: doc.id });
      }
    });
    
    setUnavailabilities(allUnavails);
  };

  const checkConflict = (friendId: string): boolean => {
    const friendUnavails = unavailabilities[friendId] || [];
    
    // Vérifier chaque jour de l'événement
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    
    for (let date = new Date(eventStart); date <= eventEnd; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Chercher les indisponibilités pour cette date (en excluant celles créées par cet événement)
      const dayUnavails = friendUnavails.filter(avail => 
        avail.date === dateStr && avail.createdByEvent !== event.id
      );
      
      for (const unavail of dayUnavails) {
        // Convertir les heures en minutes
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

  const toggleFriend = (friendId: string) => {
    if (!selectedFriends.includes(friendId) && checkConflict(friendId)) {
      Alert.alert(
        'Participant indisponible',
        'Cette personne a une indisponibilité qui entre en conflit avec l\'événement.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const updateEventUnavailabilities = async (
    eventId: string,
    oldParticipants: string[],
    newParticipants: string[],
    newStartDate: Date,
    newEndDate: Date,
    newStartTime: string,
    newEndTime: string
  ) => {
    try {
      // Supprimer les anciennes indisponibilités créées par cet événement
      const oldUnavailsQuery = query(
        collection(db, 'availabilities'),
        where('createdByEvent', '==', eventId)
      );
      const oldSnapshot = await getDocs(oldUnavailsQuery);
      
      const deletePromises = oldSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Créer les nouvelles indisponibilités pour tous les participants
      const createPromises = newParticipants.map(async (participantId) => {
        const currentDate = new Date(newStartDate);
        const promises = [];
        
        while (currentDate <= newEndDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          promises.push(addDoc(collection(db, 'availabilities'), {
            userId: participantId,
            date: dateStr,
            startTime: newStartTime,
            endTime: newEndTime,
            isAvailable: false,
            createdAt: new Date(),
            createdByEvent: eventId,
            groupId: currentGroup?.id,
          }));
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return Promise.all(promises);
      });
      
      await Promise.all(createPromises);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des indisponibilités:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }


    setLoading(true);

    try {
      const newParticipants = [...selectedFriends, auth.currentUser!.uid];

      // Mettre à jour l'événement
      await updateDoc(doc(db, 'events', event.id), {
        title: title.trim(),
        description: description.trim(),
        participants: newParticipants,
        updatedAt: new Date(),
      });

      // Mettre à jour les indisponibilités seulement si les participants ont changé
      if (JSON.stringify(event.participants.sort()) !== JSON.stringify(newParticipants.sort())) {
        await updateEventUnavailabilities(
          event.id,
          event.participants,
          newParticipants,
          new Date(event.startDate),
          new Date(event.endDate),
          event.startTime,
          event.endTime
        );
      }

      Alert.alert('Succès', 'Événement modifié avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Supprimer les indisponibilités créées par cet événement
              const unavailsQuery = query(
                collection(db, 'availabilities'),
                where('createdByEvent', '==', event.id)
              );
              const snapshot = await getDocs(unavailsQuery);
              
              const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              // Supprimer l'événement
              await deleteDoc(doc(db, 'events', event.id));
              
              Alert.alert('Succès', 'Événement supprimé avec succès', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
              
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier l'événement</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            placeholder="Titre de l'événement"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optionnelle)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />


          <Text style={styles.label}>Participants</Text>
          <View style={styles.friendsList}>
            {friends.map((friend) => (
              friend.friendData && (
                <TouchableOpacity
                  key={friend.friendData.id}
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(friend.friendData.id) && styles.selectedFriend,
                    checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && styles.conflictFriend
                  ]}
                  onPress={() => toggleFriend(friend.friendData!.id)}
                >
                  <View style={styles.friendContent}>
                    <Text style={[
                      styles.friendName,
                      selectedFriends.includes(friend.friendData.id) && styles.selectedFriendText,
                      checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && styles.conflictFriendText
                    ]}>
                      {friend.friendData.displayName}
                    </Text>
                    {checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && (
                      <Ionicons name="warning" size={16} color="#FF9500" style={styles.warningIcon} />
                    )}
                  </View>
                  {selectedFriends.includes(friend.friendData.id) && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Modification...' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  friendsList: {
    marginTop: 8,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedFriend: {
    backgroundColor: '#E3F2FD',
    borderColor: Colors.primary,
  },
  friendName: {
    fontSize: 16,
    color: '#000',
  },
  selectedFriendText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  conflictFriend: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9500',
  },
  conflictFriendText: {
    color: '#FF9500',
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  warningIcon: {
    marginLeft: 6,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#8E8E93',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});