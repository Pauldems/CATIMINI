# 🚀 SETUP FIREBASE FUNCTIONS + SENDGRID POUR EMAILS PRO

## 1. Installation Firebase Functions

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser Functions dans ton projet
cd /Users/tometpaul/Documents/CATIMINI/CatiminiApp
firebase init functions

# Choisir :
# - TypeScript
# - ESLint
# - Install dependencies
```

## 2. Configuration SendGrid

### A. Créer un compte SendGrid :
1. Aller sur https://sendgrid.com
2. Créer un compte gratuit
3. Vérifier l'email

### B. Obtenir l'API Key :
1. Settings > API Keys
2. Create API Key
3. Full Access
4. Copier la clé (format : SG.xxx...)

### C. Configuration Firebase :
```bash
# Définir la clé API comme secret
firebase functions:secrets:set SENDGRID_API_KEY
# Coller ta clé SendGrid
```

## 3. Template HTML pour Créno

Créer un template magnifique avec :
- Logo Créno
- Couleurs #1A3B5C et #FFB800
- Design responsive
- Bouton de vérification stylé

## 4. Fonction Firebase

Créer une fonction qui :
- Reçoit les données utilisateur
- Génère un lien de vérification custom
- Envoie l'email via SendGrid
- Retourne le succès/échec

## 5. Modification de l'app

Remplacer `sendEmailVerification` par un appel à ta fonction custom.

## 6. Avantages

✅ Email 100% personnalisé
✅ Logo et couleurs Créno
✅ Design professionnel
✅ Tracking des ouvertures
✅ Anti-spam garanti
✅ Statistiques détaillées

## 7. Coût

- SendGrid : Gratuit jusqu'à 100 emails/jour
- Firebase Functions : Gratuit jusqu'à 2M appels/mois
- Total : 0€ pour commencer

Veux-tu que je t'aide à implémenter cette solution ?