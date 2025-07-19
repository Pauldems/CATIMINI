const admin = require('firebase-admin');

// Initialiser Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // Vous devrez télécharger ce fichier depuis Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateExistingUsers() {
  try {
    console.log('🔄 Début de la mise à jour des utilisateurs existants...');
    
    // Récupérer tous les utilisateurs
    const usersSnapshot = await db.collection('users').get();
    
    let updateCount = 0;
    const batch = db.batch();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Si emailVerified n'existe pas ou est false
      if (!userData.emailVerified || userData.emailVerified === false) {
        console.log(`📝 Mise à jour de l'utilisateur: ${userData.email}`);
        
        // Mettre à jour le document
        batch.update(doc.ref, {
          emailVerified: true,
          updatedAt: new Date()
        });
        
        updateCount++;
      }
    });
    
    // Exécuter la mise à jour batch
    await batch.commit();
    
    console.log(`✅ Mise à jour terminée ! ${updateCount} utilisateurs mis à jour.`);
    console.log(`📊 Total utilisateurs: ${usersSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    // Terminer le processus
    process.exit();
  }
}

// Exécuter la fonction
updateExistingUsers();