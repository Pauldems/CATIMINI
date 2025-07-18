import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationConfig {
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
  priority?: 'default' | 'high' | 'max';
  sound?: boolean | string;
  badge?: number;
  sticky?: boolean;
}

export class NotificationUtils {
  /**
   * Configure les actions interactives pour iOS
   */
  static async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('event_action', [
        {
          identifier: 'ACCEPT_ACTION',
          buttonTitle: 'Accepter',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DECLINE_ACTION',
          buttonTitle: 'Décliner',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('reminder_action', [
        {
          identifier: 'SNOOZE_ACTION',
          buttonTitle: 'Rappel dans 5 min',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'DISMISS_ACTION',
          buttonTitle: 'OK',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }
  }

  /**
   * Formate une notification pour différents types d'événements
   */
  static formatNotificationForEventType(
    type: 'new_event' | 'event_reminder' | 'participant_unavailable' | 'event_deleted',
    data: any
  ): NotificationConfig {
    switch (type) {
      case 'new_event':
        return {
          title: '📅 Nouvel événement',
          body: `Vous avez un événement prochainement: ${data.eventTitle}`,
          data: { eventId: data.eventId, type: 'new_event' },
          categoryId: 'event_action',
          priority: 'high',
          sound: true,
        };

      case 'event_reminder':
        return {
          title: '⏰ Rappel d\'événement',
          body: `L'événement "${data.eventTitle}" commence dans ${data.timeUntil}`,
          data: { eventId: data.eventId, type: 'reminder' },
          categoryId: 'reminder_action',
          priority: 'max',
          sound: true,
        };

      case 'participant_unavailable':
        return {
          title: '⚠️ Changement de participants',
          body: `${data.userName} ne participera plus à "${data.eventTitle}"`,
          data: { eventId: data.eventId, type: 'participant_change' },
          priority: 'default',
          sound: true,
        };

      case 'event_deleted':
        return {
          title: '❌ Événement annulé',
          body: `L'événement "${data.eventTitle}" a été supprimé`,
          data: { eventId: data.eventId, type: 'event_deleted' },
          priority: 'high',
          sound: true,
        };

      default:
        return {
          title: 'Notification',
          body: 'Vous avez une nouvelle notification',
          priority: 'default',
          sound: true,
        };
    }
  }

  /**
   * Planifie une notification locale (pour les rappels)
   */
  static async scheduleLocalNotification(
    config: NotificationConfig,
    scheduledTime: Date
  ): Promise<string> {
    const trigger = {
      date: scheduledTime,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: config.data || {},
        categoryIdentifier: config.categoryId,
        sound: config.sound !== false,
        badge: config.badge,
        sticky: config.sticky || false,
      },
      trigger,
    });

    console.log('📅 [NotificationUtils] Local notification scheduled:', notificationId);
    return notificationId;
  }

  /**
   * Annule une notification locale
   */
  static async cancelLocalNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('❌ [NotificationUtils] Local notification cancelled:', notificationId);
  }

  /**
   * Annule toutes les notifications locales
   */
  static async cancelAllLocalNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('❌ [NotificationUtils] All local notifications cancelled');
  }

  /**
   * Vérifie les permissions de notifications
   */
  static async checkNotificationPermissions(): Promise<{
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  }> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  }

  /**
   * Ouvre les paramètres de l'application
   */
  static async openAppSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      // Sur iOS, on peut ouvrir les paramètres de l'app
      await Notifications.openSettingsAsync();
    } else {
      // Sur Android, on ouvre les paramètres généraux
      await Notifications.openSettingsAsync();
    }
  }

  /**
   * Calcule le nombre de badges à afficher
   */
  static async updateBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Efface le badge
   */
  static async clearBadge(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }
  }
}

export default NotificationUtils;