import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CleanupService } from '../utils/cleanupService';

/**
 * Hook pour déclencher le nettoyage automatique des données obsolètes
 */
export const useCleanup = () => {
  
  useEffect(() => {
    // Fonction pour effectuer le nettoyage
    const performCleanup = async () => {
      try {
        // Vérifier si on doit faire le nettoyage (une fois par jour max)
        const lastCleanup = await AsyncStorage.getItem('lastCleanup');
        const today = new Date().toISOString().split('T')[0];
        
        if (lastCleanup === today) {
          console.log('🧹 [useCleanup] Nettoyage déjà effectué aujourd\'hui');
          return;
        }
        
        console.log('🧹 [useCleanup] Démarrage du nettoyage automatique...');
        
        // Effectuer le nettoyage
        await CleanupService.performFullCleanup();
        
        // Marquer comme effectué aujourd'hui
        await AsyncStorage.setItem('lastCleanup', today);
        
        console.log('✅ [useCleanup] Nettoyage automatique terminé');
        
      } catch (error) {
        console.error('❌ [useCleanup] Erreur lors du nettoyage automatique:', error);
      }
    };
    
    // Déclencher le nettoyage après un délai pour ne pas impacter le démarrage
    const timeoutId = setTimeout(performCleanup, 10000); // 10 secondes après le montage
    
    // Cleanup
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Fonction pour forcer le nettoyage manuellement
  const forceCleanup = async () => {
    try {
      console.log('🧹 [useCleanup] Nettoyage manuel déclenché...');
      await CleanupService.performFullCleanup();
      await AsyncStorage.setItem('lastCleanup', new Date().toISOString().split('T')[0]);
      console.log('✅ [useCleanup] Nettoyage manuel terminé');
    } catch (error) {
      console.error('❌ [useCleanup] Erreur lors du nettoyage manuel:', error);
      throw error;
    }
  };
  
  return { forceCleanup };
};