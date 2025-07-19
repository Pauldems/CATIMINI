# 🔧 CONFIGURATION FIREBASE AUTH - SOLUTION URGENT

## 🚨 Problème : Domain not allowlisted

L'erreur `Domain not allowlisted by project` signifie que le domaine pour l'email de vérification n'est pas autorisé.

## ✅ SOLUTION IMMÉDIATE :

### 1. Aller dans Firebase Console :
- https://console.firebase.google.com/project/catimini-256a1/authentication/settings

### 2. Onglet "Authorized domains" :
- Ajouter : `catimini-app.firebaseapp.com`
- Ajouter : `catimini-256a1.firebaseapp.com`

### 3. Template Email :
- Aller dans "Templates" 
- "Email address verification"
- Changer l'URL : `https://catimini-256a1.firebaseapp.com`

## 🔧 SOLUTION TEMPORAIRE :

En attendant, utiliser le domaine Firebase par défaut dans le code :

```typescript
const actionCodeSettings = {
  url: 'https://catimini-256a1.firebaseapp.com',
  handleCodeInApp: true,
};
```

## 🎯 RÉSULTAT ATTENDU :

Après cette configuration, l'email de vérification devrait fonctionner sans erreur "Domain not allowlisted".

## 🚀 TESTE APRÈS CONFIGURATION :

1. Configurer les domaines autorisés
2. Tester l'inscription
3. Vérifier la réception de l'email magnifique