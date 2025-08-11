/**
 * Configuration des optimisations de performance
 * Basé sur les meilleures pratiques de Meta et autres géants tech
 */

export const PERFORMANCE_CONFIG = {
  // Debouncing pour les listeners Firebase
  firebase: {
    debounceMs: 200, // Délai avant traitement des updates
    maxWaitMs: 1000, // Délai max avant forçage du traitement
    batchSize: 50, // Nombre max d'items à traiter en une fois
  },

  // Cache configuration
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100, // Nombre max d'entrées en cache
    strategies: {
      availabilities: 'stale-while-revalidate',
      events: 'stale-while-revalidate',
      users: 'cache-first',
      groups: 'cache-first',
    }
  },

  // Animation et UI
  ui: {
    // Utiliser native driver pour les animations
    useNativeDriver: true,
    // Désactiver les animations sur les appareils low-end
    enableAnimations: true,
    // Délai avant affichage des loaders
    loaderDelay: 100,
  },

  // Optimisations de rendu
  rendering: {
    // Nombre max de re-renders avant warning
    maxRerenders: 3,
    // Utiliser React.memo par défaut
    memoByDefault: true,
    // Batch les updates d'état
    batchStateUpdates: true,
  },

  // Liste et scroll optimisations
  lists: {
    // Nombre d'items à rendre initialement
    initialNumToRender: 10,
    // Nombre d'items à rendre par batch
    maxToRenderPerBatch: 5,
    // Distance de pré-chargement
    windowSize: 10,
    // Supprimer les vues hors écran
    removeClippedSubviews: true,
    // Optimiser les mesures
    getItemLayout: true,
  },

  // Calendrier optimisations
  calendar: {
    // Pré-charger les mois adjacents
    preloadAdjacentMonths: true,
    // Cache les dates marquées
    cacheMarkedDates: true,
    // Délai de debounce pour la sélection
    selectionDebounce: 50,
    // Animation de transition
    animateTransitions: true,
  }
};

/**
 * Détecte si l'appareil est low-end
 * Désactive certaines fonctionnalités pour améliorer les perfs
 */
export const isLowEndDevice = (): boolean => {
  // À implémenter selon les besoins
  // Par exemple, vérifier la RAM, le nombre de cores CPU, etc.
  return false;
};

/**
 * Applique les optimisations selon le type d'appareil
 */
export const getOptimizedConfig = () => {
  if (isLowEndDevice()) {
    return {
      ...PERFORMANCE_CONFIG,
      ui: {
        ...PERFORMANCE_CONFIG.ui,
        enableAnimations: false,
      },
      calendar: {
        ...PERFORMANCE_CONFIG.calendar,
        animateTransitions: false,
        preloadAdjacentMonths: false,
      }
    };
  }
  return PERFORMANCE_CONFIG;
};