import { Availability, TimeSlot, Event } from '../types';

export function findAvailableSlots(
  availabilities: { [userId: string]: Availability[] },
  participants: string[],
  duration: number,
  startSearchDate?: Date,
  preferredStartTime?: Date,
  preferredEndTime?: Date,
  existingEvents?: Event[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const searchStart = startSearchDate || new Date();
  const searchEnd = new Date(searchStart);
  searchEnd.setDate(searchEnd.getDate() + 90); // Chercher sur 3 mois

  // Parcourir chaque jour
  for (let date = new Date(searchStart); date <= searchEnd; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Vérifier les indisponibilités pour cette date
    const participantUnavailabilities: { [userId: string]: Availability[] } = {};
    const participantEvents: { [userId: string]: Event[] } = {};
    let anyParticipantFullyUnavailable = false;

    for (const userId of participants) {
      const userUnavails = availabilities[userId]?.filter(
        (a) => a.date === dateStr && !a.isAvailable
      ) || [];
      
      participantUnavailabilities[userId] = userUnavails;
      
      // Récupérer les événements existants pour cet utilisateur à cette date
      const userEvents = existingEvents?.filter(event => {
        if (!event.participants.includes(userId)) return false;
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = new Date(event.endDate);
        return date >= eventStartDate && date <= eventEndDate;
      }) || [];
      
      participantEvents[userId] = userEvents;
      
      // Vérifier si l'utilisateur a des indisponibilités qui couvrent complètement les heures souhaitées
      if (preferredStartTime && preferredEndTime) {
        const preferredStartHour = preferredStartTime.getHours();
        const preferredEndHour = preferredEndTime.getHours();
        
        // Vérifier si les indisponibilités couvrent complètement la plage souhaitée
        const unavailableRanges = userUnavails.map(unavail => ({
          start: parseInt(unavail.startTime.split(':')[0]),
          end: parseInt(unavail.endTime.split(':')[0])
        }));
        
        // Trier et fusionner les plages d'indisponibilité
        unavailableRanges.sort((a, b) => a.start - b.start);
        const mergedRanges = [];
        for (const range of unavailableRanges) {
          if (mergedRanges.length === 0 || mergedRanges[mergedRanges.length - 1].end < range.start) {
            mergedRanges.push(range);
          } else {
            mergedRanges[mergedRanges.length - 1].end = Math.max(mergedRanges[mergedRanges.length - 1].end, range.end);
          }
        }
        
        // Vérifier si la plage souhaitée est complètement couverte par les indisponibilités
        const isFullyCovered = mergedRanges.some(range => 
          range.start <= preferredStartHour && range.end >= preferredEndHour
        );
        
        if (isFullyCovered) {
          anyParticipantFullyUnavailable = true;
          break;
        }
      } else {
        // Mode durée : vérifier si toute la journée est indisponible
        const hasFullDayUnavailability = userUnavails.some(unavail => {
          const startHour = parseInt(unavail.startTime.split(':')[0]);
          const endHour = parseInt(unavail.endTime.split(':')[0]);
          return startHour <= 0 && endHour >= 23;
        });
        
        if (hasFullDayUnavailability) {
          anyParticipantFullyUnavailable = true;
          break;
        }
      }
    }

    if (anyParticipantFullyUnavailable) continue;

    // Trouver les créneaux communs pour cette date (en évitant les indisponibilités et événements)
    const commonSlots = findAvailableSlotsForDay(
      participantUnavailabilities, 
      participants, 
      date, 
      preferredStartTime, 
      preferredEndTime,
      participantEvents
    );
    
    // Vérifier si on peut créer un événement de la durée souhaitée
    for (const slot of commonSlots) {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);
      
      if (slotDuration >= duration / 24) { // duration est en jours
        // Si l'événement dure plusieurs jours, vérifier les jours suivants
        if (duration > 1) {
          const endDate = new Date(date);
          endDate.setDate(endDate.getDate() + duration - 1);
          
          if (canScheduleMultiDayEvent(
            availabilities,
            participants,
            date,
            endDate,
            slot.start.getHours(),
            slot.end.getHours(),
            existingEvents
          )) {
            slots.push({
              startDate: new Date(date.setHours(slot.start.getHours(), slot.start.getMinutes())),
              endDate: new Date(endDate.setHours(slot.end.getHours(), slot.end.getMinutes())),
              availableUsers: participants,
            });
          }
        } else {
          // Événement d'un seul jour
          slots.push({
            startDate: slot.start,
            endDate: slot.end,
            availableUsers: participants,
          });
        }
      }
    }
  }

  return slots.slice(0, 10); // Retourner les 10 premiers créneaux
}

