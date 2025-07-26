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
import notificationService from '../../../services/notificationService';

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
        if (!(eventEndMinutes <= unavailStartMinutes || eventStartMinutes >= unavailEndMinutes)) {
          return true; // Conflit trouvé
        }
      }
    }
    
    return false;
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    setLoading(true);

    try {
      const allParticipants = [auth.currentUser!.uid, ...selectedFriends];
      
      // Identifier les participants retirés
      const removedParticipants = event.participants.filter(
        participantId => participantId !== auth.currentUser!.uid && !selectedFriends.includes(participantId)
      );
      
      // Mettre à jour l'événement
      await updateDoc(doc(db, 'events', event.id), {
        title: title.trim(),
        description: description.trim(),
        participants: allParticipants,
        updatedAt: new Date(),
      });

      // Gérer les indisponibilités pour les participants
      await updateParticipantAvailabilities(allParticipants);
      
      // Envoyer des notifications aux participants retirés
      if (removedParticipants.length > 0) {
        for (const removedUserId of removedParticipants) {
          await notificationService.sendNotification(
            removedUserId,
            'Retiré d\'un événement',
            `Vous avez été retiré de l'événement : ${title.trim()}`,
            'event_participant_removed',
            {
              eventId: event.id,
              eventTitle: title.trim(),
              groupId: currentGroup?.id
            }
          );
        }
      }

      Alert.alert('Succès', 'L\'événement a été modifié');
      navigation.goBack();
    } catch (error) {
      console.error('Erreur modification événement:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const updateParticipantAvailabilities = async (participants: string[]) => {
    // Supprimer les anciennes indisponibilités créées par cet événement
    const oldAvailQuery = query(
      collection(db, 'availabilities'),
      where('createdByEvent', '==', event.id)
    );
    const oldAvailSnapshot = await getDocs(oldAvailQuery);
    
    for (const doc of oldAvailSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Créer de nouvelles indisponibilités pour tous les participants
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    
    for (const userId of participants) {
      for (let date = new Date(eventStart); date <= eventEnd; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        await addDoc(collection(db, 'availabilities'), {
          userId,
          date: dateStr,
          startTime: event.startTime,
          endTime: event.endTime,
          isAvailable: false,
          createdByEvent: event.id,
          createdAt: new Date(),
        });
      }
    }
  };

  const handleDelete = () => {
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
              // Supprimer toutes les indisponibilités créées par cet événement
              const availQuery = query(
                collection(db, 'availabilities'),
                where('createdByEvent', '==', event.id)
              );
              const availSnapshot = await getDocs(availQuery);
              
              for (const doc of availSnapshot.docs) {
                await deleteDoc(doc.ref);
              }

              // Supprimer l'événement
              await deleteDoc(doc(db, 'events', event.id));
              
              Alert.alert('Succès', 'L\'événement a été supprimé');
              navigation.navigate('Events');
            } catch (error) {
              console.error('Erreur suppression événement:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Modifier l'événement</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1A3B5C" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Titre de l'événement"
              placeholderTextColor="rgba(26, 59, 92, 0.4)"
              value={title}
              onChangeText={setTitle}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.multilineInput}
              placeholder="Description (optionnel)"
              placeholderTextColor="rgba(26, 59, 92, 0.4)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date et heure</Text>
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeInfo}>
              <Ionicons name="calendar-outline" size={20} color="#FFB800" />
              <Text style={styles.dateTimeText}>
                Du {new Date(event.startDate).toLocaleDateString('fr-FR')} au {new Date(event.endDate).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            
            <View style={[styles.dateTimeInfo, { marginTop: 12 }]}>
              <Ionicons name="time-outline" size={20} color="#FFB800" />
              <Text style={styles.dateTimeText}>
                De {event.startTime} à {event.endTime}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants ({selectedFriends.length + 1})</Text>
          
          <View style={styles.friendsList}>
            {friends.map((friend) => (
              friend.friendData && (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(friend.friendData.id) && styles.selectedFriend,
                    checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && styles.conflictFriend,
                  ]}
                  onPress={() => toggleFriendSelection(friend.friendData.id)}
                >
                  <View style={styles.friendContent}>
                    <Text style={[
                      styles.friendName,
                      selectedFriends.includes(friend.friendData.id) && styles.selectedFriendText,
                      checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && styles.conflictFriendText,
                    ]}>
                      {friend.friendData.displayName}
                    </Text>
                    {checkConflict(friend.friendData.id) && !selectedFriends.includes(friend.friendData.id) && (
                      <Ionicons name="warning" size={16} color="#FF9500" style={styles.warningIcon} />
                    )}
                  </View>
                  {selectedFriends.includes(friend.friendData.id) && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark" size={16} color="#1A3B5C" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Modification...' : 'Sauvegarder les modifications'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.deleteButtonText}>Supprimer l'événement</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 59, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Sections avec style iOS
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB800',
    marginBottom: 16,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  
  // Input containers avec effet flottant
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0,
  },
  input: {
    fontSize: 17,
    color: '#1A3B5C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 17,
    color: '#1A3B5C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Container pour date/heure avec style card
  dateTimeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '600',
    marginLeft: 12,
  },
  
  // Liste des amis
  friendsList: {
    marginTop: 0,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedFriend: {
    backgroundColor: '#1A3B5C',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  friendName: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  selectedFriendText: {
    color: '#FFFFFF',
  },
  conflictFriend: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderWidth: 1.5,
    borderColor: '#FFB800',
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
    marginLeft: 8,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Bouton de sauvegarde avec style premium
  saveButton: {
    backgroundColor: '#1A3B5C',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.6)',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  
  // Bouton supprimer
  deleteButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});