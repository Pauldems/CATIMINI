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

    for (const userId of participants) {
      const userUnavails = availabilities[userId]?.filter(
        (a) => a.date === dateStr && !a.isAvailable
      ) || [];
      
      console.log(`🔍 [SlotFinder] Utilisateur ${userId} sur ${dateStr}: ${userUnavails.length} indisponibilités trouvées`);
      userUnavails.forEach(unavail => {
        console.log(`   - ${unavail.startTime}-${unavail.endTime} ${unavail.createdByEvent ? `(créée par événement ${unavail.createdByEvent})` : '(manuelle)'}`);
      });
      
      participantUnavailabilities[userId] = userUnavails;
      
      // Récupérer les événements existants pour cet utilisateur à cette date
      const userEvents = existingEvents?.filter(event => {
        if (!event.participants.includes(userId)) return false;
        
        // Comparer les dates string directement (même logique que conflictChecker)
        const currentDateStr = dateStr;
        const isOnDate = currentDateStr >= event.startDate && currentDateStr <= event.endDate;
        console.log(`🔍 [SlotFinder] Utilisateur ${userId}, événement ${event.title}: ${isOnDate ? '✅' : '❌'} (${currentDateStr} vs ${event.startDate}-${event.endDate})`);
        return isOnDate;
      }) || [];
      
      participantEvents[userId] = userEvents;
      
      
      // Pas de vérification préalable pour exclure tout le jour
      // La vérification des conflits se fera créneau par créneau dans findAvailableSlotsForDay
    }

    console.log(`✅ [SlotFinder] Jour ${dateStr} : recherche des créneaux disponibles`);

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
      
      if (duration > 1 || slotDuration >= duration) { // duration > 1 = multi-jours, sinon duration en heures
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

  console.log(`📊 [SlotFinder] Total créneaux trouvés: ${slots.length}`);
  slots.forEach((slot, index) => {
    console.log(`   ${index + 1}. ${slot.startDate.toISOString().split('T')[0]} ${slot.startDate.toTimeString().slice(0,5)}-${slot.endDate.toTimeString().slice(0,5)}`);
  });
  
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
  // Si on n'a pas d'heures préférées, utiliser toute la journée (00h00-23h59)
  if (!preferredStartTime || !preferredEndTime) {
    const defaultStart = new Date(date);
    defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(date);
    defaultEnd.setHours(23, 59, 59, 999);
    preferredStartTime = defaultStart;
    preferredEndTime = defaultEnd;
  }
  
  const preferredStartMinutes = preferredStartTime.getHours() * 60 + preferredStartTime.getMinutes();
  const preferredEndMinutes = preferredEndTime.getHours() * 60 + preferredEndTime.getMinutes();
  const dateStr = date.toISOString().split('T')[0];
  
  console.log(`🔍 [SlotFinder] Vérification créneau ${dateStr} ${preferredStartTime.getHours()}:${preferredStartTime.getMinutes().toString().padStart(2, '0')}-${preferredEndTime.getHours()}:${preferredEndTime.getMinutes().toString().padStart(2, '0')} (${preferredStartMinutes}-${preferredEndMinutes}min)`);
  
  // Vérifier pour chaque participant s'il y a conflit avec le créneau souhaité
  for (const userId of participants) {
    const userUnavails = participantUnavailabilities[userId] || [];
    const userEvents = participantEvents?.[userId] || [];
    
    // Vérifier les indisponibilités
    for (const unavail of userUnavails) {
      const [startHour, startMin] = unavail.startTime.split(':').map(Number);
      const [endHour, endMin] = unavail.endTime.split(':').map(Number);
      const unavailStart = startHour * 60 + startMin;
      const unavailEnd = endHour * 60 + endMin;
      
      // Vérifier s'il y a chevauchement
      const hasOverlap = unavailStart < preferredEndMinutes && unavailEnd > preferredStartMinutes;
      
      if (hasOverlap) {
        console.log(`❌ [SlotFinder] CONFLIT avec indisponibilité de ${userId}: ${unavailStart}-${unavailEnd}min vs ${preferredStartMinutes}-${preferredEndMinutes}min`);
        return []; // Pas de créneau disponible
      }
    }
    
    // Vérifier les événements existants
    for (const event of userEvents) {
      const [startHour, startMin] = event.startTime.split(':').map(Number);
      const [endHour, endMin] = event.endTime.split(':').map(Number);
      const eventStart = startHour * 60 + startMin;
      const eventEnd = endHour * 60 + endMin;
      
      // Vérifier s'il y a chevauchement
      const hasOverlap = eventStart < preferredEndMinutes && eventEnd > preferredStartMinutes;
      
      if (hasOverlap) {
        console.log(`❌ [SlotFinder] CONFLIT avec événement "${event.title}" de ${userId}: ${eventStart}-${eventEnd}min vs ${preferredStartMinutes}-${preferredEndMinutes}min`);
        return []; // Pas de créneau disponible
      }
    }
  }
  
  // Aucun conflit détecté, le créneau est disponible
  console.log(`✅ [SlotFinder] Créneau ${dateStr} ${preferredStartMinutes}-${preferredEndMinutes}min DISPONIBLE`);
  
  const slotStart = new Date(date);
  slotStart.setHours(preferredStartTime.getHours(), preferredStartTime.getMinutes(), 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(preferredEndTime.getHours(), preferredEndTime.getMinutes(), 0, 0);
  
  return [{
    start: slotStart,
    end: slotEnd
  }];
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