function findAvailableSlotsForDay(
  participantUnavailabilities: { [userId: string]: Availability[] },
  participants: string[],
  date: Date,
  preferredStartTime?: Date,
  preferredEndTime?: Date,
  participantEvents?: { [userId: string]: Event[] }
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = [];
  
  // Utiliser les heures préférées si disponibles, sinon par défaut 9h-18h
  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  
  if (preferredStartTime && preferredEndTime) {
    dayStart.setHours(preferredStartTime.getHours(), preferredStartTime.getMinutes(), 0, 0);
    dayEnd.setHours(preferredEndTime.getHours(), preferredEndTime.getMinutes(), 0, 0);
  } else {
    dayStart.setHours(9, 0, 0, 0);
    dayEnd.setHours(18, 0, 0, 0);
  }
  
  // Collecter toutes les indisponibilités et événements de tous les participants
  const allUnavailabilities: { start: Date; end: Date }[] = [];
  
  for (const userId of participants) {
    const userUnavails = participantUnavailabilities[userId] || [];
    
    // Ajouter les indisponibilités
    for (const unavail of userUnavails) {
      const [startHour, startMin] = unavail.startTime.split(':').map(Number);
      const [endHour, endMin] = unavail.endTime.split(':').map(Number);
      
      const unavailStart = new Date(date);
      unavailStart.setHours(startHour, startMin);
      const unavailEnd = new Date(date);
      unavailEnd.setHours(endHour, endMin);
      
      allUnavailabilities.push({
        start: unavailStart,
        end: unavailEnd
      });
    }
    
    // Ajouter les événements existants
    const userEvents = participantEvents?.[userId] || [];
    for (const event of userEvents) {
      const [startHour, startMin] = event.startTime.split(':').map(Number);
      const [endHour, endMin] = event.endTime.split(':').map(Number);
      
      const eventStart = new Date(date);
      eventStart.setHours(startHour, startMin);
      const eventEnd = new Date(date);
      eventEnd.setHours(endHour, endMin);
      
      allUnavailabilities.push({
        start: eventStart,
        end: eventEnd
      });
    }
  }
  
  // Si aucune indisponibilité, le créneau entier est disponible
  if (allUnavailabilities.length === 0) {
    slots.push({
      start: new Date(dayStart),
      end: new Date(dayEnd)
    });
    return slots;
  }
  
  // Trier les indisponibilités par heure de début
  allUnavailabilities.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Fusionner les indisponibilités qui se chevauchent
  const mergedUnavailabilities: { start: Date; end: Date }[] = [];
  for (const unavail of allUnavailabilities) {
    if (mergedUnavailabilities.length === 0) {
      mergedUnavailabilities.push(unavail);
    } else {
      const last = mergedUnavailabilities[mergedUnavailabilities.length - 1];
      if (unavail.start <= last.end) {
        // Fusionner
        last.end = new Date(Math.max(last.end.getTime(), unavail.end.getTime()));
      } else {
        mergedUnavailabilities.push(unavail);
      }
    }
  }
  
  // Créer les créneaux disponibles en évitant les indisponibilités
  let currentTime = dayStart;
  
  for (const unavail of mergedUnavailabilities) {
    if (currentTime < unavail.start) {
      // Il y a un créneau disponible avant cette indisponibilité
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(unavail.start);
      
      // Si on a des heures préférées, vérifier si le créneau peut les contenir
      if (preferredStartTime && preferredEndTime) {
        const preferredStart = new Date(date);
        preferredStart.setHours(preferredStartTime.getHours(), preferredStartTime.getMinutes());
        const preferredEnd = new Date(date);
        preferredEnd.setHours(preferredEndTime.getHours(), preferredEndTime.getMinutes());
        
        // Vérifier si le créneau disponible peut contenir l'horaire souhaité
        if (slotStart <= preferredStart && slotEnd >= preferredEnd) {
          slots.push({
            start: preferredStart,
            end: preferredEnd
          });
        }
      } else {
        slots.push({
          start: slotStart,
          end: slotEnd
        });
      }
    }
    currentTime = new Date(Math.max(currentTime.getTime(), unavail.end.getTime()));
  }
  
  // Ajouter le créneau final s'il reste du temps
  if (currentTime < dayEnd) {
    if (preferredStartTime && preferredEndTime) {
      const preferredStart = new Date(date);
      preferredStart.setHours(preferredStartTime.getHours(), preferredStartTime.getMinutes());
      const preferredEnd = new Date(date);
      preferredEnd.setHours(preferredEndTime.getHours(), preferredEndTime.getMinutes());
      
      // Vérifier si le créneau final peut contenir l'horaire souhaité
      if (currentTime <= preferredStart && dayEnd >= preferredEnd) {
        slots.push({
          start: preferredStart,
          end: preferredEnd
        });
      }
    } else {
      slots.push({
        start: new Date(currentTime),
        end: new Date(dayEnd)
      });
    }
  }
  
  return slots;
}

