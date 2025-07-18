import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { auth, db } from '../../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Notification } from '../../../types';
import notificationService from '../../../services/notificationService';
import pushNotificationService from '../../../services/pushNotificationService';
import Constants from 'expo-constants';

interface NotificationsScreenProps {
  navigation: any;
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Timeout de sécurité pour éviter un chargement infini
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Charger les notifications immédiatement
    const loadNotifications = async () => {
      try {
        console.log('NotificationsScreen: Loading notifications for user:', auth.currentUser!.uid);
        const notifs = await notificationService.getUserNotifications(auth.currentUser!.uid);
        console.log('NotificationsScreen: Received notifications:', notifs);
        setNotifications(notifs);
        setLoading(false);
        clearTimeout(timeout);
      } catch (error) {
        console.error('NotificationsScreen: Error loading notifications:', error);
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    loadNotifications();

    try {
      // S'abonner aux notifications en temps réel
      const unsubscribe = notificationService.subscribeToNotifications(
        auth.currentUser.uid,
        (notifs) => {
          setNotifications(notifs);
          setLoading(false);
          clearTimeout(timeout);
        }
      );

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      setLoading(false);
      clearTimeout(timeout);
    }
  }, []);

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    
    setRefreshing(true);
    try {
      const notifs = await notificationService.getUserNotifications(auth.currentUser.uid);
      setNotifications(notifs);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de rafraîchir les notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Naviguer vers les détails de l'événement si c'est lié à un événement
    // (sauf si l'événement a été supprimé)
    if (notification.eventId && notification.type !== 'event_deleted') {
      navigation.navigate('EventDetails', { eventId: notification.eventId });
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, item.read && styles.readNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.notificationTime}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.notificationMessage, !item.read && styles.unreadMessage]}>
        {item.message}
      </Text>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const formatDate = (date: Date | any) => {
    const notificationDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return notificationDate.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune notification</Text>
          <Text style={styles.emptySubtext}>
            Vous recevrez des notifications ici quand il y aura des mises à jour
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 80,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: '#000',
    flex: 1,
  },
  debugButton: {
    padding: 8,
  },
  debugButtonText: {
    fontSize: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E1E6',
    position: 'relative',
  },
  readNotification: {
    opacity: 0.7,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#000',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});