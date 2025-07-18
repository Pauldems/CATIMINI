import { Event } from '../types';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents: Event[];
  conflictMessage?: string;
}

/**
 * Vérifie si un utilisateur a des conflits d'événements pour un créneau donné
 */
export function checkEventConflicts(
  userId: string,
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string,
  existingEvents: Event[],
  excludeEventId?: string
): ConflictCheckResult {
  const conflictingEvents: Event[] = [];
  
  // Filtrer les événements du user et exclure l'événement en cours si fourni
  const userEvents = existingEvents.filter(event => 
    event.participants.includes(userId) && 
    event.id !== excludeEventId
  );

  console.log(`🔍 [${userId}] TOTAL événements dans la base:`, existingEvents.length);
  console.log(`🔍 [${userId}] Événements où je participe:`, userEvents.length);
  console.log(`🔍 [${userId}] Détail des événements où je participe:`, userEvents.map(e => `${e.title} (${e.startDate} ${e.startTime}-${e.endTime})`));
  console.log(`🔍 [${userId}] Créneau recherché: ${startDate.toISOString().split('T')[0]} ${startTime}-${endTime}`);

  // Convertir les heures en minutes pour faciliter les comparaisons
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const newEventStartMinutes = startHour * 60 + startMin;
  const newEventEndMinutes = endHour * 60 + endMin;

  for (const event of userEvents) {
    console.log(`🔍 [${userId}] Vérification événement: ${event.title} (${event.startDate} ${event.startTime}-${event.endTime})`);
    
    // Comparer les dates string directement (format YYYY-MM-DD)
    const newStartDateStr = startDate.toISOString().split('T')[0];
    const newEndDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`🔍 [${userId}] Dates nouvel événement: ${newStartDateStr} à ${newEndDateStr}`);
    console.log(`🔍 [${userId}] Dates événement existant: ${event.startDate} à ${event.endDate}`);
    
    // Vérifier si les dates se chevauchent (comparaison string)
    const datesOverlap = newStartDateStr <= event.endDate && newEndDateStr >= event.startDate;
    console.log(`🔍 [${userId}] Comparaison: ${newStartDateStr} <= ${event.endDate} && ${newEndDateStr} >= ${event.startDate} = ${datesOverlap}`);
    
    if (datesOverlap) {
      console.log(`🔍 [${userId}] ✅ Dates se chevauchent`);
      
      // Les dates se chevauchent, vérifier les heures
      const [eventStartHour, eventStartMin] = event.startTime.split(':').map(Number);
      const [eventEndHour, eventEndMin] = event.endTime.split(':').map(Number);
      const existingEventStartMinutes = eventStartHour * 60 + eventStartMin;
      const existingEventEndMinutes = eventEndHour * 60 + eventEndMin;
      
      console.log(`🔍 [${userId}] Heures nouvel événement: ${newEventStartMinutes}-${newEventEndMinutes}min`);
      console.log(`🔍 [${userId}] Heures événement existant: ${existingEventStartMinutes}-${existingEventEndMinutes}min`);
      
      // Vérifier si les heures se chevauchent
      if (newEventStartMinutes < existingEventEndMinutes && 
          newEventEndMinutes > existingEventStartMinutes) {
        console.log(`🔍 [${userId}] ⚠️ CONFLIT DÉTECTÉ !`);
        conflictingEvents.push(event);
      } else {
        console.log(`🔍 [${userId}] ✅ Pas de conflit d'heures`);
      }
    } else {
      console.log(`🔍 [${userId}] ❌ Dates ne se chevauchent pas`);
    }
  }

  const hasConflict = conflictingEvents.length > 0;
  let conflictMessage = '';

  if (hasConflict) {
    if (conflictingEvents.length === 1) {
      const event = conflictingEvents[0];
      conflictMessage = `Conflit avec l'événement "${event.title}" du ${new Date(event.startDate).toLocaleDateString('fr-FR')} de ${event.startTime} à ${event.endTime}`;
    } else {
      conflictMessage = `Conflit avec ${conflictingEvents.length} événements existants`;
    }
  }

  return {
    hasConflict,
    conflictingEvents,
    conflictMessage
  };
}

/**
 * Vérifie si plusieurs participants ont des conflits pour un créneau donné
 */
export function checkMultiParticipantConflicts(
  participantIds: string[],
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string,
  existingEvents: Event[],
  excludeEventId?: string
): { [userId: string]: ConflictCheckResult } {
  const results: { [userId: string]: ConflictCheckResult } = {};
  
  for (const userId of participantIds) {
    results[userId] = checkEventConflicts(
      userId,
      startDate,
      endDate,
      startTime,
      endTime,
      existingEvents,
      excludeEventId
    );
  }
  
  return results;
}

/**
 * Résume les conflits pour tous les participants
 */
export function summarizeConflicts(
  conflictResults: { [userId: string]: ConflictCheckResult },
  userNames: { [userId: string]: string }
): {
  hasAnyConflict: boolean;
  conflictingSummary: string;
  conflictingUsers: string[];
} {
  const conflictingUsers = Object.keys(conflictResults).filter(
    userId => conflictResults[userId].hasConflict
  );
  
  const hasAnyConflict = conflictingUsers.length > 0;
  let conflictingSummary = '';
  
  if (hasAnyConflict) {
    const userNamesWithConflicts = conflictingUsers.map(
      userId => userNames[userId] || 'Utilisateur inconnu'
    );
    
    if (conflictingUsers.length === 1) {
      conflictingSummary = `${userNamesWithConflicts[0]} a déjà un événement programmé sur ce créneau.`;
    } else {
      conflictingSummary = `${userNamesWithConflicts.join(', ')} ont déjà des événements programmés sur ce créneau.`;
    }
  }
  
  return {
    hasAnyConflict,
    conflictingSummary,
    conflictingUsers
  };
}