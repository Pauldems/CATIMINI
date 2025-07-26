# Configuration RevenueCat pour Créno

## 🚀 Étapes pour configurer RevenueCat

### 1. Créer un compte RevenueCat
1. Aller sur [RevenueCat.com](https://www.revenuecat.com)
2. Créer un compte gratuit
3. Créer un nouveau projet "Créno"

### 2. Configuration dans RevenueCat Dashboard

#### Ajouter votre app iOS
1. Dans le dashboard RevenueCat, cliquer sur "Add App"
2. Sélectionner "iOS"
3. Bundle ID: `com.catimini.app`
4. App Name: "Créno"

#### Récupérer votre API Key
1. Dans Project Settings > API Keys
2. Copier la "Public iOS SDK Key"
3. La coller dans `src/services/revenueCatService.ts` :
```typescript
const REVENUECAT_API_KEY_IOS = 'votre_cle_api_ios'; // Remplacer ici
```

### 3. Configuration dans App Store Connect

#### Créer l'abonnement
1. Dans App Store Connect > Mon app > Fonctionnalités > Achats intégrés
2. Cliquer sur "+" > "Abonnement auto-renouvelable"
3. Nom de référence: "Créno Premium Monthly"
4. ID du produit: `creno_premium_monthly`
5. Groupe d'abonnements: "Premium"

#### Configurer les prix
1. Prix: 2,00 € (Niveau 2)
2. Durée: 1 mois
3. Activer pour tous les territoires

#### Ajouter les métadonnées
1. Nom d'affichage: "Créno Premium"
2. Description: "Indisponibilités et groupes illimités"

### 4. Lier App Store Connect à RevenueCat

1. Dans RevenueCat > App Settings > App Store Connect
2. Générer une clé API App Store Connect
3. Télécharger le fichier .p8
4. Uploader dans RevenueCat avec:
   - Key ID
   - Issuer ID
   - Bundle ID: `com.catimini.app`

### 5. Créer les Entitlements dans RevenueCat

1. Dans RevenueCat > Entitlements
2. Créer un entitlement "premium"
3. Associer au produit `creno_premium_monthly`

### 6. Créer l'Offering

1. Dans RevenueCat > Offerings
2. Créer une offering "default"
3. Ajouter le package "monthly" avec le produit `creno_premium_monthly`

## 📱 Test de l'intégration

### Mode Sandbox
1. Créer un testeur sandbox dans App Store Connect
2. Se connecter avec ce compte sur l'iPhone de test
3. Les achats seront gratuits et renouvelés rapidement

### Vérifications
- [ ] API Key configurée dans le code
- [ ] Produit créé dans App Store Connect
- [ ] Entitlement "premium" créé
- [ ] Offering "default" avec package "monthly"
- [ ] Testeur sandbox configuré

## 🔍 Debug

Si les produits n'apparaissent pas:
1. Vérifier que l'app est en "Ready for Sale" ou a un build uploadé
2. Attendre 24h après création des produits
3. Vérifier la configuration fiscale et bancaire dans App Store Connect

## 📝 Notes importantes

- RevenueCat est gratuit jusqu'à 10k$/mois de revenus
- Les achats sont gérés par Apple (commission 30% puis 15%)
- RevenueCat gère automatiquement:
  - Renouvellements
  - Annulations
  - Restauration des achats
  - Multi-plateforme (si Android plus tard)