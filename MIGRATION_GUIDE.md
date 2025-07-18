# Guide de Migration - Refactorisation Architecture

## Résumé des changements

Cette refactorisation réorganise l'application selon la structure professionnelle demandée :

```
src/
├── features/
│   ├── field/           ← Terrains/Événements (ex-field/)
│   │   ├── screens/     ← Écrans principaux
│   │   └── components/  ← Composants spécifiques
│   ├── auth/            ← Authentification
│   │   └── screens/     ← LoginScreen, RegisterScreen
│   ├── chat/            ← Messages (préparé pour le futur)
│   │   └── screens/     ← À implémenter
│   └── profile/         ← Profil utilisateur
│       ├── screens/     ← FriendsScreen, SettingsScreen
│       └── components/  ← DeleteAccountModal, etc.
├── components/          ← Composants UI réutilisables
│   ├── Calendar/        ← CalendarWithMarkers
│   ├── Events/          ← EventCard
│   └── Common/          ← Button, CustomTabBar, ScreenWrapper
├── hooks/               ← Hooks personnalisés
│   ├── useCalendarData.ts
│   ├── useEventActions.ts
│   └── useCurrentGroup.ts
├── services/            ← Services Firebase, API, etc.
├── navigation/          ← Navigation (structure existante)
├── store/               ← State management global (Zustand)
│   ├── eventStore.ts
│   └── index.ts
└── utils/               ← Fonctions utilitaires
```

## Nouveaux composants créés

### 1. **CalendarWithMarkers** (`src/components/Calendar/`)
- Composant calendrier réutilisable avec marqueurs
- Gère automatiquement les thèmes et les styles
- Interface unifiée pour tous les écrans

### 2. **EventCard** (`src/components/Events/`)
- Carte d'événement standardisée
- Indicateurs visuels (créateur, participation)
- Formatage des dates et heures

### 3. **Button** (`src/components/Common/`)
- Bouton réutilisable avec variantes
- Styles cohérents avec le thème
- États loading et disabled

## Nouveaux hooks créés

### 1. **useCalendarData** (`src/hooks/`)
- Hook centralisé pour les données calendrier
- Gestion des événements et disponibilités
- Génération automatique des marqueurs

### 2. **useEventActions** (`src/hooks/`)
- Actions CRUD pour les événements
- Gestion des erreurs et du loading
- Interface simplifiée

## Store global (Zustand)

### 1. **eventStore** (`src/store/`)
- State management centralisé
- Listeners Firebase automatiques
- Fonctions utilitaires pour les requêtes

## Migrations des imports

### Avant :
```typescript
import LoginScreen from './src/features/auth/LoginScreen';
import CustomTabBar from './src/navigation/CustomTabBar';
```

### Après :
```typescript
import { LoginScreen } from './src/features/auth/screens';
import { CustomTabBar } from './src/components';
```

## Prochaines étapes

1. **Finaliser les imports** - Mettre à jour tous les fichiers restants
2. **Tester l'application** - Vérifier que tout fonctionne
3. **Implémenter chat/** - Ajouter la messagerie
4. **Optimiser les performances** - Utiliser le store global
5. **Ajouter des tests** - Tester les hooks et composants

## Avantages de cette structure

- **Maintenabilité** : Code mieux organisé et plus facile à maintenir
- **Réutilisabilité** : Composants et hooks réutilisables
- **Scalabilité** : Structure prête pour l'expansion (chat, etc.)
- **Performance** : State management global optimisé
- **Développement** : Imports plus clairs et typés

## Notes importantes

- Toutes les fonctionnalités existantes sont préservées
- Les chemins d'imports ont été mis à jour dans App.tsx
- Les composants sont typés avec TypeScript
- Le store global est prêt à être utilisé
- Structure prête pour l'ajout de nouvelles features