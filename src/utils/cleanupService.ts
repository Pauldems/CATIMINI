import { collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Service de nettoyage automatique des données obsolètes
 */
export class CleanupService {
  
  /**
   * Supprime les indisponibilités dont la date est passée
   * @param daysToKeep Nombre de jours à conserver après la date (par défaut 0 = suppression immédiate)
   */
  static async cleanupOldAvailabilities(daysToKeep: number = 0): Promise<void> {
    try {
      console.log('🧹 [CleanupService] Début du nettoyage des indisponibilités...');
      
      // Calculer la date limite (aujourd'hui - daysToKeep)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      
      if (daysToKeep === 0) {
        console.log(`🧹 [CleanupService] Suppression des indisponibilités antérieures à aujourd'hui (${cutoffDateStr})`);
      } else {
        console.log(`🧹 [CleanupService] Suppression des indisponibilités antérieures au ${cutoffDateStr}`);
      }
      
      // Requête pour trouver les indisponibilités obsolètes
      const availabilitiesRef = collection(db, 'availabilities');
      const oldAvailabilitiesQuery = query(
        availabilitiesRef,
        where('date', '<', cutoffDateStr),
        where('isAvailable', '==', false) // Ne supprimer que les indisponibilités
      );
      
      const snapshot = await getDocs(oldAvailabilitiesQuery);
      
      if (snapshot.empty) {
        console.log('🧹 [CleanupService] Aucune indisponibilité obsolète trouvée');
        return;
      }
      
      console.log(`🧹 [CleanupService] ${snapshot.docs.length} indisponibilités obsolètes trouvées`);
      
      // Utiliser batch pour supprimer efficacement
      const batch = writeBatch(db);
      let batchCount = 0;
      const batchSize = 500; // Limite Firestore
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        console.log(`🧹 [CleanupService] Suppression: ${data.date} ${data.startTime}-${data.endTime} (userId: ${data.userId})`);
        
        batch.delete(doc.ref);
        batchCount++;
        
        // Exécuter le batch si on atteint la limite
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`🧹 [CleanupService] Batch de ${batchCount} suppressions exécuté`);
          batchCount = 0;
        }
      }
      
      // Exécuter le dernier batch s'il reste des éléments
      if (batchCount > 0) {
        await batch.commit();
        console.log(`🧹 [CleanupService] Dernier batch de ${batchCount} suppressions exécuté`);
      }
      
      console.log(`✅ [CleanupService] Nettoyage terminé: ${snapshot.docs.length} indisponibilités supprimées`);
      
    } catch (error) {
      console.error('❌ [CleanupService] Erreur lors du nettoyage:', error);
      throw error;
    }
  }
  
  /**
   * Supprime les événements terminés depuis plus de X jours
   * @param daysToKeep Nombre de jours à conserver après la fin de l'événement
   */
  static async cleanupOldEvents(daysToKeep: number = 30): Promise<void> {
    try {
      console.log('🧹 [CleanupService] Début du nettoyage des événements terminés...');
      
      // Calculer la date limite
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      
      console.log(`🧹 [CleanupService] Suppression des événements terminés avant le ${cutoffDateStr}`);
      
      // Requête pour trouver les événements terminés
      const eventsRef = collection(db, 'events');
      const oldEventsQuery = query(
        eventsRef,
        where('endDate', '<', cutoffDateStr)
      );
      
      const snapshot = await getDocs(oldEventsQuery);
      
      if (snapshot.empty) {
        console.log('🧹 [CleanupService] Aucun événement obsolète trouvé');
        return;
      }
      
      console.log(`🧹 [CleanupService] ${snapshot.docs.length} événements obsolètes trouvés`);
      
      // Supprimer les événements et leurs indisponibilités liées
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const doc of snapshot.docs) {
        const eventData = doc.data();
        console.log(`🧹 [CleanupService] Suppression événement: ${eventData.title} (fin: ${eventData.endDate})`);
        
        // Supprimer l'événement
        batch.delete(doc.ref);
        batchCount++;
        
        // Supprimer les indisponibilités créées par cet événement
        const eventAvailabilitiesQuery = query(
          collection(db, 'availabilities'),
          where('createdByEvent', '==', doc.id)
        );
        
        const eventAvailsSnapshot = await getDocs(eventAvailabilitiesQuery);
        eventAvailsSnapshot.docs.forEach(availDoc => {
          batch.delete(availDoc.ref);
          batchCount++;
        });
        
        // Exécuter le batch si nécessaire
        if (batchCount >= 450) { // Laisser de la marge
          await batch.commit();
          console.log(`🧹 [CleanupService] Batch de ${batchCount} suppressions exécuté`);
          batchCount = 0;
        }
      }
      
      // Exécuter le dernier batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`🧹 [CleanupService] Dernier batch de ${batchCount} suppressions exécuté`);
      }
      
      console.log(`✅ [CleanupService] Nettoyage terminé: ${snapshot.docs.length} événements supprimés`);
      
    } catch (error) {
      console.error('❌ [CleanupService] Erreur lors du nettoyage des événements:', error);
      throw error;
    }
  }
  
  /**
   * Effectue un nettoyage complet (indisponibilités + événements)
   */
  static async performFullCleanup(): Promise<void> {
    try {
      console.log('🧹 [CleanupService] Début du nettoyage complet...');
      
      // Nettoyer les indisponibilités (suppression immédiate dès que la date est passée)
      await this.cleanupOldAvailabilities(0);
      
      // Nettoyer les événements terminés (conserver 30 jours)
      await this.cleanupOldEvents(30);
      
      console.log('✅ [CleanupService] Nettoyage complet terminé');
      
    } catch (error) {
      console.error('❌ [CleanupService] Erreur lors du nettoyage complet:', error);
      throw error;
    }
  }
}