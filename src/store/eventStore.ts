import { create } from 'zustand';
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Event, Availability } from '../types';

interface EventState {
  events: Event[];
  userEvents: Event[];
  availabilities: { [key: string]: Availability[] };
  loading: boolean;
  error: string | null;
  
  // Actions
  setEvents: (events: Event[]) => void;
  setUserEvents: (events: Event[]) => void;
  setAvailabilities: (availabilities: { [key: string]: Availability[] }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Listeners
  subscribeToEvents: (groupId: string) => (() => void) | undefined;
  subscribeToUserEvents: (groupId: string) => (() => void) | undefined;
  subscribeToAvailabilities: () => (() => void) | undefined;
  
  // Utils
  getEventsByDate: (date: string) => Event[];
  getUserEventsByDate: (date: string) => Event[];
  getAvailabilitiesByDate: (date: string) => Availability[];
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  userEvents: [],
  availabilities: {},
  loading: false,
  error: null,

  setEvents: (events) => set({ events }),
  setUserEvents: (events) => set({ userEvents: events }),
  setAvailabilities: (availabilities) => set({ availabilities }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  subscribeToEvents: (groupId: string) => {
    if (!auth.currentUser || !groupId) return undefined;

    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData: Event[] = [];
        snapshot.forEach((doc) => {
          const eventData = { ...doc.data(), id: doc.id } as Event;
          eventsData.push(eventData);
        });
        set({ events: eventsData, loading: false, error: null });
      },
      (error) => {
        set({ error: error.message, loading: false });
      }
    );
  },

  subscribeToUserEvents: (groupId: string) => {
    if (!auth.currentUser || !groupId) return undefined;

    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', groupId),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData: Event[] = [];
        snapshot.forEach((doc) => {
          const eventData = { ...doc.data(), id: doc.id } as Event;
          eventsData.push(eventData);
        });
        set({ userEvents: eventsData });
      },
      (error) => {
        set({ error: error.message });
      }
    );
  },

  subscribeToAvailabilities: () => {
    if (!auth.currentUser) return undefined;

    const availabilitiesQuery = query(
      collection(db, 'availabilities'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'asc')
    );

    return onSnapshot(
      availabilitiesQuery,
      (snapshot) => {
        const availabilities: { [key: string]: Availability[] } = {};
        snapshot.forEach((doc) => {
          const data = doc.data() as Availability;
          const date = data.date;
          if (!availabilities[date]) {
            availabilities[date] = [];
          }
          availabilities[date].push({ ...data, id: doc.id });
        });
        set({ availabilities });
      },
      (error) => {
        set({ error: error.message });
      }
    );
  },

  getEventsByDate: (date: string) => {
    const { events } = get();
    return events.filter((event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const checkDate = new Date(date);
      return checkDate >= startDate && checkDate <= endDate;
    });
  },

  getUserEventsByDate: (date: string) => {
    const { userEvents } = get();
    return userEvents.filter((event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const checkDate = new Date(date);
      return checkDate >= startDate && checkDate <= endDate;
    });
  },

  getAvailabilitiesByDate: (date: string) => {
    const { availabilities } = get();
    return availabilities[date] || [];
  },
}));