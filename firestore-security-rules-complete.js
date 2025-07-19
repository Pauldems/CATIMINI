// 🔒 RÈGLES DE SÉCURITÉ FIRESTORE COMPLÈTES POUR CATIMINI APP
// Basées sur l'analyse complète du projet
// À copier dans Firebase Console > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 🔐 FONCTION D'AIDE : Vérifier si un utilisateur est membre d'un groupe
    function isGroupMember(userId, groupId) {
      return exists(/databases/$(database)/documents/groupMemberships/$(userId + '_' + groupId)) ||
             exists(/databases/$(database)/documents/groupMemberships/$(groupId + '_' + userId));
    }
    
    // 🔐 FONCTION D'AIDE : Vérifier si un utilisateur est admin d'un groupe
    function isGroupAdmin(userId, groupId) {
      return exists(/databases/$(database)/documents/groups/$(groupId)) &&
             get(/databases/$(database)/documents/groups/$(groupId)).data.creatorId == userId;
    }
    
    // 👤 COLLECTION USERS
    match /users/{userId} {
      // Lecture : son propre profil ou les membres de ses groupes
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         // Vérifier via les groupMemberships si on partage un groupe
         exists(/databases/$(database)/documents/groupMemberships/$(request.auth.uid + '_' + resource.data.currentGroupId)) ||
         exists(/databases/$(database)/documents/groupMemberships/$(resource.data.currentGroupId + '_' + request.auth.uid)));
      
      // Écriture : uniquement son propre profil
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Création : lors de l'inscription uniquement
      allow create: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.data.keys().hasAll(['id', 'email', 'displayName', 'createdAt']) &&
        request.resource.data.id == userId;
    }
    
    // 🏢 COLLECTION GROUPS
    match /groups/{groupId} {
      // Lecture : si on est membre du groupe
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.members ||
         isGroupMember(request.auth.uid, groupId));
      
      // Écriture : si on est créateur/admin du groupe
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.creatorId ||
         isGroupAdmin(request.auth.uid, groupId));
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.creatorId == request.auth.uid &&
        request.resource.data.keys().hasAll(['name', 'creatorId', 'members', 'inviteCode', 'createdAt']) &&
        request.auth.uid in request.resource.data.members;
    }
    
    // 👥 COLLECTION GROUPMEMBERSHIPS
    match /groupMemberships/{membershipId} {
      // Lecture : si on est concerné par cette adhésion ou membre du groupe
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         isGroupMember(request.auth.uid, resource.data.groupId));
      
      // Écriture : si on est l'utilisateur concerné ou admin du groupe
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         isGroupAdmin(request.auth.uid, resource.data.groupId));
      
      // Création : validation des données
      allow create: if request.auth != null && 
        (request.resource.data.userId == request.auth.uid ||
         isGroupAdmin(request.auth.uid, request.resource.data.groupId)) &&
        request.resource.data.keys().hasAll(['userId', 'groupId', 'role', 'joinedAt']);
    }
    
    // 📅 COLLECTION EVENTS
    match /events/{eventId} {
      // Lecture : si on est membre du groupe ou participant
      allow read: if request.auth != null && 
        (isGroupMember(request.auth.uid, resource.data.groupId) ||
         request.auth.uid in resource.data.participants ||
         request.auth.uid in resource.data.confirmedParticipants);
      
      // Écriture : si on est le créateur
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.creatorId;
      
      // Création : validation des données et membre du groupe
      allow create: if request.auth != null && 
        request.resource.data.creatorId == request.auth.uid &&
        request.resource.data.keys().hasAll(['title', 'creatorId', 'participants', 'startDate', 'endDate', 'groupId', 'createdAt']) &&
        isGroupMember(request.auth.uid, request.resource.data.groupId) &&
        request.auth.uid in request.resource.data.participants;
    }
    
    // 🗓️ COLLECTION AVAILABILITIES
    match /availabilities/{availabilityId} {
      // Lecture : si c'est sa propre disponibilité ou membre du même groupe
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId ||
         (resource.data.groupId != null && isGroupMember(request.auth.uid, resource.data.groupId)));
      
      // Écriture : si c'est sa propre disponibilité
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.keys().hasAll(['userId', 'date', 'startTime', 'endTime', 'isAvailable', 'createdAt']) &&
        // Validation du format de date YYYY-MM-DD
        request.resource.data.date.matches('\\d{4}-\\d{2}-\\d{2}') &&
        // Validation du format d'heure HH:MM
        request.resource.data.startTime.matches('\\d{2}:\\d{2}') &&
        request.resource.data.endTime.matches('\\d{2}:\\d{2}');
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
        request.resource.data.keys().hasAll(['userId', 'friendId', 'status', 'createdAt']) &&
        // Empêcher l'auto-amitié
        request.resource.data.userId != request.resource.data.friendId;
    }
    
    // 📊 COLLECTION NOTIFICATIONS
    match /notifications/{notificationId} {
      // Lecture : si c'est sa propre notification
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Écriture : si c'est sa propre notification
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      
      // Création : validation des données
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.keys().hasAll(['userId', 'type', 'title', 'message', 'read', 'createdAt']);
    }
    
    // 🔧 RÈGLES SPÉCIALES POUR LE NETTOYAGE AUTOMATIQUE
    // Permettre la suppression des données obsolètes par le système
    match /availabilities/{availabilityId} {
      // Permettre la suppression des indisponibilités passées
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId ||
         // Autoriser le nettoyage automatique des dates passées
         resource.data.date < timestamp.date(request.time).format('%Y-%m-%d'));
    }
    
    match /events/{eventId} {
      // Permettre la suppression des événements terminés anciens
      allow delete: if request.auth != null && 
        (request.auth.uid == resource.data.creatorId ||
         // Autoriser le nettoyage automatique des événements anciens
         resource.data.endDate < timestamp.date(request.time.sub(duration.value(30, 'd'))).format('%Y-%m-%d'));
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
// 4. Tester l'app progressivement

// ✅ COLLECTIONS COUVERTES :
// - users (données personnelles)
// - groups (groupes d'utilisateurs)
// - groupMemberships (adhésions aux groupes)
// - events (événements)
// - availabilities (disponibilités)
// - friends (relations d'amitié)
// - notifications (notifications personnelles)

// 🔒 SÉCURITÉ GARANTIE :
// - Authentification obligatoire
// - Contrôle d'accès basé sur les groupes
// - Validation des formats de données
// - Protection contre les opérations malveillantes
// - Autorisation du nettoyage automatique
// - Prévention de l'auto-amitié
// - Validation des dates et heures