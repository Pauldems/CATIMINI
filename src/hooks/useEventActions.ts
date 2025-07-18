import { useState } from 'react';
import { addDoc, collection, updateDoc, doc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Event } from '../types';
import { Alert } from 'react-native';

export interface CreateEventData {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  participants: string[];
  groupId: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export interface UseEventActionsReturn {
  createEvent: (eventData: CreateEventData) => Promise<string | null>;
  updateEvent: (eventData: UpdateEventData) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  joinEvent: (eventId: string) => Promise<boolean>;
  leaveEvent: (eventId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useEventActions = (): UseEventActionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = async (eventData: CreateEventData): Promise<string | null> => {
    if (!auth.currentUser) {
      setError('Utilisateur non connecté');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const eventDoc = await addDoc(collection(db, 'events'), {
        ...eventData,
        creatorId: auth.currentUser.uid,
        confirmedParticipants: [auth.currentUser.uid],
        createdAt: new Date(),
      });

      setLoading(false);
      return eventDoc.id;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const updateEvent = async (eventData: UpdateEventData): Promise<boolean> => {
    if (!auth.currentUser) {
      setError('Utilisateur non connecté');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { id, ...updateData } = eventData;
      await updateDoc(doc(db, 'events', id), updateData);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    if (!auth.currentUser) {
      setError('Utilisateur non connecté');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'events', eventId));
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const joinEvent = async (eventId: string): Promise<boolean> => {
    if (!auth.currentUser) {
      setError('Utilisateur non connecté');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'events', eventId), {
        participants: arrayUnion(auth.currentUser.uid),
        confirmedParticipants: arrayUnion(auth.currentUser.uid),
      });
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const leaveEvent = async (eventId: string): Promise<boolean> => {
    if (!auth.currentUser) {
      setError('Utilisateur non connecté');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'events', eventId), {
        participants: arrayRemove(auth.currentUser.uid),
        confirmedParticipants: arrayRemove(auth.currentUser.uid),
      });
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    joinEvent,
    leaveEvent,
    loading,
    error,
  };
};