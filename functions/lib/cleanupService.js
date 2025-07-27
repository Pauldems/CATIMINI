"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCleanup = exports.scheduledCleanup = void 0;
const functions = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Fonction de nettoyage automatique qui s'exécute tous les jours à 00:01
 * Supprime les indisponibilités et événements des jours précédents
 */
exports.scheduledCleanup = functions
    .region('europe-west1')
    .pubsub.schedule('1 0 * * *') // Cron: tous les jours à 00:01
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
    console.log('🧹 Début du nettoyage automatique des données passées');
    // On veut supprimer les indispos d'hier et avant
    // Si on est le 26 à 00:01, on supprime tout jusqu'au 25 inclus
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    console.log(`🕐 Nettoyage lancé le ${today.toISOString()}`);
    console.log(`📅 Suppression des indispos jusqu'au ${yesterdayStr} inclus`);
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
        // 3. Nettoyer les notifications lues de plus de 7 jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const notificationsSnapshot = await db.collection('notifications')
            .where('read', '==', true)
            .where('createdAt', '<=', sevenDaysAgo)
            .get();
        notificationsSnapshot.forEach((doc) => {
            console.log(`🗑️ Suppression notification ancienne`);
            deletePromises.push(doc.ref.delete());
            totalDeleted++;
        });
        // Exécuter toutes les suppressions
        await Promise.all(deletePromises);
        console.log(`✅ Nettoyage terminé: ${totalDeleted} documents supprimés`);
        // Enregistrer le dernier nettoyage
        await db.collection('system').doc('cleanup').set({
            lastRun: firestore_1.FieldValue.serverTimestamp(),
            documentsDeleted: totalDeleted,
            deletedAvailabilities: availabilitiesSnapshot.size,
            deletedEvents: eventsSnapshot.size,
            deletedNotifications: notificationsSnapshot.size
        }, { merge: true });
        return null;
    }
    catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    }
});
/**
 * Fonction de nettoyage manuel (peut être déclenchée depuis l'app admin)
 */
exports.manualCleanup = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
    console.log('🧹 Nettoyage manuel déclenché');
    // Optionnel: Vérifier les permissions admin
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'Authentification requise');
    // }
    try {
        // Exécuter la même logique de nettoyage
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        let totalDeleted = 0;
        // Nettoyer les indisponibilités passées
        const availabilitiesSnapshot = await db.collection('availabilities')
            .where('date', '<=', yesterdayStr)
            .get();
        const deletePromises = [];
        availabilitiesSnapshot.forEach((doc) => {
            deletePromises.push(doc.ref.delete());
            totalDeleted++;
        });
        await Promise.all(deletePromises);
        return {
            success: true,
            message: `Nettoyage effectué avec succès. ${totalDeleted} documents supprimés.`
        };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=cleanupService.js.map