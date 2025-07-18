import { collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot, orderBy, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Notification } from '../types';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

class NotificationService {
  async initialize(): Promise<void> {
    try {
      console.log('🔔 [NotificationService] Initializing notifications...');
      
      // Configurer le comportement des notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ [NotificationService] Permission denied');
        return;
      }

      // Obtenir le token Expo Push seulement sur appareil physique
      if (Device.isDevice && auth.currentUser) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: 'e12fe417-6270-48c6-b2f1-444535f037cb', // Votre EAS project ID
          });
          
          console.log('📱 [NotificationService] Expo Push Token:', token.data);
          
          // Sauvegarder le token dans Firestore
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            expoPushToken: token.data,
            lastTokenUpdate: Timestamp.now()
          }, { merge: true });
          
          console.log('✅ [NotificationService] Token saved to Firestore');
        } catch (tokenError) {
          console.error('❌ [NotificationService] Error getting Expo token:', tokenError);
        }
      } else {
        console.log('⚠️ [NotificationService] Simulateur détecté - pas de token');
      }

      console.log('✅ [NotificationService] Notifications initialized successfully');
    } catch (error) {
      console.error('❌ [NotificationService] Error initializing notifications:', error);
    }
  }
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
    try {
      console.log('📝 [NotificationService] Creating notification for user:', notification.userId);
      
      // Créer la notification en base de données
      const notificationDoc = await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: Timestamp.now()
      });
      
      console.log('✅ [NotificationService] Notification created with ID:', notificationDoc.id);
      console.log('🔥 [NotificationService] Firebase Functions will handle push notification automatically');
    } catch (error) {
      console.error('❌ [NotificationService] Error creating notification:', error);
      throw error;
    }
  }

  async createEventNotification(eventTitle: string, eventId: string, participantIds: string[]): Promise<void> {
    console.log('Création de notifications pour:', participantIds);
    
    const promises = participantIds.map(userId => {
      console.log(`Création notification pour utilisateur: ${userId}`);
      return this.createNotification({
        userId,
        type: 'new_event',
        title: 'Nouvel événement',
        message: `Vous avez un événement prochainement: ${eventTitle}`,
        eventId,
        read: false
      });
    });

    await Promise.all(promises);
    console.log('Toutes les notifications ont été créées');
  }

  async createUnavailabilityNotification(
    userName: string, 
    eventTitle: string, 
    eventId: string, 
    participantIds: string[]
  ): Promise<void> {
    const promises = participantIds.map(userId => 
      this.createNotification({
        userId,
        type: 'participant_unavailable',
        title: 'Participant indisponible',
        message: `${userName} ne participera plus à l'événement "${eventTitle}"`,
        eventId,
        read: false
      })
    );

    await Promise.all(promises);
  }

  async createEventDeletedNotification(
    eventTitle: string, 
    participantIds: string[]
  ): Promise<void> {
    const promises = participantIds.map(userId => 
      this.createNotification({
        userId,
        type: 'event_deleted',
        title: 'Événement supprimé',
        message: `L'événement "${eventTitle}" a été supprimé`,
        read: false
      })
    );

    await Promise.all(promises);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      console.log('Fetching notifications for userId:', userId);
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Found notifications count:', querySnapshot.docs.length);
      
      const notifications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Notification data:', { id: doc.id, ...data });
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt
        } as Notification;
      });
      
      console.log('Processed notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      
      callback(notifications);
    });
  }
}

export default new NotificationService();