import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Event } from '../../types';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  showParticipants?: boolean;
  currentUserId?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  showParticipants = false,
  currentUserId
}) => {
  const isCreator = currentUserId === event.creatorId;
  const isParticipant = currentUserId && event.participants.includes(currentUserId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isCreator && styles.creatorContainer,
        !isParticipant && styles.notParticipantContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        {isCreator && (
          <View style={styles.creatorBadge}>
            <Text style={styles.creatorText}>Créateur</Text>
          </View>
        )}
      </View>

      {event.description && (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      <View style={styles.dateTimeContainer}>
        <Text style={styles.date}>
          {event.startDate === event.endDate
            ? formatDate(event.startDate)
            : `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
          }
        </Text>
        <Text style={styles.time}>
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </Text>
      </View>

      {showParticipants && (
        <View style={styles.participantsContainer}>
          <Text style={styles.participantsLabel}>
            {event.participants.length} participant{event.participants.length > 1 ? 's' : ''}
          </Text>
          {event.confirmedParticipants.length !== event.participants.length && (
            <Text style={styles.pendingText}>
              {event.confirmedParticipants.length} confirmé{event.confirmedParticipants.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  creatorContainer: {
    borderColor: Colors.secondary,
    borderWidth: 2,
  },
  notParticipantContainer: {
    opacity: 0.7,
    borderColor: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  creatorBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  creatorText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  time: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  participantsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  participantsLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});