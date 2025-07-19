# Guide de récupération des fonctions Firebase

## Contexte
Les fonctions Firebase `testNotification` et `onNotificationCreated` avaient été supprimées par accident lors du déploiement. Ce guide documente leur récupération.

## Fonctions récupérées

### 1. testNotification (us-central1)
- **Type**: Fonction callable (HTTPS)
- **Localisation**: us-central1
- **Fonction**: Tester l'envoi de notifications push

**Utilisation dans l'app**:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const testNotificationFunction = httpsCallable(functions, 'testNotification');

const result = await testNotificationFunction({
  title: '🧪 Test Notification',
  message: 'Message de test',
  testMode: false // true = test seulement, false = créer notification dans Firestore
});
```

### 2. onNotificationCreated (us-central1)
- **Type**: Trigger Firestore
- **Localisation**: us-central1
- **Trigger**: `notifications/{notificationId}` (document créé)
- **Fonction**: Envoyer automatiquement une notification push quand une notification est créée dans Firestore

**Fonctionnement automatique**:
- Se déclenche quand un document est créé dans `notifications/`
- Récupère le token push de l'utilisateur
- Envoie une notification push via l'API Expo
- Marque la notification comme envoyée

## Fichiers créés/modifiés

### 1. Nouveau fichier de service
- `functions/src/notificationService.ts` - Contient les deux fonctions

### 2. Fichier index mis à jour
- `functions/src/index.ts` - Ajout des exports pour les nouvelles fonctions

### 3. App mise à jour
- `src/features/field/DebugScreen.tsx` - Utilisation de la nouvelle fonction testNotification

## Déploiement

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Tests

### Test automatique
```bash
node test_firebase_functions.js
```

### Test dans l'app
1. Ouvrir l'écran Debug
2. Générer un token push
3. Tester l'envoi de notification

## Vérification du déploiement

```bash
firebase functions:list --project=catimini-256a1
```

Résultat attendu:
```
┌───────────────────────┬─────────┬────────────────────────────────────────────┬─────────────┬────────┬──────────┐
│ Function              │ Version │ Trigger                                    │ Location    │ Memory │ Runtime  │
├───────────────────────┼─────────┼────────────────────────────────────────────┼─────────────┼────────┼──────────┤
│ onNotificationCreated │ v2      │ google.cloud.firestore.document.v1.created │ us-central1 │ 256    │ nodejs18 │
├───────────────────────┼─────────┼────────────────────────────────────────────┼─────────────┼────────┼──────────┤
│ sendVerificationEmail │ v2      │ callable                                   │ us-central1 │ 256    │ nodejs18 │
├───────────────────────┼─────────┼────────────────────────────────────────────┼─────────────┼────────┼──────────┤
│ testNotification      │ v2      │ callable                                   │ us-central1 │ 256    │ nodejs18 │
└───────────────────────┴─────────┴────────────────────────────────────────────┴─────────────┴────────┴──────────┘
```

## Fonctionnalités des fonctions récupérées

### testNotification
- Vérification de l'authentification
- Récupération du token push utilisateur
- Envoi de notification push via API Expo
- Création optionnelle dans Firestore
- Gestion d'erreurs complète

### onNotificationCreated
- Trigger automatique sur création de notification
- Récupération du token push
- Envoi de notification push
- Marquage de la notification comme envoyée
- Gestion d'erreurs non-bloquante

## Améliorations apportées

1. **Meilleure gestion d'erreurs** - Les fonctions sont robustes aux erreurs
2. **Logging détaillé** - Suivi complet des opérations
3. **Sécurité** - Vérification d'authentification pour testNotification
4. **Flexibilité** - Mode test pour testNotification
5. **Intégration** - Mise à jour de l'app pour utiliser les nouvelles fonctions

## Maintenance

- Les fonctions sont maintenant versionnées dans le code source
- Elles peuvent être facilement redéployées en cas de problème
- Les tests permettent de vérifier leur bon fonctionnement

## Récupération réussie le 18/07/2025
- testNotification: ✅ Déployée et fonctionnelle
- onNotificationCreated: ✅ Déployée et fonctionnelle
- Integration dans l'app: ✅ Terminée
- Tests: ✅ Disponibles