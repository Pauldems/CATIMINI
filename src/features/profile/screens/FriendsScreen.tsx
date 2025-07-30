import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import groupService from '../../../services/groupService';

export default function FriendsScreen({ navigation }: any) {
  const { currentGroup, loading: groupLoading, needsGroupSelection } = useCurrentGroup();
  const scrollViewRef = useRef<ScrollView>(null);
  const [friends, setFriends] = useState<(Friend & { friendData?: User })[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilities, setAvailabilities] = useState<{ [userId: string]: Availability[] }>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleDeleteGroup = async () => {
    if (!currentGroup) return;
    
    try {
      const success = await groupService.deleteGroup(currentGroup.id);
      if (success) {
        Alert.alert('Succès', 'Le groupe a été supprimé.');
        // La redirection sera gérée par useCurrentGroup
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer le groupe.');
      }
    } catch (error) {
      console.error('Erreur suppression groupe:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression du groupe.');
    }
  };

  // Listener pour remettre la page en haut quand on arrive sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Réinitialiser les dates marquées pour forcer un affichage propre
      setMarkedDates({});
      // Rafraîchir les données quand on revient sur l'onglet
      setRefreshTrigger(prev => prev + 1);
      // Fermer le tooltip
      setShowTooltip(false);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (currentGroup) {
      // Réinitialiser avant de recharger
      setMarkedDates({});
      setEvents([]);
      
      let unsubscribeAvailabilities: (() => void) | undefined;
      let unsubscribeEvents: (() => void) | undefined;
      
      // Charger toutes les données
      const loadData = async () => {
        await loadFriends();
        unsubscribeAvailabilities = await loadAllAvailabilities();
        unsubscribeEvents = await loadEvents();
      };
      
      loadData();
      
      return () => {
        unsubscribeAvailabilities?.();
        unsubscribeEvents?.();
      };
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

  const loadAllAvailabilities = async () => {
    if (!auth.currentUser || !currentGroup) return;

    try {
      // Charger toutes les disponibilités
      const availQuery = query(
        collection(db, 'availabilities')
      );

      // Charger d'abord avec getDocs
      const initialSnapshot = await getDocs(availQuery);
      processAvailabilities(initialSnapshot);

      // Puis établir le listener
      const unsubscribe = onSnapshot(availQuery, 
        (snapshot) => {
          processAvailabilities(snapshot);
        },
        (error) => {
          console.error('❌ Erreur listener availabilities:', error);
          getDocs(availQuery).then(processAvailabilities).catch(console.error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Erreur chargement availabilities:', error);
    }
  };

  const processAvailabilities = (snapshot: any) => {
    const allAvails: { [userId: string]: Availability[] } = {};
    
    snapshot.forEach((doc: any) => {
      const data = doc.data() as Availability;
      
      if (!allAvails[data.userId]) {
        allAvails[data.userId] = [];
      }
      allAvails[data.userId].push({ ...data, id: doc.id });
    });

    setAvailabilities(allAvails);
      
      // Reconstruire les marqueurs en préservant les événements existants
      setMarkedDates(prevMarked => {
        const marked: any = {};
        
        // D'abord, conserver tous les marqueurs d'événements existants
        Object.keys(prevMarked).forEach(date => {
          if (prevMarked[date] && 
              (prevMarked[date].dotColor === '#FFB800' || 
               prevMarked[date].customStyles?.container?.borderColor === '#FFB800')) {
            marked[date] = prevMarked[date];
          }
        });
        
        // Ensuite, ajouter ou mettre à jour avec les indisponibilités
        snapshot.forEach((doc) => {
          const data = doc.data() as Availability;
          
          if (!data.isAvailable) {
            const date = data.date;
            if (!marked[date]) {
              // Pas de marqueur existant, créer un marqueur d'indisponibilité
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
            } else if (marked[date].dotColor === '#FFB800') {
              // Il y a déjà un événement, ajouter l'indisponibilité avec bordure jaune
              marked[date] = {
                ...marked[date],
                customStyles: {
                  container: {
                    backgroundColor: '#1A3B5C',
                    borderRadius: 25,
                    width: 35,
                    height: 35,
                    borderWidth: 2,
                    borderColor: '#FFB800',
                  },
                  text: {
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 14
                  }
                }
              };
            }
          }
        });
        
        return marked;
      });
    });

  const loadEvents = async () => {
    if (!auth.currentUser || !currentGroup) return;

    try {
      // Charger seulement les événements du groupe actuel
      const eventsQuery = query(
        collection(db, 'events'),
        where('groupId', '==', currentGroup.id)
      );

      // Charger d'abord avec getDocs
      const initialSnapshot = await getDocs(eventsQuery);
      processEvents(initialSnapshot);

      // Puis établir le listener
      const unsubscribe = onSnapshot(eventsQuery, 
        (snapshot) => {
          processEvents(snapshot);
        },
        (error) => {
          console.error('❌ Erreur listener events:', error);
          getDocs(eventsQuery).then(processEvents).catch(console.error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Erreur chargement events:', error);
    }
  };

  const processEvents = (snapshot: any) => {
    const eventsData: Event[] = [];
    
    snapshot.forEach((doc: any) => {
      const eventData = { ...doc.data(), id: doc.id } as Event;
      // Dans le calendrier de groupe, afficher TOUS les événements du groupe
      eventsData.push(eventData);
    });
    
    setEvents(eventsData);
    updateMarkedDatesWithEvents(eventsData);
  };

  const updateMarkedDatesWithEvents = (eventsData: Event[]) => {
    console.log('🎯 updateMarkedDatesWithEvents appelé avec', eventsData.length, 'événements');
    
    setMarkedDates(prevMarked => {
      const newMarked = { ...prevMarked };
      
      console.log('📅 État initial des markedDates:', Object.keys(prevMarked).length, 'dates marquées');
      
      // D'abord, nettoyer les anciens marqueurs d'événements uniquement
      Object.keys(newMarked).forEach(date => {
        if (!newMarked[date]) return;
        
        const hasEvent = eventsData.some(event => {
          // Afficher tous les événements du groupe
          const startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          const checkDate = new Date(date);
          return checkDate >= startDate && checkDate <= endDate;
        });
        
        // Si cette date n'a plus d'événement
        if (!hasEvent) {
          // Si c'était un marqueur d'événement seul (sans indispo), le supprimer
          if (newMarked[date].dotColor === '#FFB800' && !newMarked[date].customStyles?.container?.backgroundColor) {
            console.log('🗑️ Suppression marqueur événement seul pour', date);
            delete newMarked[date];
          }
          // Si c'était une indispo avec bordure d'événement, enlever la bordure
          else if (newMarked[date].customStyles?.container?.borderColor === '#FFB800') {
            console.log('🔄 Suppression bordure événement pour indispo', date);
            newMarked[date] = {
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
        }
      });
      
      // Ajouter les marqueurs d'événements (cercles jaunes) pour TOUS les événements du groupe
      eventsData.forEach(event => {
        console.log(`📍 Traitement événement "${event.title}" du ${event.startDate} au ${event.endDate}`);
        
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        
        // Marquer toutes les dates de l'événement avec un cercle jaune
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          
          if (!newMarked[dateStr]) {
            // Date vide - ajouter cercle jaune avec point jaune
            console.log('✅ Ajout cercle jaune pour date vide:', dateStr);
            newMarked[dateStr] = {
              marked: true,
              dotColor: '#FFB800',
              customStyles: {
                container: {
                  backgroundColor: 'transparent',
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                  borderWidth: 2,
                  borderColor: '#FFB800',
                },
                text: {
                  color: '#1A3B5C',
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          } else if (newMarked[dateStr].customStyles?.container?.backgroundColor === '#1A3B5C') {
            // Date avec indisponibilité - ajouter bordure jaune en plus et garder le point jaune
            console.log('🔵🟡 Ajout bordure jaune sur indispo existante:', dateStr);
            newMarked[dateStr] = {
              ...newMarked[dateStr],
              marked: true,
              dotColor: '#FFB800',
              customStyles: {
                container: {
                  backgroundColor: '#1A3B5C',
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                  borderWidth: 2,
                  borderColor: '#FFB800',
                },
                text: {
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          } else {
            console.log('⚠️ Date déjà marquée, état actuel:', dateStr, newMarked[dateStr]);
          }
        }
      });
      
      console.log('📊 État final des markedDates:', Object.keys(newMarked).length, 'dates marquées');
      
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
      <Text style={styles.title}>Mon Groupe</Text>
      
      <GroupSelector navigation={navigation} />
      

      <View style={styles.calendarWrapper}>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowTooltip(!showTooltip)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#1A3B5C" />
        </TouchableOpacity>
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
                  backgroundColor: '#FFB800',
                  borderWidth: 2,
                  borderColor: '#FFB800',
                },
                text: {
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14
                }
              } : {
                // Si pas de marqueurs, cercle jaune rempli
                container: {
                  backgroundColor: '#FFB800',
                  borderRadius: 25,
                  borderWidth: 2,
                  borderColor: '#FFB800',
                  width: 35,
                  height: 35,
                },
                text: {
                  color: '#FFFFFF',
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
          textSectionTitleColor: '#1A3B5C',
          selectedDayBackgroundColor: '#FFB800',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#FFFFFF',
          todayBackgroundColor: '#FFB800',
          dayTextColor: '#1A1A1A',
          textDisabledColor: 'rgba(26, 26, 26, 0.4)',
          arrowColor: '#1A3B5C',
          monthTextColor: '#1A3B5C',
          indicatorColor: '#FFB800',
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

      {showTooltip && (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipText}>
            Ici vous voyez tous les événements et indisponibilités de tout le monde dans le groupe.
          </Text>
          <Text style={styles.tooltipSubtext}>
            Ronds bleus = indisponibilités{'\n'}Cercles jaunes = événements{'\n'}Cliquez sur une date pour voir les détails.
          </Text>
        </View>
      )}

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
      
      {currentGroup && currentGroup.creatorId === auth.currentUser?.uid && (
        <View style={[styles.section, { marginTop: 20 }]}>
          <TouchableOpacity 
            style={styles.deleteGroupButton}
            onPress={() => {
              Alert.alert(
                'Supprimer le groupe',
                `Êtes-vous sûr de vouloir supprimer le groupe "${currentGroup.name}" ?\n\nCette action est irréversible. Tous les membres seront exclus et toutes les données (événements, indisponibilités) seront perdues.`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: handleDeleteGroup
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.deleteGroupButtonText}>Supprimer le groupe</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  contentContainer: {
    paddingBottom: 120,
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
  subtitle: {
    fontSize: 15,
    color: '#2C3E50',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    fontWeight: '500',
    lineHeight: 20,
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
  dateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statusSection: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  availableTitle: {
    color: '#1A3B5C',
  },
  unavailableTitle: {
    color: '#1A3B5C',
  },
  eventTitle: {
    color: '#1A3B5C',
  },
  userItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availableItem: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#1A3B5C',
  },
  unavailableItem: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#1A3B5C',
  },
  eventItem: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 4,
  },
  unavailableTime: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F8F9FA',
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
  memberName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  memberRole: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#1A3B5C',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#2C3E50',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  eventParticipants: {
    fontSize: 12,
    color: '#1A3B5C',
    fontWeight: '500',
    marginBottom: 4,
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
  deleteGroupButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});