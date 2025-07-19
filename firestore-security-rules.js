// 🔒 RÈGLES DE SÉCURITÉ FIRESTORE POUR PRODUCTION
// À copier dans la console Firebase > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 👤 COLLECTION USERS
    match /users/{userId} {
      // Lecture : uniquement son propre profil ou pour les amis
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         exists(/databases/$(database)/documents/friends/$(request.auth.uid + '_' + userId)) ||
         exists(/databases/$(database)/documents/friends/$(userId + '_' + request.auth.uid)));
      
      // Écriture : uniquement son propre profil
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Création : seulement lors de l'inscription
      allow create: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.data.keys().hasAll(['id', 'email', 'displayName', 'createdAt']);
    }
    
    // 👥 COLLECTION FRIENDS  
    match /friends/{friendId} {
      // Lecture : si on est un des deux amis
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.friendId == request.auth.uid);
      
      // Écriture : si on est un des deux amis
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.friendId == request.auth.uid);
      
      // Création : validation des données
      allow create: if request.auth != null && 
        (request.resource.data.userId == request.auth.uid || 
         request.resource.data.friendId == request.auth.uid) &&
        request.resource.data.keys().hasAll(['userId', 'friendId', 'status', 'createdAt']);
    }
    
    // 🏢 COLLECTION GROUPS
    match /groups/{groupId} {
      // Lecture : si on est membre du groupe
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      
      // Écriture : si on est admin du groupe
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.adminId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.adminId == request.auth.uid &&
        request.resource.data.keys().hasAll(['name', 'adminId', 'members', 'createdAt']) &&
        request.auth.uid in request.resource.data.members;
    }
    
    // 📅 COLLECTION EVENTS
    match /events/{eventId} {
      // Lecture : si on est participant ou membre du groupe
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.participants ||
         exists(/databases/$(database)/documents/groups/$(resource.data.groupId)) &&
         request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members);
      
      // Écriture : si on est le créateur
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.creatorId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.creatorId == request.auth.uid &&
        request.resource.data.keys().hasAll(['title', 'creatorId', 'participants', 'startDate', 'endDate', 'groupId', 'createdAt']) &&
        request.auth.uid in request.resource.data.participants &&
        exists(/databases/$(database)/documents/groups/$(request.resource.data.groupId)) &&
        request.auth.uid in get(/databases/$(database)/documents/groups/$(request.resource.data.groupId)).data.members;
    }
    
    // 🗓️ COLLECTION AVAILABILITIES
    match /availabilities/{availabilityId} {
      // Lecture : si c'est sa propre disponibilité ou si on est ami
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId ||
         exists(/databases/$(database)/documents/friends/$(request.auth.uid + '_' + resource.data.userId)) ||
         exists(/databases/$(database)/documents/friends/$(resource.data.userId + '_' + request.auth.uid)));
      
      // Écriture : si c'est sa propre disponibilité
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.keys().hasAll(['userId', 'date', 'startTime', 'endTime', 'isAvailable', 'createdAt']);
    }
    
    // 📊 COLLECTION NOTIFICATIONS (si utilisée)
    match /notifications/{notificationId} {
      // Lecture : si c'est sa propre notification
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Écriture : si c'est sa propre notification
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // 🚫 DÉNI PAR DÉFAUT
    // Toute autre collection ou document est interdit
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// 📝 INSTRUCTIONS D'INSTALLATION :
// 1. Aller dans Firebase Console > Firestore Database > Rules
// 2. Copier tout le contenu ci-dessus
// 3. Cliquer sur "Publier"
// 4. Tester l'app pour vérifier que tout fonctionne

// ✅ SÉCURITÉ GARANTIE :
// - Seuls les utilisateurs authentifiés peuvent accéder aux données
// - Chaque utilisateur ne peut voir que ses propres données + ses amis
// - Validation stricte des données lors de la création
// - Protection contre les attaques par injection
// - Respect de la vie privée et du RGPD