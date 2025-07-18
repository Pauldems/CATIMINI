import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Event, Availability } from '../types';
import { Colors } from '../theme/colors';

export interface CalendarMarkers {
  [date: string]: {
    marked: boolean;
    dotColor?: string;
    customStyles?: {
      container: {
        backgroundColor: string;
        borderRadius: number;
        width: number;
        height: number;
        borderWidth?: number;
        borderColor?: string;
      };
      text: {
        color: string;
        fontWeight: string;
        fontSize: number;
      };
    };
  };
}

export interface UseCalendarDataProps {
  groupId?: string;
  userEventsOnly?: boolean;
}

export interface UseCalendarDataReturn {
  events: Event[];
  availabilities: { [key: string]: Availability[] };
  markers: CalendarMarkers;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

export const useCalendarData = ({ 
  groupId, 
  userEventsOnly = false 
}: UseCalendarDataProps): UseCalendarDataReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [availabilities, setAvailabilities] = useState<{ [key: string]: Availability[] }>({});
  const [markers, setMarkers] = useState<CalendarMarkers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!auth.currentUser || !groupId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Charger les disponibilités
    const availabilitiesQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeAvailabilities = onSnapshot(
      availabilitiesQuery,
      (snapshot) => {
        const avails: { [key: string]: Availability[] } = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as Availability;
          const date = data.date;
          if (!avails[date]) {
            avails[date] = [];
          }
          avails[date].push({ ...data, id: doc.id });
        });
        setAvailabilities(avails);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    // Charger les événements
    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', groupId)
    );

    const unsubscribeEvents = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData: Event[] = [];
        snapshot.forEach((doc) => {
          const eventData = { ...doc.data(), id: doc.id } as Event;
          // Filtrer selon userEventsOnly
          if (!userEventsOnly || eventData.participants.includes(auth.currentUser!.uid)) {
            eventsData.push(eventData);
          }
        });
        setEvents(eventsData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAvailabilities();
      unsubscribeEvents();
    };
  }, [groupId, userEventsOnly, refreshTrigger]);

  // Générer les marqueurs du calendrier
  useEffect(() => {
    const generateMarkers = () => {
      const newMarkers: CalendarMarkers = {};

      // Ajouter les marqueurs d'indisponibilité
      Object.entries(availabilities).forEach(([date, avails]) => {
        avails.forEach((avail) => {
          if (!avail.isAvailable) {
            newMarkers[date] = {
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
        });
      });

      // Ajouter les marqueurs d'événements
      events.forEach((event) => {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];

          if (newMarkers[dateStr]) {
            // Date avec indisponibilité + événement
            newMarkers[dateStr] = {
              marked: true,
              dotColor: Colors.secondary,
              customStyles: {
                container: {
                  backgroundColor: Colors.unavailable,
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                  borderWidth: 2,
                  borderColor: Colors.event,
                },
                text: {
                  color: Colors.white,
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          } else {
            // Date avec événement seulement
            newMarkers[dateStr] = {
              marked: true,
              dotColor: Colors.primary,
              customStyles: {
                container: {
                  backgroundColor: userEventsOnly ? 'transparent' : 'transparent',
                  borderRadius: 25,
                  width: 35,
                  height: 35,
                  borderWidth: 2,
                  borderColor: Colors.event,
                },
                text: {
                  color: Colors.primary,
                  fontWeight: '600',
                  fontSize: 14
                }
              }
            };
          }
        }
      });

      setMarkers(newMarkers);
    };

    generateMarkers();
  }, [events, availabilities, userEventsOnly]);

  return {
    events,
    availabilities,
    markers,
    loading,
    error,
    refreshData
  };
};