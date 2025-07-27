const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Fonction de nettoyage automatique qui s'exécute tous les jours à 2h du matin
exports.scheduledCleanup = functions.pubsub
  .schedule('0 2 * * *') // Cron: tous les jours à 2h00
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    console.log('🧹 Début du nettoyage automatique des données passées');
    
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let totalDeleted = 0;
    
    try {
      // 1. Nettoyer les indisponibilités passées
      console.log(`📅 Suppression des indispos avant le: ${yesterdayStr}`);
      
      const availabilitiesSnapshot = await db.collection('availabilities')
        .where('date', '<=', yesterdayStr)
        .get();
      
      const deletePromises = [];
      
      availabilitiesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🗑️ Suppression indispo du ${data.date} pour ${data.userId}`);
        deletePromises.push(doc.ref.delete());
        totalDeleted++;
      });
      
      // 2. Nettoyer les événements passés de plus de 30 jours (optionnel)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const eventsSnapshot = await db.collection('events')
        .where('date', '<=', thirtyDaysAgoStr)
        .get();
      
      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🗑️ Suppression événement ancien du ${data.date}`);
        deletePromises.push(doc.ref.delete());
        totalDeleted++;
      });
      
      // Exécuter toutes les suppressions
      await Promise.all(deletePromises);
      
      console.log(`✅ Nettoyage terminé: ${totalDeleted} documents supprimés`);
      
      // Optionnel: Enregistrer le dernier nettoyage
      await db.collection('system').doc('cleanup').set({
        lastRun: admin.firestore.FieldValue.serverTimestamp(),
        documentsDeleted: totalDeleted
      }, { merge: true });
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      throw error;
    }
  });

// Fonction de nettoyage manuel (peut être déclenchée depuis l'app admin)
exports.manualCleanup = functions.https.onCall(async (data, context) => {
  // Vérifier les permissions (optionnel)
  // if (!context.auth || !context.auth.token.admin) {
  //   throw new functions.https.HttpsError('permission-denied', 'Seuls les admins peuvent déclencher le nettoyage');
  // }
  
  console.log('🧹 Nettoyage manuel déclenché');
  
  // Appeler la même logique que le nettoyage programmé
  await exports.scheduledCleanup.run();
  
  return { success: true, message: 'Nettoyage effectué' };
});