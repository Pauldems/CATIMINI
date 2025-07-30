# Corrections pour la production

## Problèmes identifiés

1. **Les écrans ne s'affichent pas en production** - Les listeners Firebase ne se déclenchent pas correctement
2. **Message "5 minutes" en production** - Le texte fait référence à la durée sandbox au lieu de la production
3. **"Invalid product id" après abonnement** - Le système ne reconnaît pas l'abonnement actif

## Solutions

### 1. Problème des listeners Firebase

Les écrans utilisent `onSnapshot` mais ne gèrent pas correctement les erreurs et le chargement initial. Voici les modifications nécessaires :

#### AvailabilityScreen.tsx
- Ajouter une gestion d'erreur robuste pour les listeners
- S'assurer que les données se chargent même sans listener actif
- Ajouter un fallback avec `getDocs` si `onSnapshot` échoue

#### FriendsScreen.tsx
- Même problème avec les listeners
- Charger les données de manière synchrone au démarrage

#### MyEventsScreen.tsx
- Vérifier que les listeners se déclenchent correctement
- Ajouter des logs pour débugger en production

### 2. Message "5 minutes" en production

Dans `PremiumModal.tsx`, ligne 203, le message affiche toujours la durée restante même en production. Il faut :
- Détecter si on est en sandbox ou production
- Afficher un message approprié pour la production
- Ne pas afficher de durée restante pour les abonnements production

### 3. Invalid product id

Dans `premiumService.ts`, le système vérifie l'abonnement mais :
- Ne gère pas correctement le cas où l'utilisateur est déjà abonné
- Le message d'erreur n'est pas approprié

## Actions immédiates

1. Ajouter des logs détaillés dans chaque écran pour comprendre pourquoi les données ne se chargent pas
2. Implémenter un système de fallback pour les listeners Firebase
3. Corriger l'affichage du statut premium
4. Gérer proprement le cas "déjà abonné"