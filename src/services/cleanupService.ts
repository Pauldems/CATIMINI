import { collection, query, where, getDocs, deleteDoc, doc, Timestamp, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class CleanupService {
  private static instance: CleanupService;
  private lastCleanup: Date | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  // Démarrer le nettoyage automatique
  startAutoCleanup() {
    // Nettoyer immédiatement au démarrage
    this.cleanupOldUnavailabilities();
    
    // Puis toutes les heures
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldUnavailabilities();
    }, 60 * 60 * 1000); // 1 heure
  }

  // Arrêter le nettoyage automatique
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Nettoyer les indisponibilités passées
  async cleanupOldUnavailabilities() {
    try {
      console.log('🧹 Début du nettoyage des indisponibilités passées...');
      
      // Date d'hier (pour être sûr de ne pas supprimer celle d'aujourd'hui)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log(`🗓️ Suppression des indispos avant le: ${yesterdayStr}`);
      
      // Requête pour trouver les indispos passées
      const availabilitiesRef = collection(db, 'availabilities');
      const snapshot = await getDocs(availabilitiesRef);
      
      let deletedCount = 0;
      let skippedCount = 0;
      const updatePromises: Promise<void>[] = [];
      
      console.log(`📊 Total de documents dans availabilities: ${snapshot.size}`);
      
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) {
        console.log('⚠️ Pas d\'utilisateur connecté, annulation du nettoyage');
        return;
      }
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const indispoDate = data.date;
        const docUserId = data.userId;
        const isAvailable = data.isAvailable;
        const createdByEvent = data.createdByEvent;
        
        // Structure réelle: { userId: "xxx", isAvailable: false, date: "2025-07-20", createdByEvent: "eventId", ... }
        // Vérifier si c'est une indispo de l'utilisateur actuel
        if (docUserId === currentUserId && isAvailable === false) {
          console.log(`🔍 Indispo trouvée: date=${indispoDate}, createdByEvent=${createdByEvent || 'none'}`);
          
          // Vérifier si la date est passée
          if (indispoDate && indispoDate <= yesterdayStr) {
            // Supprimer le document entier car il appartient à un seul utilisateur
            console.log(`🗑️ Suppression indispo du ${indispoDate}${createdByEvent ? ' (créée par événement)' : ''}`);
            
            updatePromises.push(
              deleteDoc(doc(db, 'availabilities', docSnapshot.id))
            );
            deletedCount++;
          }
        }
      });
      
      await Promise.all(updatePromises);
      
      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} indisponibilités passées supprimées`);
      } else {
        console.log('✅ Aucune indisponibilité passée à supprimer');
      }
      
      if (skippedCount > 0) {
        console.log(`ℹ️ ${skippedCount} indispos d'événements conservées`);
      }
      
      this.lastCleanup = new Date();
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des indisponibilités:', error);
    }
  }

  // Nettoyer les événements passés (optionnel, à activer si besoin)
  async cleanupOldEvents() {
    try {
      console.log('🧹 Début du nettoyage des événements passés...');
      
      // Date d'il y a 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('date', '<=', thirtyDaysAgo.toISOString().split('T')[0])
      );
      
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, 'events', docSnapshot.id)));
        deletedCount++;
      });
      
      await Promise.all(deletePromises);
      
      console.log(`✅ ${deletedCount} événements anciens supprimés`);
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des événements:', error);
    }
  }

  // Obtenir la date du dernier nettoyage
  getLastCleanupDate(): Date | null {
    return this.lastCleanup;
  }
}

export default CleanupService.getInstance();