import { InteractionManager } from 'react-native';
import { debounce } from 'lodash';

/**
 * Optimisations de performance pour React Native
 * Basé sur les pratiques de Meta/Facebook
 */

// Cache pour les données Firebase
class DataCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      this.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const dataCache = new DataCache();

/**
 * Exécute une fonction après que les animations soient terminées
 * Utilisé pour les opérations lourdes qui ne doivent pas bloquer l'UI
 */
export const runAfterInteractions = (callback: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

/**
 * Batch les mises à jour d'état pour éviter les re-renders multiples
 */
export const batchedUpdates = (updates: (() => void)[]) => {
  // React Native batch automatiquement dans les event handlers
  // mais pas dans les callbacks async
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

/**
 * Crée un debounced listener pour Firebase
 * Évite les mises à jour trop fréquentes
 */
export const createDebouncedListener = <T>(
  callback: (data: T) => void,
  delay: number = 300
) => {
  return debounce(callback, delay, {
    leading: false,
    trailing: true,
    maxWait: 1000 // Force l'exécution après 1 seconde max
  });
};

/**
 * Compare superficiellement deux objets
 * Plus rapide que JSON.stringify pour la comparaison
 */
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
};

/**
 * Compare profondément les dates marquées pour éviter les re-renders
 */
export const areMarkedDatesEqual = (dates1: any, dates2: any): boolean => {
  if (dates1 === dates2) return true;
  if (!dates1 || !dates2) return false;
  
  const keys1 = Object.keys(dates1);
  const keys2 = Object.keys(dates2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    const date1 = dates1[key];
    const date2 = dates2[key];
    
    if (!date2) return false;
    
    // Comparer les propriétés importantes
    if (date1.marked !== date2.marked) return false;
    if (date1.dotColor !== date2.dotColor) return false;
    if (date1.selected !== date2.selected) return false;
    
    // Comparer les styles custom si présents
    if (date1.customStyles || date2.customStyles) {
      if (!shallowEqual(date1.customStyles, date2.customStyles)) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Optimise le calcul des marqueurs de calendrier
 * Utilise le cache et évite les recalculs inutiles
 */
export const optimizeMarkedDates = (
  availabilities: any[],
  events: any[],
  cacheKey: string
): any => {
  // Vérifier le cache
  const cached = dataCache.get(cacheKey);
  if (cached) return cached;
  
  const marked: any = {};
  
  // Traiter les indisponibilités
  availabilities.forEach(avail => {
    if (!avail.isAvailable) {
      marked[avail.date] = {
        marked: true,
        dotColor: '#1A3B5C',
        customStyles: {
          container: {
            backgroundColor: '#1A3B5C',
            borderRadius: 25,
            width: 35,
            height: 35,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: 14
          }
        }
      };
    }
  });
  
  // Traiter les événements
  events.forEach(event => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      if (marked[dateStr]) {
        // Combiner avec l'indisponibilité existante
        marked[dateStr] = {
          ...marked[dateStr],
          dots: [
            { color: '#FFB800', selectedDotColor: '#FFB800' },
            { color: '#1A3B5C', selectedDotColor: '#1A3B5C' }
          ],
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: '#FFB800',
              borderRadius: 25,
              backgroundColor: '#1A3B5C',
              width: 35,
              height: 35,
            },
            text: {
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 14
            }
          }
        };
      } else {
        // Événement seul
        marked[dateStr] = {
          marked: true,
          dotColor: '#FFB800',
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: '#FFB800',
              borderRadius: 25,
              width: 35,
              height: 35,
            },
            text: {
              color: '#FFB800',
              fontWeight: '600',
              fontSize: 14
            }
          }
        };
      }
    }
  });
  
  // Mettre en cache
  dataCache.set(cacheKey, marked);
  
  return marked;
};

/**
 * Hook pour détecter si un composant est monté
 * Évite les mises à jour d'état sur les composants démontés
 */
export const useIsMounted = () => {
  const isMounted = React.useRef(true);
  
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return isMounted;
};

// Importation React nécessaire pour le hook
import React from 'react';