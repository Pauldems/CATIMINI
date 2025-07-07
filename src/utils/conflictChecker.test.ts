// Fichier de test pour vérifier la logique de détection de conflits
// Ce fichier peut être utilisé pour valider manuellement le bon fonctionnement

import { checkEventConflicts, Event } from './conflictChecker';

// Exemple d'événements existants pour les tests
const existingEvents: Event[] = [
  {
    id: 'event1',
    creatorId: 'user1',
    title: 'Réunion matinale',
    startDate: '2025-07-08',
    endDate: '2025-07-08',
    startTime: '09:00',
    endTime: '11:00',
    participants: ['user1', 'user2'],
    confirmedParticipants: ['user1'],
    duration: 1,
    createdAt: new Date()
  },
  {
    id: 'event2',
    creatorId: 'user2',
    title: 'Déjeuner d\'affaires',
    startDate: '2025-07-08',
    endDate: '2025-07-08',
    startTime: '12:00',
    endTime: '14:00',
    participants: ['user1', 'user3'],
    confirmedParticipants: ['user2'],
    duration: 1,
    createdAt: new Date()
  },
  {
    id: 'event3',
    creatorId: 'user3',
    title: 'Formation sur 2 jours',
    startDate: '2025-07-10',
    endDate: '2025-07-11',
    startTime: '09:00',
    endTime: '17:00',
    participants: ['user1', 'user3'],
    confirmedParticipants: ['user3'],
    duration: 2,
    createdAt: new Date()
  }
];

// Test 1: Pas de conflit
console.log('=== Test 1: Pas de conflit ===');
const result1 = checkEventConflicts(
  'user1',
  new Date('2025-07-08'),
  new Date('2025-07-08'),
  '15:00',
  '17:00',
  existingEvents
);
console.log('Résultat:', result1);

// Test 2: Conflit avec un événement existant
console.log('\n=== Test 2: Conflit avec réunion matinale ===');
const result2 = checkEventConflicts(
  'user1',
  new Date('2025-07-08'),
  new Date('2025-07-08'),
  '10:00',
  '12:00',
  existingEvents
);
console.log('Résultat:', result2);

// Test 3: Conflit partiel avec chevauchement
console.log('\n=== Test 3: Conflit partiel (chevauchement) ===');
const result3 = checkEventConflicts(
  'user1',
  new Date('2025-07-08'),
  new Date('2025-07-08'),
  '13:00',
  '15:00',
  existingEvents
);
console.log('Résultat:', result3);

// Test 4: Conflit avec événement multi-jour
console.log('\n=== Test 4: Conflit avec formation multi-jour ===');
const result4 = checkEventConflicts(
  'user1',
  new Date('2025-07-10'),
  new Date('2025-07-10'),
  '14:00',
  '16:00',
  existingEvents
);
console.log('Résultat:', result4);

// Test 5: Pas de conflit - utilisateur non participant
console.log('\n=== Test 5: Pas de conflit - utilisateur non participant ===');
const result5 = checkEventConflicts(
  'user4',
  new Date('2025-07-08'),
  new Date('2025-07-08'),
  '10:00',
  '12:00',
  existingEvents
);
console.log('Résultat:', result5);

export { }; // Pour éviter les erreurs de module