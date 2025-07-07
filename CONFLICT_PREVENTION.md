# Prévention des Conflits d'Événements

## Vue d'ensemble

Ce système empêche la création d'événements conflictuels en vérifiant que les participants n'ont pas déjà d'événements programmés sur les créneaux demandés.

## Fichiers modifiés

### 1. `/src/utils/conflictChecker.ts` (NOUVEAU)

Utilitaire principal pour la détection de conflits :

- `checkEventConflicts()` : Vérifie les conflits pour un utilisateur
- `checkMultiParticipantConflicts()` : Vérifie les conflits pour plusieurs participants
- `summarizeConflicts()` : Génère un résumé des conflits trouvés

### 2. `/src/utils/slotFinder.ts` (MODIFIÉ)

Amélioré pour prendre en compte les événements existants :

- Paramètre optionnel `existingEvents` ajouté à `findAvailableSlots()`
- Les événements existants sont maintenant traités comme des indisponibilités
- Évite les créneaux où des participants ont déjà des événements

### 3. `/src/screens/CreateEventScreen.tsx` (MODIFIÉ)

Interface utilisateur améliorée :

- Chargement de tous les événements existants
- Vérification des conflits avant création
- Dialogue de confirmation si des conflits sont détectés
- Noms des participants mis en cache pour les messages

## Fonctionnement

### 1. Recherche de créneaux

Quand un utilisateur recherche des créneaux :

1. Le système charge les indisponibilités de tous les participants
2. Il charge TOUS les événements existants
3. Il filtre les événements où chaque participant est impliqué
4. Il traite ces événements comme des indisponibilités
5. Il retourne seulement les créneaux vraiment libres

### 2. Création d'événement

Avant de créer un événement :

1. Vérification des conflits pour tous les participants
2. Si des conflits sont détectés :
   - Affichage d'un message explicatif
   - Option pour créer quand même ou annuler
3. Si pas de conflit, création directe

### 3. Types de conflits détectés

- **Conflits temporels** : Chevauchement d'horaires sur la même date
- **Conflits multi-jours** : Événements qui s'étendent sur plusieurs jours
- **Conflits partiels** : Chevauchements même de quelques minutes

## Exemples d'utilisation

```typescript
import { checkEventConflicts } from '../utils/conflictChecker';

// Vérifier un conflit pour un utilisateur
const result = checkEventConflicts(
  'userId123',
  new Date('2025-07-08'),
  new Date('2025-07-08'),
  '14:00',
  '16:00',
  existingEvents
);

if (result.hasConflict) {
  console.log(result.conflictMessage);
  // "Conflit avec l'événement "Réunion" du 8/7/2025 de 14:00 à 15:00"
}
```

## Messages utilisateur

### Conflits détectés
- **Un participant** : "John a déjà un événement programmé sur ce créneau."
- **Plusieurs participants** : "John, Marie ont déjà des événements programmés sur ce créneau."

### Détails spécifiques
- "Conflit avec l'événement "Réunion matinale" du 8/7/2025 de 09:00 à 11:00"
- "Conflit avec 2 événements existants"

## Configuration

Aucune configuration spécifique requise. Le système fonctionne automatiquement dès que les modifications sont déployées.

## Tests

Un fichier de test est disponible : `/src/utils/conflictChecker.test.ts`

Pour tester manuellement :
1. Créer des événements avec des utilisateurs
2. Essayer de créer un nouvel événement avec les mêmes participants sur un créneau qui chevauche
3. Vérifier que le système détecte le conflit

## Limitations actuelles

1. **Pas de gestion des fuseaux horaires** : Suppose que tous les utilisateurs sont dans le même fuseau
2. **Pas de conflits "souples"** : Certains utilisateurs pourraient vouloir des événements qui se chevauchent
3. **Pas de priorisation** : Tous les événements ont la même importance

## Améliorations futures possibles

1. **Conflits intelligents** : Détecter les types d'événements (travail vs personnel)
2. **Notifications proactives** : Alerter quand quelqu'un devient indisponible
3. **Suggestions alternatives** : Proposer des créneaux proches si conflit
4. **Historique des conflits** : Tracer les conflits évités pour statistiques