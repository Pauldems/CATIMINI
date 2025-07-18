import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  or,
} from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import { auth, db } from '../../../config/firebase';
import { Friend, User, Availability, Event } from '../../../types';
import GroupSelector from '../../field/components/GroupSelector';
import { useCurrentGroup } from '../../../hooks/useCurrentGroup';
import GroupRequiredScreen from '../../field/screens/GroupRequiredScreen';
import { Colors } from '../../../theme/colors';

export default function FriendsScreen({ navigation }: any) {
  const { currentGroup, loading: groupLoading, needsGroupSelection } = useCurrentGroup();
  const scrollViewRef = useRef<ScrollView>(null);
  const [friends, setFriends] = useState<(Friend & { friendData?: User })[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilities, setAvailabilities] = useState<{ [userId: string]: Availability[] }>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listener pour remettre la page en haut quand on arrive sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Rafraîchir les données quand on revient sur l'onglet
      setRefreshTrigger(prev => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (currentGroup) {
      loadFriends();
      loadAllAvailabilities();
      loadEvents();
    }
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

  const loadFriends = async () => {
    if (!auth.currentUser || !currentGroup) return;

    // Charger seulement les membres du groupe actuel
    const friendsData: (Friend & { friendData?: User })[] = [];
    
    // Pour chaque membre du groupe (sauf l'utilisateur actuel)
    const memberIds = currentGroup.members.filter(memberId => memberId !== auth.currentUser!.uid);
    
    for (const memberId of memberIds) {
      try {
        const userDoc = await getDocs(query(
          collection(db, 'users'),
          where('__name__', '==', memberId)
        ));
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as User;
          friendsData.push({
            id: userDoc.docs[0].id,
            userId: auth.currentUser!.uid,
            friendId: userData.id,
            status: 'accepted',
            createdAt: userData.createdAt,
            friendData: userData
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement du membre:', error);
      }
    }
    
    setFriends(friendsData);
  };

  const loadAllAvailabilities = () => {
    if (!auth.currentUser || !currentGroup) return;

    // Charger toutes les disponibilités
    const availQuery = query(
      collection(db, 'availabilities')
    );

    const unsubscribe = onSnapshot(availQuery, (snapshot) => {
      const allAvails: { [userId: string]: Availability[] } = {};
      const marked: any = {};

      snapshot.forEach((doc) => {
        const data = doc.data() as Availability;
        
        if (!allAvails[data.userId]) {
          allAvails[data.userId] = [];
        }
        allAvails[data.userId].push({ ...data, id: doc.id });

        // Marquer seulement les indisponibilités avec couleurs du logo
        if (!data.isAvailable) {
          const date = data.date;
          if (!marked[date]) {
            marked[date] = {
              marked: true,
              dotColor: Colors.secondary,
              customStyles: {
                container: {
                  backgroundColor: Colors.unavailable,
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                },
                text: {
                  color: Colors.white,
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          }
        }
      });

      setAvailabilities(allAvails);
      setMarkedDates(marked);
    });

    return unsubscribe;
  };

  const loadEvents = () => {
    if (!auth.currentUser || !currentGroup) return;

    // Charger seulement les événements du groupe actuel
    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', currentGroup.id)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      
      snapshot.forEach((doc) => {
        const eventData = { ...doc.data(), id: doc.id } as Event;
        // Dans le calendrier de groupe, afficher TOUS les événements du groupe
        eventsData.push(eventData);
      });
      
      setEvents(eventsData);
      updateMarkedDatesWithEvents(eventsData);
    });

    return unsubscribe;
  };

  const updateMarkedDatesWithEvents = (eventsData: Event[]) => {
    setMarkedDates(prevMarked => {
      const newMarked = { ...prevMarked };
      
      // D'abord, nettoyer les anciens marqueurs d'événements
      Object.keys(newMarked).forEach(date => {
        if (!newMarked[date]) return;
        
        const hasEvent = eventsData.some(event => {
          // Afficher tous les événements du groupe
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          const checkDate = new Date(date);
          return checkDate >= startDate && checkDate <= endDate;
        });
        
        // Si cette date n'a plus d'événement et était avec bordure jaune seulement
        if (!hasEvent && newMarked[date] && 
            newMarked[date].customStyles?.container?.backgroundColor === 'transparent' && 
            newMarked[date].customStyles?.container?.borderColor === Colors.secondary) {
          delete newMarked[date];
        }
        
        // Si cette date était indisponible avec bordure d'événement, enlever la bordure
        if (!hasEvent && newMarked[date] && newMarked[date].customStyles?.container?.borderColor === Colors.secondary) {
          newMarked[date].customStyles = {
            container: {
              backgroundColor: Colors.unavailable,
              borderRadius: 25,
              width: 35,
              height: 35,
            },
            text: {
              color: Colors.white,
              fontWeight: '600'
            }
          };
        }
      });
      
      // Ajouter les marqueurs d'événements (cercles jaunes) pour TOUS les événements du groupe
      eventsData.forEach(event => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        
        // Marquer toutes les dates de l'événement avec un cercle jaune
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          
          if (!newMarked[dateStr]) {
            // Date vide - ajouter cercle jaune
            newMarked[dateStr] = {
              marked: true,
              dotColor: Colors.secondary,
              customStyles: {
                container: {
                  backgroundColor: 'transparent',
                  borderRadius: 25,
                  borderWidth: 2,
                  borderColor: Colors.secondary,
                  width: 35,
                  height: 35,
                },
                text: {
                  color: Colors.white,
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          } else {
            // Date avec indisponibilité - ajouter bordure jaune en plus
            newMarked[dateStr].customStyles = {
              ...newMarked[dateStr].customStyles,
              container: {
                ...newMarked[dateStr].customStyles?.container,
                borderWidth: 2,
                borderColor: Colors.secondary,
              }
            };
          }
        }
      });
      
      return newMarked;
    });
  };

  const getDateInfo = (date: string) => {
    const available: User[] = [];
    const unavailable: User[] = [];
    const dateEvents = events.filter(event => {
      // Dans l'écran Groupe, afficher TOUS les événements du groupe pour cette date
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const checkDate = new Date(date);
      return checkDate >= startDate && checkDate <= endDate;
    });
    
    // Récupérer tous les participants de tous les événements de cette date
    const allEventParticipantIds = new Set<string>();
    dateEvents.forEach(event => {
      event.participants.forEach(participantId => {
        allEventParticipantIds.add(participantId);
      });
    });
    
    const eventParticipants: User[] = [];
    
    // Vérifier l'utilisateur actuel
    const currentUserData = {
      id: auth.currentUser!.uid,
      email: auth.currentUser!.email!,
      displayName: auth.currentUser!.displayName || 'Moi',
      createdAt: new Date()
    };
    
    const currentUserUnavails = availabilities[auth.currentUser!.uid]?.filter(
      a => a.date === date && !a.isAvailable && !a.createdByEvent
    ) || [];
    
    if (allEventParticipantIds.has(auth.currentUser!.uid)) {
      // L'utilisateur actuel est invité à un événement
      eventParticipants.push(currentUserData);
    } else if (currentUserUnavails.length > 0) {
      // L'utilisateur a des indisponibilités manuelles
      unavailable.push(currentUserData);
    } else {
      // L'utilisateur est disponible
      available.push(currentUserData);
    }
    
    // Vérifier tous les amis
    friends.forEach(friend => {
      if (friend.friendData) {
        const friendUnavails = availabilities[friend.friendData.id]?.filter(
          a => a.date === date && !a.isAvailable && !a.createdByEvent
        ) || [];
        
        if (allEventParticipantIds.has(friend.friendData.id)) {
          // L'ami est invité à un événement
          eventParticipants.push(friend.friendData);
        } else if (friendUnavails.length > 0) {
          // L'ami a des indisponibilités manuelles
          unavailable.push(friend.friendData);
        } else {
          // L'ami est disponible
          available.push(friend.friendData);
        }
      }
    });
    
    return { available, unavailable, eventParticipants, dateEvents };
  };


  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Disponibilités du groupe</Text>
      
      <GroupSelector navigation={navigation} />
      
      <Text style={styles.subtitle}>
        Cliquez sur une date pour voir qui est disponible dans ce groupe.
      </Text>

      <View style={styles.calendarWrapper}>
        <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          ...(selectedDate && {
            [selectedDate]: {
              ...markedDates[selectedDate],
              customStyles: markedDates[selectedDate] ? {
                // Si la date a déjà des marqueurs (indispo/événement), garder le style mais ajouter le fond jaune
                ...markedDates[selectedDate].customStyles,
                container: {
                  ...markedDates[selectedDate].customStyles?.container,
                  backgroundColor: Colors.secondary,
                  borderWidth: 2,
                  borderColor: Colors.secondary,
                },
                text: {
                  color: Colors.primary,
                  fontWeight: '600',
                  fontSize: 14
                }
              } : {
                // Si pas de marqueurs, cercle jaune rempli
                container: {
                  backgroundColor: Colors.secondary,
                  borderRadius: 25,
                  borderWidth: 2,
                  borderColor: Colors.secondary,
                  width: 35,
                  height: 35,
                },
                text: {
                  color: Colors.primary,
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            }
          })
        }}
        markingType={'custom'}
        monthFormat={'MMMM yyyy'}
        firstDay={1}
        hideExtraDays={false}
        hideArrows={false}
        hideDayNames={false}
        showWeekNumbers={false}
        disableMonthChange={false}
        enableSwipeMonths={true}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'transparent',
          textSectionTitleColor: Colors.secondary,
          selectedDayBackgroundColor: Colors.secondary,
          selectedDayTextColor: Colors.primary,
          todayTextColor: Colors.secondary,
          dayTextColor: Colors.white,
          textDisabledColor: 'rgba(255, 255, 255, 0.3)',
          arrowColor: Colors.secondary,
          monthTextColor: Colors.white,
          indicatorColor: Colors.secondary,
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
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
          marginHorizontal: 15,
          backgroundColor: 'transparent',
          borderRadius: 15,
        }}
        />
      </View>

      {selectedDate && (
        <View style={styles.detailsContainer}>
          <Text style={styles.dateTitle}>
            {new Date(selectedDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {(() => {
            const { available, unavailable, eventParticipants, dateEvents } = getDateInfo(selectedDate);
            return (
              <>
                {dateEvents.length > 0 && (
                  <View style={styles.statusSection}>
                    <Text style={[styles.statusTitle, styles.eventTitle]}>
                      {dateEvents.length === 1 ? 'Événement' : 'Événements'} ({dateEvents.length})
                    </Text>
                    {dateEvents.map((event) => {
                      // Obtenir uniquement les participants RÉELS de l'événement
                      const realParticipants = event.participants.length;
                      
                      return (
                        <View key={event.id} style={[styles.userItem, styles.eventItem]}>
                          <Text style={styles.eventName}>{event.title}</Text>
                          <Text style={styles.eventTime}>
                            {event.startTime} - {event.endTime}
                          </Text>
                          {event.description && (
                            <Text style={styles.eventDescription}>{event.description}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {dateEvents.length > 0 && eventParticipants.length > 0 && (
                  <View style={styles.statusSection}>
                    <Text style={[styles.statusTitle, styles.availableTitle]}>
                      Participants à l'événement ({eventParticipants.length})
                    </Text>
                    
                    {/* Afficher uniquement les participants réels aux événements */}
                    {eventParticipants.map((user) => (
                      <View key={user.id} style={[styles.userItem, styles.availableItem]}>
                        <Text style={styles.userName}>{user.displayName}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {available.length > 0 && (
                  <View style={styles.statusSection}>
                    <Text style={[styles.statusTitle, styles.availableTitle]}>
                      {dateEvents.length > 0 ? 'Autres disponibles' : 'Disponibles'} ({available.length})
                    </Text>
                    
                    {/* Afficher les personnes disponibles mais pas invitées */}
                    {available.map((user) => (
                      <View key={user.id} style={[styles.userItem, styles.availableItem]}>
                        <Text style={styles.userName}>{user.displayName}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {unavailable.length > 0 && (
                  <View style={styles.statusSection}>
                    <Text style={[styles.statusTitle, styles.unavailableTitle]}>
                      Indisponibles ({unavailable.length})
                    </Text>
                    {unavailable.map((user) => (
                      <View key={user.id} style={[styles.userItem, styles.unavailableItem]}>
                        <Text style={styles.userName}>{user.displayName}</Text>
                        {availabilities[user.id]?.filter(a => a.date === selectedDate && !a.isAvailable && !a.createdByEvent).map((avail, index) => (
                          <Text key={index} style={styles.unavailableTime}>
                            ❌ {avail.startTime} - {avail.endTime}
                          </Text>
                        ))}
                        {availabilities[user.id]?.filter(a => a.date === selectedDate && !a.isAvailable && a.createdByEvent).map((avail, index) => (
                          <Text key={index} style={[styles.unavailableTime, { color: '#1976D2' }]}>
                            📅 {avail.startTime} - {avail.endTime}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </View>
      )}

      <View style={[styles.section, { marginTop: 40 }]}>
        <Text style={styles.sectionTitle}>
          Membres du groupe ({friends.length + 1})
        </Text>
        <View style={styles.memberItem}>
          <Text style={styles.memberName}>
            {auth.currentUser?.displayName || 'Moi'}
          </Text>
          <Text style={styles.memberRole}>Vous</Text>
        </View>
        {friends.map((friend) => (
          <View key={friend.id} style={styles.memberItem}>
            <Text style={styles.memberName}>
              {friend.friendData?.displayName}
            </Text>
            <Text style={styles.memberEmail}>
              {friend.friendData?.email}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  calendarWrapper: {
    backgroundColor: 'rgba(42, 75, 108, 0.3)',
    marginHorizontal: 15,
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  contentContainer: {
    paddingBottom: 120,
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
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: Colors.white,
    padding: 18,
    paddingTop: 80,
    paddingBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.white,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailsContainer: {
    padding: 20,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  availableTitle: {
    color: Colors.white,
  },
  unavailableTitle: {
    color: Colors.white,
  },
  eventTitle: {
    color: Colors.white,
  },
  userItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  availableItem: {
    backgroundColor: Colors.availableSoft,
  },
  unavailableItem: {
    backgroundColor: Colors.unavailableSoft,
  },
  eventItem: {
    backgroundColor: Colors.eventSoft,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  unavailableTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 14,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primary,
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
  },
  memberRole: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: Colors.event,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  eventParticipants: {
    fontSize: 12,
    color: Colors.event,
    fontWeight: '500',
    marginBottom: 4,
  },
});