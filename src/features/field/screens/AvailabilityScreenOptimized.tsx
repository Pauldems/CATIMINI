import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  InteractionManager,
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
import { PremiumModal } from '../../profile/components/PremiumModal';
import {
  dataCache,
  runAfterInteractions,
  batchedUpdates,
  createDebouncedListener,
  areMarkedDatesEqual,
  optimizeMarkedDates,
  useIsMounted,
} from '../../../utils/performanceOptimizer';
import { debounce } from 'lodash';

// Composant Calendar mémorisé pour éviter les re-renders
const MemoizedCalendar = memo(({ 
  markedDates, 
  onDayPress,
  theme 
}: any) => (
  <Calendar
    current={new Date().toISOString().split('T')[0]}
    markedDates={markedDates}
    onDayPress={onDayPress}
    theme={theme}
    enableSwipeMonths={true}
    showScrollIndicator={false}
    firstDay={1}
    hideExtraDays={true}
    markingType="custom"
  />
), (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  return areMarkedDatesEqual(prevProps.markedDates, nextProps.markedDates);
});

export default function AvailabilityScreenOptimized({ navigation }: any) {
  const { currentGroup, loading: groupLoading, needsGroupSelection } = useCurrentGroup();
  const scrollViewRef = useRef<ScrollView>(null);
  const isMounted = useIsMounted();
  
  // États optimisés avec valeurs initiales stables
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Références pour les listeners
  const listenersRef = useRef<{ [key: string]: () => void }>({});
  const lastMarkedDatesRef = useRef<any>({});
  
  // Theme du calendrier mémorisé
  const calendarTheme = useMemo(() => ({
    backgroundColor: '#FFFFFF',
    calendarBackground: '#FFFFFF',
    textSectionTitleColor: '#1A3B5C',
    selectedDayBackgroundColor: '#FFB800',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#FFB800',
    dayTextColor: '#1A3B5C',
    textDisabledColor: '#D3D3D3',
    dotColor: '#FFB800',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#FFB800',
    monthTextColor: '#1A3B5C',
    indicatorColor: '#FFB800',
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '400',
    textMonthFontWeight: '700',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  }), []);

  // Callback optimisé pour la navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Utiliser InteractionManager pour ne pas bloquer l'animation
      runAfterInteractions(() => {
        if (!isMounted.current) return;
        
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        // Batch les mises à jour d'état
        batchedUpdates([
          () => setSelectedStartDate(today),
          () => setSelectedEndDate(''),
          () => setIsMultiDay(false),
          () => setShowTooltip(false),
        ]);
        
        checkPremiumStatus();
      });
    });
    
    return unsubscribe;
  }, [navigation, isMounted]);

  // Check premium status avec cache
  const checkPremiumStatus = useCallback(async () => {
    const cached = dataCache.get('premium_status');
    if (cached !== null) {
      setIsPremium(cached);
      return;
    }
    
    const premium = await premiumService.checkPremiumStatus();
    dataCache.set('premium_status', premium);
    if (isMounted.current) {
      setIsPremium(premium);
    }
  }, [isMounted]);

  // Processeur d'availabilities débounced
  const processAvailabilities = useMemo(
    () => createDebouncedListener((snapshot: any) => {
      if (!isMounted.current) return;
      
      const avails: { [key: string]: Availability[] } = {};
      
      snapshot.forEach((doc: any) => {
        const data = doc.data() as Availability;
        const date = data.date;
        
        if (!avails[date]) {
          avails[date] = [];
        }
        avails[date].push({ ...data, id: doc.id });
      });
      
      setAvailabilities(avails);
      updateMarkedDates(avails, events);
    }, 200),
    [events, isMounted]
  );

  // Processeur d'events débounced
  const processEvents = useMemo(
    () => createDebouncedListener((snapshot: any) => {
      if (!isMounted.current) return;
      
      const myEventsData: Event[] = [];
      const allEventsData: Event[] = [];
      
      snapshot.forEach((doc: any) => {
        const eventData = { id: doc.id, ...doc.data() } as Event;
        allEventsData.push(eventData);
        
        if (eventData.participants.includes(auth.currentUser?.uid || '')) {
          myEventsData.push(eventData);
        }
      });
      
      setEvents(myEventsData);
      setAllEvents(allEventsData);
      updateMarkedDates(availabilities, myEventsData);
    }, 200),
    [availabilities, isMounted]
  );

  // Mise à jour optimisée des dates marquées
  const updateMarkedDates = useCallback((avails: any, evts: Event[]) => {
    if (!isMounted.current) return;
    
    runAfterInteractions(() => {
      // Créer une clé de cache basée sur les données
      const cacheKey = `marked_${auth.currentUser?.uid}_${currentGroup?.id}`;
      
      // Convertir les availabilities en tableau pour optimizeMarkedDates
      const availsArray = Object.entries(avails).flatMap(([date, items]) => items);
      
      const newMarkedDates = optimizeMarkedDates(availsArray, evts, cacheKey);
      
      // Vérifier si les dates ont changé avant de mettre à jour
      if (!areMarkedDatesEqual(lastMarkedDatesRef.current, newMarkedDates)) {
        lastMarkedDatesRef.current = newMarkedDates;
        setMarkedDates(newMarkedDates);
      }
    });
  }, [currentGroup, isMounted]);

  // Charger les availabilities avec optimisation
  useEffect(() => {
    if (!auth.currentUser || !currentGroup) return;
    
    const loadAvailabilities = async () => {
      try {
        const q = query(
          collection(db, 'availabilities'),
          where('userId', '==', auth.currentUser.uid)
        );

        // Charger depuis le cache si disponible
        const cacheKey = `avails_${auth.currentUser.uid}`;
        const cached = dataCache.get(cacheKey);
        if (cached) {
          processAvailabilities({ docs: cached, size: cached.length, forEach: (fn: any) => cached.forEach(fn) });
        }

        // Charger les données fraîches
        const initialSnapshot = await getDocs(q);
        const docs = initialSnapshot.docs.map(doc => ({ id: doc.id, data: () => doc.data() }));
        dataCache.set(cacheKey, docs);
        processAvailabilities(initialSnapshot);

        // Listener optimisé
        const unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, data: () => doc.data() }));
            dataCache.set(cacheKey, docs);
            processAvailabilities(snapshot);
          },
          (error) => {
            console.error('❌ Erreur listener availabilities:', error);
          }
        );

        listenersRef.current.availabilities = unsubscribe;
        return unsubscribe;
      } catch (error) {
        console.error('❌ Erreur chargement availabilities:', error);
      }
    };

    loadAvailabilities();
  }, [auth.currentUser?.uid, currentGroup?.id, processAvailabilities]);

  // Charger les events avec optimisation
  useEffect(() => {
    if (!currentGroup) return;
    
    const loadEvents = async () => {
      try {
        const eventsQuery = query(
          collection(db, 'events'),
          where('groupId', '==', currentGroup.id)
        );

        // Cache
        const cacheKey = `events_${currentGroup.id}`;
        const cached = dataCache.get(cacheKey);
        if (cached) {
          processEvents({ docs: cached, size: cached.length, forEach: (fn: any) => cached.forEach(fn) });
        }

        // Données fraîches
        const initialSnapshot = await getDocs(eventsQuery);
        const docs = initialSnapshot.docs.map(doc => ({ id: doc.id, data: () => doc.data() }));
        dataCache.set(cacheKey, docs);
        processEvents(initialSnapshot);

        // Listener optimisé
        const unsubscribe = onSnapshot(eventsQuery, 
          (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, data: () => doc.data() }));
            dataCache.set(cacheKey, docs);
            processEvents(snapshot);
          },
          (error) => {
            console.error('❌ Erreur listener events:', error);
          }
        );

        listenersRef.current.events = unsubscribe;
        return unsubscribe;
      } catch (error) {
        console.error('❌ Erreur chargement events:', error);
      }
    };

    loadEvents();
  }, [currentGroup?.id, processEvents]);

  // Cleanup optimisé
  useEffect(() => {
    return () => {
      Object.values(listenersRef.current).forEach(unsubscribe => unsubscribe?.());
      dataCache.invalidate(`avails_${auth.currentUser?.uid}`);
      dataCache.invalidate(`events_${currentGroup?.id}`);
      dataCache.invalidate(`marked_${auth.currentUser?.uid}_${currentGroup?.id}`);
    };
  }, []);

  // Callback mémorisé pour onDayPress
  const handleDayPress = useCallback((day: DateData) => {
    if (!isMultiDay) {
      setSelectedStartDate(day.dateString);
      setSelectedEndDate('');
    } else {
      if (!selectedStartDate || selectedEndDate) {
        setSelectedStartDate(day.dateString);
        setSelectedEndDate('');
      } else {
        const start = new Date(selectedStartDate);
        const end = new Date(day.dateString);
        if (end >= start) {
          setSelectedEndDate(day.dateString);
        } else {
          setSelectedStartDate(day.dateString);
          setSelectedEndDate('');
        }
      }
    }
  }, [isMultiDay, selectedStartDate, selectedEndDate]);

  // Callback mémorisé pour handleSubmit
  const handleSubmit = useCallback(async () => {
    if (!auth.currentUser || !currentGroup) {
      Alert.alert('Erreur', 'Vous devez être connecté et avoir un groupe sélectionné');
      return;
    }

    if (!selectedStartDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une date');
      return;
    }

    // Vérifier la limite premium
    if (!isPremium) {
      const userAvails = Object.values(availabilities).flat().filter(a => !a.isAvailable);
      if (userAvails.length >= premiumService.getAvailabilityLimit()) {
        setShowPremiumModal(true);
        return;
      }
    }

    try {
      const dates = [];
      if (isMultiDay && selectedEndDate) {
        const start = new Date(selectedStartDate);
        const end = new Date(selectedEndDate);
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          dates.push(date.toISOString().split('T')[0]);
        }
      } else {
        dates.push(selectedStartDate);
      }

      // Utiliser InteractionManager pour les opérations lourdes
      runAfterInteractions(async () => {
        for (const date of dates) {
          await addDoc(collection(db, 'availabilities'), {
            userId: auth.currentUser!.uid,
            groupId: currentGroup.id,
            date: date,
            startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
            endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
            isAvailable: false,
            createdAt: new Date().toISOString(),
            createdByEvent: null,
          });
        }

        // Invalider le cache après ajout
        dataCache.invalidate(`avails_${auth.currentUser?.uid}`);
        dataCache.invalidate(`marked_${auth.currentUser?.uid}_${currentGroup?.id}`);

        Alert.alert(
          'Succès',
          `Indisponibilité${dates.length > 1 ? 's' : ''} ajoutée${dates.length > 1 ? 's' : ''}`,
          [{ text: 'OK' }]
        );

        // Reset
        batchedUpdates([
          () => setSelectedStartDate(new Date().toISOString().split('T')[0]),
          () => setSelectedEndDate(''),
          () => setIsMultiDay(false),
        ]);
      });
    } catch (error) {
      console.error('Erreur ajout indisponibilité:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'indisponibilité');
    }
  }, [selectedStartDate, selectedEndDate, isMultiDay, startTime, endTime, currentGroup, isPremium, availabilities]);

  if (needsGroupSelection) {
    return <GroupRequiredScreen />;
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Mon Agenda</Text>
        <Text style={styles.subtitle}>Gérez vos disponibilités</Text>
      </View>

      <View style={styles.calendarContainer}>
        <MemoizedCalendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={calendarTheme}
        />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, !isMultiDay && styles.modeButtonActive]}
            onPress={() => {
              setIsMultiDay(false);
              setSelectedEndDate('');
            }}
          >
            <Text style={[styles.modeButtonText, !isMultiDay && styles.modeButtonTextActive]}>
              Un jour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, isMultiDay && styles.modeButtonActive]}
            onPress={() => setIsMultiDay(true)}
          >
            <Text style={[styles.modeButtonText, isMultiDay && styles.modeButtonTextActive]}>
              Plusieurs jours
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.sectionTitle}>
            {isMultiDay ? 'Période sélectionnée' : 'Date sélectionnée'}
          </Text>
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={20} color="#1A3B5C" />
            <Text style={styles.dateText}>
              {isMultiDay && selectedEndDate
                ? `Du ${new Date(selectedStartDate).toLocaleDateString('fr-FR')} au ${new Date(selectedEndDate).toLocaleDateString('fr-FR')}`
                : new Date(selectedStartDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
            </Text>
          </View>
        </View>

        <View style={styles.timeSection}>
          <Text style={styles.sectionTitle}>Horaires d'indisponibilité</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartTime(true)}
            >
              <Ionicons name="time-outline" size={20} color="#1A3B5C" />
              <Text style={styles.timeText}>
                De: {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndTime(true)}
            >
              <Ionicons name="time-outline" size={20} color="#1A3B5C" />
              <Text style={styles.timeText}>
                À: {endTime.getHours().toString().padStart(2, '0')}:{endTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.submitButtonText}>Ajouter l'indisponibilité</Text>
        </TouchableOpacity>
      </View>

      {showStartTime && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowStartTime(Platform.OS === 'ios');
            if (selectedTime) {
              setStartTime(selectedTime);
              if (Platform.OS === 'ios') {
                setTimeout(() => setShowStartTime(false), 100);
              }
            }
          }}
        />
      )}

      {showEndTime && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowEndTime(Platform.OS === 'ios');
            if (selectedTime) {
              setEndTime(selectedTime);
              if (Platform.OS === 'ios') {
                setTimeout(() => setShowEndTime(false), 100);
              }
            }
          }}
        />
      )}

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        isPremium={isPremium}
        onUpgrade={() => {
          checkPremiumStatus();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  modeButtonTextActive: {
    color: '#1A3B5C',
  },
  dateSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 12,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#1A3B5C',
    marginLeft: 12,
    flex: 1,
  },
  timeSection: {
    marginBottom: 25,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 5,
  },
  timeText: {
    fontSize: 16,
    color: '#1A3B5C',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FFB800',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});