function canScheduleMultiDayEvent(
  availabilities: { [userId: string]: Availability[] },
  participants: string[],
  startDate: Date,
  endDate: Date,
  startHour: number,
  endHour: number,
  existingEvents?: Event[]
): boolean {
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    
    for (const userId of participants) {
      // Récupérer les indisponibilités pour cette date
      const userUnavails = availabilities[userId]?.filter(
        (a) => a.date === dateStr && !a.isAvailable
      ) || [];
      
      // Vérifier si une indisponibilité entre en conflit avec l'horaire souhaité
      const hasUnavailabilityConflict = userUnavails.some((unavail) => {
        const [unavailStartHour, unavailStartMin] = unavail.startTime.split(':').map(Number);
        const [unavailEndHour, unavailEndMin] = unavail.endTime.split(':').map(Number);
        
        const unavailStart = unavailStartHour * 60 + unavailStartMin;
        const unavailEnd = unavailEndHour * 60 + unavailEndMin;
        const eventStart = startHour * 60;
        const eventEnd = endHour * 60;
        
        // Vérifier le chevauchement
        return (unavailStart < eventEnd && unavailEnd > eventStart);
      });
      
      if (hasUnavailabilityConflict) return false;
      
      // Vérifier les événements existants
      const userEvents = existingEvents?.filter(event => {
        if (!event.participants.includes(userId)) return false;
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = new Date(event.endDate);
        return date >= eventStartDate && date <= eventEndDate;
      }) || [];
      
      const hasEventConflict = userEvents.some((event) => {
        const [eventStartHour, eventStartMin] = event.startTime.split(':').map(Number);
        const [eventEndHour, eventEndMin] = event.endTime.split(':').map(Number);
        
        const existingEventStart = eventStartHour * 60 + eventStartMin;
        const existingEventEnd = eventEndHour * 60 + eventEndMin;
        const newEventStart = startHour * 60;
        const newEventEnd = endHour * 60;
        
        // Vérifier le chevauchement
        return (existingEventStart < newEventEnd && existingEventEnd > newEventStart);
      });
      
      if (hasEventConflict) return false;
    }
  }
  
  return true;
}