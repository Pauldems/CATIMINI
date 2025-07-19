import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayRemove,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import premiumService from '../../../services/premiumService';
import { Availability, Event, User } from '../../../types';
import notificationService from '../../../services/notificationService';
import { useCurrentGroup } from '../../../hooks/useCurrentGroup';
import GroupRequiredScreen from './GroupRequiredScreen';
import { Colors } from '../../../theme/colors';

export default function AvailabilityScreen({ navigation }: any) {
  const { currentGroup, loading: groupLoading, needsGroupSelection } = useCurrentGroup();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    // Sélectionner aujourd'hui par défaut
    return new Date().toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const time = new Date();
    time.setHours(9, 0, 0, 0);
    return time;
  });
  const [endTime, setEndTime] = useState(() => {
    const time = new Date();
    time.setHours(18, 0, 0, 0);
    return time;
  });
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [availabilities, setAvailabilities] = useState<{ [key: string]: Availability[] }>({});
  const [events, setEvents] = useState<Event[]>([]); // Événements d'affichage (seulement mes événements)
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Tous les événements (pour conflits)
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Listener pour remettre la page en haut quand on arrive sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Rafraîchir les données quand on revient sur l'onglet
      setRefreshTrigger(prev => prev + 1);
      // Remettre la date d'aujourd'hui par défaut
      const today = new Date().toISOString().split('T')[0];
      setSelectedStartDate(today);
      setSelectedEndDate('');
      setIsMultiDay(false);
      // Fermer le tooltip
      setShowTooltip(false);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!auth.currentUser || !currentGroup) return;

    const q = query(
      collection(db, 'availabilities'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const avails: { [key: string]: Availability[] } = {};
      const marked: any = {};

      console.log(`📅 Récupération des indispos pour ${auth.currentUser.uid}, total: ${snapshot.size}`);

      snapshot.forEach((doc) => {
        const data = doc.data() as Availability;
        const date = data.date;
        
        if (!avails[date]) {
          avails[date] = [];
        }
        avails[date].push({ ...data, id: doc.id });
        
        // Marquer les indisponibilités avec couleurs du logo (bleu)
        if (!data.isAvailable) {
          console.log(`🔵 Indispo trouvée pour ${date}: ${data.startTime} - ${data.endTime}, createdByEvent: ${data.createdByEvent}`);
          marked[date] = {
            marked: true,
            dotColor: '#1A3B5C',
            customStyles: {
              container: {
                backgroundColor: '#1A3B5C',
                borderRadius: 25,
                width: 35,
                height: 35,
              },
              text: {
                color: '#FFFFFF',
                fontWeight: '600',
                fontSize: 14
              }
            }
          };
        }
      });

      setAvailabilities(avails);
      console.log('📍 Dates marquées en rouge:', Object.keys(marked));
      setMarkedDates(marked);
    });

    // Charger seulement les événements du groupe actuel
    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', currentGroup.id)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = []; // Pour l'affichage (seulement mes événements)
      const allEvents: Event[] = []; // Pour les conflits (tous les événements)
      const eventMarked: any = {};
      
      snapshot.forEach((doc) => {
        const eventData = { ...doc.data(), id: doc.id } as Event;
        
        // Ajouter à la liste complète pour les conflits
        allEvents.push(eventData);
        
        // Dans l'agenda, traiter seulement les événements où l'utilisateur participe
        if (eventData.participants.includes(auth.currentUser!.uid)) {
          // Ajouter l'événement à la liste d'affichage
          eventsData.push(eventData);
          // Marquer chaque jour de l'événement avec couleur jaune du logo
          const startDate = new Date(eventData.startDate);
          const endDate = new Date(eventData.endDate);
          
          // Marquer toutes les dates de l'événement en jaune (couleur des événements)
          for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            eventMarked[dateStr] = {
              marked: true,
              dotColor: '#FFB800',
              customStyles: {
                container: {
                  backgroundColor: 'transparent',
                  borderRadius: 25,
                  borderWidth: 2,
                  borderColor: '#FFB800',
                  width: 35,
                  height: 35,
                },
                text: {
                  color: '#1A1A1A',
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          }
        }
      });
      
      
      setEvents(eventsData);
      // Stocker tous les événements pour la détection de conflits
      setAllEvents(allEvents);
      
      // Combiner intelligemment les marqueurs d'événements avec les indispos
      setMarkedDates(prevMarked => {
        const combinedMarkers: any = {};
        
        // D'abord ajouter tous les marqueurs d'événements
        Object.keys(eventMarked).forEach(date => {
          combinedMarkers[date] = eventMarked[date];
        });
        
        // Ensuite traiter les indisponibilités
        Object.keys(prevMarked).forEach(date => {
          if (combinedMarkers[date]) {
            // Cette date a déjà un événement ET une indispo
            // Priorité à l'indispo (rond bleu) avec bordure jaune pour l'événement
            combinedMarkers[date] = {
              marked: true,
              dotColor: '#FFB800', // Point jaune pour indiquer l'événement
              customStyles: {
                container: {
                  backgroundColor: '#1A3B5C', // Fond bleu de l'indispo
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                  borderWidth: 2,
                  borderColor: '#FFB800', // Bordure jaune pour l'événement
                },
                text: {
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          } else {
            // Pas d'événement, juste l'indispo
            combinedMarkers[date] = prevMarked[date];
          }
        });
        
        return combinedMarkers;
      });
    });

    return () => {
      unsubscribe();
      unsubscribeEvents();
    };
  }, [currentGroup, refreshTrigger]);

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

  const handleDayPress = (day: DateData) => {
    console.log('🔄 Clic sur date:', day.dateString, 'Start:', selectedStartDate, 'End:', selectedEndDate);
    
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Première sélection ou nouvelle sélection (redémarrage)
      console.log('🎯 Nouvelle sélection');
      setSelectedStartDate(day.dateString);
      setSelectedEndDate('');
      setIsMultiDay(false);
    } else if (selectedStartDate && !selectedEndDate) {
      // Deuxième sélection - créer une plage
      console.log('📊 Création de plage');
      const startDate = new Date(selectedStartDate);
      const endDate = new Date(day.dateString);
      
      if (endDate >= startDate) {
        setSelectedEndDate(day.dateString);
        setIsMultiDay(true);
      } else {
        // Si la date de fin est antérieure, inverser
        setSelectedStartDate(day.dateString);
        setSelectedEndDate(selectedStartDate);
        setIsMultiDay(true);
      }
    }
  };

  const handleAddUnavailability = async () => {
    if (!selectedStartDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une date');
      return;
    }

    if (!auth.currentUser) return;

    try {
      const dates = [];
      const start = new Date(selectedStartDate);
      const end = selectedEndDate ? new Date(selectedEndDate) : start;
      
      // Générer toutes les dates entre start et end
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(date.toISOString().split('T')[0]);
      }

      // Vérifier les conflits avec les événements existants
      const conflictingEvents = allEvents.filter(event => {
        // Vérifier d'abord si l'utilisateur participe à cet événement
        if (!event.participants.includes(auth.currentUser!.uid)) {
          return false;
        }
        
        // Vérifier si l'événement chevauche avec les dates d'indisponibilité
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        const hasDateOverlap = dates.some(dateStr => {
          const unavailDate = new Date(dateStr);
          return unavailDate >= eventStart && unavailDate <= eventEnd;
        });

        if (!hasDateOverlap) return false;

        // Vérifier si les heures se chevauchent
        const unavailStartHour = startTime.getHours();
        const unavailStartMin = startTime.getMinutes();
        const unavailEndHour = endTime.getHours();
        const unavailEndMin = endTime.getMinutes();

        const [eventStartHour, eventStartMin] = event.startTime.split(':').map(Number);
        const [eventEndHour, eventEndMin] = event.endTime.split(':').map(Number);

        // Convertir en minutes pour faciliter la comparaison
        const unavailStart = unavailStartHour * 60 + unavailStartMin;
        const unavailEnd = unavailEndHour * 60 + unavailEndMin;
        const eventStartMinutes = eventStartHour * 60 + eventStartMin;
        const eventEndMinutes = eventEndHour * 60 + eventEndMin;

        // Vérifier le chevauchement d'heures
        return (unavailStart < eventEndMinutes && unavailEnd > eventStartMinutes);
      });

      if (conflictingEvents.length > 0) {
        // Il y a des conflits, demander confirmation
        const eventTitles = conflictingEvents.map(e => e.title).join(', ');
        Alert.alert(
          'Conflit détecté',
          `Cette indisponibilité entre en conflit avec ${conflictingEvents.length} événement(s) : ${eventTitles}.\n\nVoulez-vous vous désinscrire de ces événements et ajouter l'indisponibilité ?`,
          [
            {
              text: 'Annuler',
              style: 'cancel'
            },
            {
              text: 'Me désinscrire et continuer',
              style: 'destructive',
              onPress: () => handleConflictResolution(conflictingEvents, dates)
            }
          ]
        );
        return;
      }

      // Pas de conflit, ajouter l'indisponibilité normalement
      await addUnavailabilityDates(dates);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const addUnavailabilityDates = async (dates: string[], createdByEvent?: string) => {
    if (!auth.currentUser) return;

    try {
      // D'abord, retirer l'utilisateur des événements en conflit (seulement pour les indisponibilités manuelles)
      const conflictingEvents = createdByEvent ? [] : await removeUserFromConflictingEvents(dates, startTime, endTime);
      
      // Créer une indisponibilité individuelle pour chaque date
      for (const dateStr of dates) {
        await addOrMergeUnavailability(dateStr, startTime, endTime, undefined); // Pas de groupId = indispos individuelles
      }

      let message = `Indisponibilité ajoutée pour ${dates.length} jour(s)`;
      if (conflictingEvents.length > 0) {
        message += `\n\nVous avez été automatiquement retiré de ${conflictingEvents.length} événement(s) en conflit.`;
      }

      Alert.alert('Succès', message);
      setSelectedStartDate('');
      setSelectedEndDate('');
      setIsMultiDay(false);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const removeUserFromConflictingEvents = async (dates: string[], unavailStartTime: Date, unavailEndTime: Date) => {
    if (!auth.currentUser) return [];

    try {
      // Récupérer tous les événements où l'utilisateur participe
      const userEventsQuery = query(
        collection(db, 'events'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      const userEventsSnapshot = await getDocs(userEventsQuery);
      const conflictingEvents: Event[] = [];

      // Vérifier chaque événement pour les conflits
      for (const eventDoc of userEventsSnapshot.docs) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
        
        // Vérifier si l'événement chevauche avec les dates d'indisponibilité
        const eventStart = new Date(eventData.startDate);
        const eventEnd = new Date(eventData.endDate);
        
        const hasDateOverlap = dates.some(dateStr => {
          const unavailDate = new Date(dateStr);
          return unavailDate >= eventStart && unavailDate <= eventEnd;
        });

        if (hasDateOverlap) {
          // Vérifier le chevauchement horaire
          const hasTimeOverlap = dates.some(dateStr => {
            const eventStart = new Date(eventData.startDate);
            const eventEnd = new Date(eventData.endDate);
            const unavailDate = new Date(dateStr);
            
            if (unavailDate >= eventStart && unavailDate <= eventEnd) {
              const startHour = unavailStartTime.getHours();
              const startMin = unavailStartTime.getMinutes();
              const endHour = unavailEndTime.getHours();
              const endMin = unavailEndTime.getMinutes();

              const [eventStartHour, eventStartMin] = eventData.startTime.split(':').map(Number);
              const [eventEndHour, eventEndMin] = eventData.endTime.split(':').map(Number);

              const unavailStart = startHour * 60 + startMin;
              const unavailEnd = endHour * 60 + endMin;
              const eventStartMinutes = eventStartHour * 60 + eventStartMin;
              const eventEndMinutes = eventEndHour * 60 + eventEndMin;

              return (unavailStart < eventEndMinutes && unavailEnd > eventStartMinutes);
            }
            return false;
          });

          if (hasTimeOverlap) {
            conflictingEvents.push(eventData);
          }
        }
      }

      // Retirer l'utilisateur des événements en conflit et envoyer des notifications
      if (conflictingEvents.length > 0) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const currentUser = userDoc.data() as User;

        for (const event of conflictingEvents) {
          await updateDoc(doc(db, 'events', event.id), {
            participants: arrayRemove(auth.currentUser.uid),
            confirmedParticipants: arrayRemove(auth.currentUser.uid)
          });
          
          // Envoyer des notifications aux autres participants
          const otherParticipants = event.participants.filter(id => id !== auth.currentUser.uid);
          await notificationService.createUnavailabilityNotification(
            currentUser.displayName,
            event.title,
            event.id,
            otherParticipants
          );
        }
      }

      return conflictingEvents;
    } catch (error) {
      console.error('Erreur lors de la suppression des conflits:', error);
      return [];
    }
  };

  const addOrMergeUnavailability = async (dateStr: string, newStartTime: Date, newEndTime: Date, groupId?: string) => {
    if (!auth.currentUser) return;

    // Vérifier la limite pour les utilisateurs gratuits
    if (!premiumService.isPremium()) {
      // Compter toutes les indisponibilités de l'utilisateur
      const availsQuery = query(
        collection(db, 'availabilities'),
        where('userId', '==', auth.currentUser.uid),
        where('isAvailable', '==', false)
      );
      const snapshot = await getDocs(availsQuery);
      
      if (snapshot.size >= premiumService.getAvailabilityLimit()) {
        Alert.alert(
          '🌟 Limite atteinte',
          `Vous avez atteint la limite de ${premiumService.getAvailabilityLimit()} indisponibilités en version gratuite.\n\nPassez à Créno Premium pour ajouter des indisponibilités illimitées et supprimer les publicités !`,
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Voir Premium', 
              onPress: () => navigation.navigate('Settings', { showPremium: true })
            }
          ]
        );
        return;
      }
    }

    // Récupérer les indisponibilités existantes pour cette date
    const existingUnavails = availabilities[dateStr]?.filter(a => !a.isAvailable) || [];
    
    if (existingUnavails.length === 0) {
      // Pas d'indisponibilités existantes, créer directement
      await addDoc(collection(db, 'availabilities'), {
        userId: auth.currentUser.uid,
        date: dateStr,
        startTime: newStartTime.toTimeString().slice(0, 5),
        endTime: newEndTime.toTimeString().slice(0, 5),
        isAvailable: false,
        createdAt: new Date(),
      });
      return;
    }

    // Convertir les heures en minutes pour faciliter la comparaison
    const newStartMinutes = newStartTime.getHours() * 60 + newStartTime.getMinutes();
    const newEndMinutes = newEndTime.getHours() * 60 + newEndTime.getMinutes();

    // Récupérer toutes les plages existantes
    const existingRanges = existingUnavails.map(unavail => {
      const [startHour, startMin] = unavail.startTime.split(':').map(Number);
      const [endHour, endMin] = unavail.endTime.split(':').map(Number);
      return {
        id: unavail.id,
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
      };
    });

    // Ajouter la nouvelle plage
    const allRanges = [...existingRanges, { 
      id: 'new', 
      start: newStartMinutes, 
      end: newEndMinutes 
    }];

    // Trier par heure de début
    allRanges.sort((a, b) => a.start - b.start);

    // Fusionner les plages qui se chevauchent ou se touchent
    const mergedRanges = [];
    let currentRange = allRanges[0];

    for (let i = 1; i < allRanges.length; i++) {
      const nextRange = allRanges[i];
      
      // Si les plages se chevauchent ou se touchent (écart de 1 minute toléré)
      if (currentRange.end >= nextRange.start - 1) {
        // Fusionner les plages
        currentRange = {
          id: 'merged',
          start: currentRange.start,
          end: Math.max(currentRange.end, nextRange.end)
        };
      } else {
        // Pas de chevauchement, ajouter la plage actuelle et passer à la suivante
        mergedRanges.push(currentRange);
        currentRange = nextRange;
      }
    }
    mergedRanges.push(currentRange);

    // Supprimer toutes les anciennes indisponibilités pour cette date
    for (const unavail of existingUnavails) {
      await deleteDoc(doc(db, 'availabilities', unavail.id));
    }

    // Créer les nouvelles indisponibilités fusionnées
    for (const range of mergedRanges) {
      const startHour = Math.floor(range.start / 60);
      const startMin = range.start % 60;
      const endHour = Math.floor(range.end / 60);
      const endMin = range.end % 60;

      await addDoc(collection(db, 'availabilities'), {
        userId: auth.currentUser.uid,
        date: dateStr,
        startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        isAvailable: false,
        createdAt: new Date(),
      });
    }
  };

  const handleConflictResolution = async (conflictingEvents: Event[], dates: string[]) => {
    if (!auth.currentUser) return;

    try {
      // Récupérer les informations de l'utilisateur actuel
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const currentUser = userDoc.data() as User;
      
      // Se désinscrire des événements en conflit et envoyer des notifications
      for (const event of conflictingEvents) {
        await updateDoc(doc(db, 'events', event.id), {
          participants: arrayRemove(auth.currentUser.uid),
          confirmedParticipants: arrayRemove(auth.currentUser.uid)
        });
        
        // Récupérer les autres participants pour les notifier
        const otherParticipants = event.participants.filter(id => id !== auth.currentUser.uid);
        
        // Envoyer des notifications aux autres participants
        await notificationService.createUnavailabilityNotification(
          currentUser.displayName,
          event.title,
          event.id,
          otherParticipants
        );
      }

      // Ajouter l'indisponibilité
      await addUnavailabilityDates(dates);
      
      Alert.alert(
        'Succès', 
        `Vous avez été désinscrit de ${conflictingEvents.length} événement(s) et l'indisponibilité a été ajoutée.`
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const groupUnavailabilities = () => {
    const allUnavails: Availability[] = [];
    
    // Collecter toutes les indisponibilités
    Object.keys(availabilities).forEach(date => {
      availabilities[date]
        .filter(a => !a.isAvailable)
        .forEach(unavail => {
          allUnavails.push({ ...unavail, date });
        });
    });

    // Traiter toutes les indisponibilités individuellement (plus de groupement)
    const displayItems: Array<{
      type: 'single';
      data: Availability;
      key: string;
    }> = [];

    // Ajouter toutes les indisponibilités comme des éléments individuels
    allUnavails.forEach(unavail => {
      displayItems.push({
        type: 'single',
        data: unavail,
        key: unavail.id
      });
    });

    // Trier par date
    displayItems.sort((a, b) => {
      return a.data.date.localeCompare(b.data.date);
    });

    return displayItems;
  };

  const handleDeleteGroup = async (groupId: string) => {
    const groupUnavails = Object.keys(availabilities)
      .flatMap(date => availabilities[date])
      .filter(a => !a.isAvailable && a.groupId === groupId);

    Alert.alert(
      'Supprimer la plage',
      `Voulez-vous supprimer cette indisponibilité de ${groupUnavails.length} jour(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const unavail of groupUnavails) {
                await deleteDoc(doc(db, 'availabilities', unavail.id));
              }
              // Forcer le refresh pour recombiner les marqueurs
              setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous supprimer cette disponibilité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'availabilities', availabilityId));
              // Forcer le refresh pour recombiner les marqueurs
              setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const getSelectionMarkedDates = () => {
    const selectionMarked: any = {};
    
    if (selectedStartDate) {
      // Marquer la date de début - PRIORITÉ sur les autres marqueurs
      selectionMarked[selectedStartDate] = {
        selected: true,
        selectedColor: '#FFB800',
        // Forcer le style de sélection même s'il y a une indispo
        customStyles: {
          container: {
            backgroundColor: '#FFB800',
            borderRadius: 25,
            width: 35,
            height: 35,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: 14
          }
        }
      };
      
      if (selectedEndDate) {
        // Marquer la date de fin - PRIORITÉ sur les autres marqueurs
        selectionMarked[selectedEndDate] = {
          selected: true,
          selectedColor: '#FFB800',
          // Forcer le style de sélection même s'il y a une indispo
          customStyles: {
            container: {
              backgroundColor: '#FFB800',
              borderRadius: 25,
              width: 35,
              height: 35,
            },
            text: {
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 14
            }
          }
        };
        
        // Marquer toutes les dates entre début et fin avec un jaune transparent
        const startDate = new Date(selectedStartDate);
        const endDate = new Date(selectedEndDate);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          
          // Ne pas écraser les dates de début et fin
          if (dateStr !== selectedStartDate && dateStr !== selectedEndDate) {
            selectionMarked[dateStr] = {
              ...markedDates[dateStr],
              customStyles: {
                container: {
                  ...markedDates[dateStr]?.customStyles?.container,
                  backgroundColor: 'rgba(255, 184, 0, 0.3)', // Jaune transparent
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                },
                text: {
                  ...markedDates[dateStr]?.customStyles?.text,
                  color: Colors.white,
                  fontWeight: '600'
                }
              }
            };
          }
        }
      }
    }
    
    return selectionMarked;
  };


  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Mon Agenda</Text>
      </View>
      
      
      <View style={styles.calendarWrapper}>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowTooltip(!showTooltip)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#1A3B5C" />
        </TouchableOpacity>
        <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          ...markedDates,
          ...getSelectionMarkedDates(),
        }}
        markingType={'custom'}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          textSectionTitleColor: '#1A3B5C',
          selectedDayBackgroundColor: '#FFB800',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#FFFFFF',
          todayBackgroundColor: '#FFB800',
          dayTextColor: '#1A1A1A',
          textDisabledColor: 'rgba(26, 26, 26, 0.4)',
          dotColor: '#FFB800',
          selectedDotColor: '#FFFFFF',
          arrowColor: '#1A3B5C',
          monthTextColor: '#1A3B5C',
          indicatorColor: '#FFB800',
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '600',
          textMonthFontWeight: '800',
          textDayHeaderFontWeight: '700',
          textDayFontSize: 16,
          textMonthFontSize: 20,
          textDayHeaderFontSize: 13,
          // Supprimer les bordures internes
          reservationsBackgroundColor: 'transparent',
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
              backgroundColor: 'transparent',
              borderRadius: 0,
              borderWidth: 0,
            }
          },
          'stylesheet.calendar.main': {
            container: {
              paddingLeft: 0,
              paddingRight: 0,
              backgroundColor: 'transparent',
              borderRadius: 0,
              borderWidth: 0,
            }
          }
        }}
        style={{
          paddingBottom: 15,
          paddingTop: 15,
          backgroundColor: 'transparent',
          borderRadius: 15,
          marginHorizontal: 15,
        }}
        monthFormat={'MMMM yyyy'}
        firstDay={1}
        hideExtraDays={false}
        hideArrows={false}
        hideDayNames={false}
        showWeekNumbers={false}
        disableMonthChange={false}
        enableSwipeMonths={true}
        dayComponent={undefined}
        renderHeader={undefined}
        customHeader={undefined}
        displayLoadingIndicator={false}
        />
      </View>

      {showTooltip && (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipText}>
            Par défaut, vous êtes disponible. Marquez seulement vos indisponibilités.
          </Text>
          <Text style={styles.tooltipSubtext}>
            Tapez une date pour une indisponibilité d'un jour, ou tapez deux dates pour une période.
          </Text>
        </View>
      )}

      {selectedStartDate && (
        <View style={styles.detailsContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.actionLabel}>Créer une indisponibilité</Text>
            <Text style={styles.sectionTitle}>
              {isMultiDay ? (
                `Du ${new Date(selectedStartDate).toLocaleDateString('fr-FR')} au ${new Date(selectedEndDate || selectedStartDate).toLocaleDateString('fr-FR')}`
              ) : (
                new Date(selectedStartDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              )}
            </Text>
          </View>


          <TouchableOpacity
            style={styles.fullDayButton}
            onPress={() => {
              const start = new Date();
              start.setHours(0, 0, 0, 0);
              const end = new Date();
              end.setHours(23, 59, 0, 0);
              setStartTime(start);
              setEndTime(end);
            }}
          >
            <Text style={styles.fullDayButtonText}>Toute la journée</Text>
          </TouchableOpacity>

          <View style={styles.timeSection}>
            <TouchableOpacity
              style={styles.timeContainer}
              onPress={() => setShowStartTime(true)}
            >
              <Text style={styles.timeLabel}>Heure de début</Text>
              <Text style={styles.timeValue}>
                {startTime.toTimeString().slice(0, 5)}
              </Text>
              <Text style={styles.timeHint}>Appuyez pour modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeContainer}
              onPress={() => setShowEndTime(true)}
            >
              <Text style={styles.timeLabel}>Heure de fin</Text>
              <Text style={styles.timeValue}>
                {endTime.toTimeString().slice(0, 5)}
              </Text>
              <Text style={styles.timeHint}>Appuyez pour modifier</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.unavailableButton]}
            onPress={handleAddUnavailability}
          >
            <Text style={styles.buttonText}>
              ✓ Confirmer l'indisponibilité
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSelectedStartDate('');
              setSelectedEndDate('');
              setIsMultiDay(false);
            }}
          >
            <Text style={styles.resetButtonText}>Annuler la sélection</Text>
          </TouchableOpacity>


          {/* Afficher les événements de cette date */}
          {(() => {
            const dateEvents = events.filter(event => {
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              const checkDate = new Date(selectedStartDate);
              const isOnDate = checkDate >= startDate && checkDate <= endDate;
              // Dans l'agenda, ne montrer que les événements où l'utilisateur participe
              const userParticipates = event.participants.includes(auth.currentUser!.uid);
              return isOnDate && userParticipates;
            });
            
            return dateEvents.length > 0 && (
              <View style={styles.availabilityList}>
                <Text style={styles.listTitle}>Événements</Text>
                {dateEvents.map((event) => (
                  <View key={event.id} style={styles.eventItem}>
                    <Text style={styles.eventText}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {event.startTime} - {event.endTime}
                    </Text>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })()}

        </View>
      )}

      {/* Liste de toutes les indisponibilités */}
      <View style={styles.allUnavailabilitiesSection}>
        <Text style={styles.allUnavailabilitiesTitle}>Mes indisponibilités</Text>
        {Object.keys(availabilities).length === 0 ? (
          <Text style={styles.noUnavailabilitiesText}>
            Aucune indisponibilité enregistrée
          </Text>
        ) : (
          groupUnavailabilities().map(item => (
            <View key={item.key}>
              {/* Maintenant tout est individuel */ true ? (
                <View style={styles.dateGroup}>
                  <Text style={styles.dateGroupTitle}>
                    {new Date(item.data.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.unavailabilityItem}
                    onPress={() => handleDeleteAvailability(item.data.id)}
                  >
                    <Text style={styles.unavailabilityTime}>
                      {item.data.startTime} - {item.data.endTime}
                    </Text>
                    <Text style={styles.unavailabilityHint}>
                      Appuyez pour supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dateGroup}>
                  <Text style={styles.dateGroupTitle}>
                    {(() => {
                      const groupData = item.data as Availability[];
                      const startDate = new Date(groupData[0].date);
                      const endDate = new Date(groupData[groupData.length - 1].date);
                      
                      if (groupData.length === 1) {
                        return startDate.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        });
                      } else {
                        return `Du ${startDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long'
                        })} au ${endDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long'
                        })}`;
                      }
                    })()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.unavailabilityItem, styles.groupUnavailabilityItem]}
                    onPress={() => handleDeleteGroup((item.data as Availability[])[0].groupId!)}
                  >
                    <Text style={styles.unavailabilityTime}>
                      {(item.data as Availability[])[0].startTime} - {(item.data as Availability[])[0].endTime}
                    </Text>
                    <Text style={styles.groupUnavailabilityText}>
                      {(() => {
                        const groupData = item.data as Availability[];
                        if (groupData.length === 1) {
                          return 'Indisponibilité d\'un jour - Appuyez pour supprimer';
                        } else {
                          // Calculer le nombre de jours réels entre la première et dernière date
                          const startDate = new Date(groupData[0].date);
                          const endDate = new Date(groupData[groupData.length - 1].date);
                          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return `Plage de ${daysDiff} jour(s) - Appuyez pour tout supprimer`;
                        }
                      })()} 
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <Modal
        visible={showStartTime}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartTime(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Heure de début</Text>
            </View>
            
            <View style={styles.pickerContainer}>
              <DateTimePicker
                testID="startTimePicker"
                value={startTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor="#1A3B5C"
                accentColor="#1A3B5C"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setStartTime(selectedTime);
                  }
                }}
                style={styles.picker}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStartTime(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowStartTime(false)}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEndTime}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndTime(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Heure de fin</Text>
            </View>
            
            <View style={styles.pickerContainer}>
              <DateTimePicker
                testID="endTimePicker"
                value={endTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor="#1A3B5C"
                accentColor="#1A3B5C"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setEndTime(selectedTime);
                  }
                }}
                style={styles.picker}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEndTime(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowEndTime(false)}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  calendarWrapper: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    borderRadius: 28,
    padding: 24,
    marginVertical: 8,
    // Effet flottant ultra-réaliste
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 20,
    // Pas de bordure pour effet plus clean
    borderWidth: 0,
    // Effet de lévitation
    transform: [{ translateY: -2 }],
    // Effet glassmorphism avancé
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.white,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 59, 92, 0.1)',
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  tooltipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 15,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(26, 59, 92, 0.1)',
  },
  tooltipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A3B5C',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  tooltipSubtext: {
    fontSize: 13,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 18,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 15,
    borderRadius: 28,
    marginBottom: 25,
    marginVertical: 8,
    // Effet flottant identique au calendrier
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 20,
    // Pas de bordure pour effet plus clean
    borderWidth: 0,
    // Effet de lévitation
    transform: [{ translateY: -2 }],
    // Effet glassmorphism avancé
    backdropFilter: 'blur(10px)',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB800',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3B5C',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  fullDayButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fullDayButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeSection: {
    marginBottom: 24,
  },
  timeContainer: {
    backgroundColor: '#F8F9FA',
    padding: 22,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  timeLabel: {
    fontSize: 16,
    color: '#1A3B5C',
    marginBottom: 10,
    fontWeight: '700',
  },
  timeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeHint: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  actionButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  unavailableButton: {
    backgroundColor: '#1A3B5C',
  },
  resetButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
    marginBottom: 25,
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resetButtonText: {
    color: '#2C3E50',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  availabilityList: {
    marginTop: 16,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 10,
  },
  availabilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  availableItem: {
    backgroundColor: Colors.availableSoft,
  },
  unavailableItem: {
    backgroundColor: Colors.unavailableSoft,
  },
  availabilityText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.secondary,
  },
  availabilityStatus: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: '85%',
    maxWidth: 350,
    shadowColor: Colors.gray900,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary,
    textAlign: 'center',
  },
  pickerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  picker: {
    width: 250,
    height: 180,
    backgroundColor: Colors.white,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  confirmButton: {
    borderLeftWidth: 0.5,
    borderLeftColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  confirmButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '700',
  },
  eventItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1A3B5C',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  allUnavailabilitiesSection: {
    paddingHorizontal: 24,
    paddingVertical: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 15,
    marginTop: 25,
    borderRadius: 28,
    marginVertical: 8,
    // Effet flottant identique
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 0,
    transform: [{ translateY: -2 }],
    backdropFilter: 'blur(10px)',
  },
  allUnavailabilitiesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  noUnavailabilitiesText: {
    fontSize: 17,
    color: '#2C3E50',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 25,
    opacity: 0.8,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 12,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  unavailabilityItem: {
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#FFB800',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  unavailabilityTime: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  unavailabilityHint: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  groupUnavailabilityItem: {
    borderLeftColor: Colors.secondary,
    backgroundColor: Colors.secondarySoft,
  },
  groupUnavailabilityText: {
    fontSize: 14,
    color: '#1A3B5C',
    fontWeight: '700',
    fontStyle: 'italic',
  },
});