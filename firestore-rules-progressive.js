// 🔒 RÈGLES FIREBASE PROGRESSIVES - ÉTAPE 1 : RÈGLES DE BASE
// Commencer par celles-ci, puis ajouter progressivement

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 👤 COLLECTION USERS - RÈGLES DE BASE
    match /users/{userId} {
      // Lecture : son propre profil ou utilisateurs authentifiés (temporaire)
      allow read: if request.auth != null;
      
      // Écriture : uniquement son propre profil
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 🏢 COLLECTION GROUPS - RÈGLES DE BASE
    match /groups/{groupId} {
      // Lecture : tous les utilisateurs authentifiés (temporaire)
      allow read: if request.auth != null;
      
      // Écriture : tous les utilisateurs authentifiés (temporaire)
      allow write: if request.auth != null;
    }
    
    // 👥 COLLECTION GROUPMEMBERSHIPS - RÈGLES DE BASE
    match /groupMemberships/{membershipId} {
      // Lecture/écriture : tous les utilisateurs authentifiés (temporaire)
      allow read, write: if request.auth != null;
    }
    
    // 📅 COLLECTION EVENTS - RÈGLES DE BASE
    match /events/{eventId} {
      // Lecture/écriture : tous les utilisateurs authentifiés (temporaire)
      allow read, write: if request.auth != null;
    }
    
    // 🗓️ COLLECTION AVAILABILITIES - RÈGLES DE BASE
    match /availabilities/{availabilityId} {
      // Lecture/écriture : tous les utilisateurs authentifiés (temporaire)
      allow read, write: if request.auth != null;
    }
    
    // 👥 COLLECTION FRIENDS - RÈGLES DE BASE
    match /friends/{friendId} {
      // Lecture/écriture : tous les utilisateurs authentifiés (temporaire)
      allow read, write: if request.auth != null;
    }
    
    // 📊 COLLECTION NOTIFICATIONS - RÈGLES DE BASE
    match /notifications/{notificationId} {
      // Lecture/écriture : tous les utilisateurs authentifiés (temporaire)
      allow read, write: if request.auth != null;
    }
    
    // 🚫 DÉNI PAR DÉFAUT pour les autres collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// 📝 INSTRUCTIONS :
// 1. Applique ces règles d'abord
// 2. Teste que l'app fonctionne complètement
// 3. Une fois confirmé, on passe à l'étape 2 (règles plus restrictives)

// ✅ ÉTAPE 1 : Règles permissives mais sécurisées
// - Authentification obligatoire
// - Toutes les collections identifiées
// - Accès large pour tester
// - Déni par défaut pour les autres collections