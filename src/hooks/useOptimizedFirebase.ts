import { useEffect, useRef, useCallback, useState } from 'react';
import { onSnapshot, Query, QuerySnapshot } from 'firebase/firestore';
import { debounce } from 'lodash';
import { InteractionManager } from 'react-native';
import { dataCache } from '../utils/performanceOptimizer';

interface UseOptimizedFirebaseOptions {
  cacheKey?: string;
  debounceMs?: number;
  cacheTTL?: number;
}

/**
 * Hook optimisé pour les listeners Firebase
 * Utilise le cache, le debouncing et InteractionManager
 */
export function useOptimizedFirebase<T>(
  query: Query | null,
  processData: (snapshot: QuerySnapshot) => T,
  dependencies: any[] = [],
  options: UseOptimizedFirebaseOptions = {}
) {
  const { cacheKey, debounceMs = 300, cacheTTL = 5 * 60 * 1000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Créer une version debounced du processeur
  const debouncedProcessor = useCallback(
    debounce((snapshot: QuerySnapshot) => {
      if (!isMountedRef.current) return;

      InteractionManager.runAfterInteractions(() => {
        if (!isMountedRef.current) return;

        try {
          const processedData = processData(snapshot);
          
          // Mettre en cache si une clé est fournie
          if (cacheKey) {
            dataCache.set(cacheKey, processedData);
          }
          
          setData(processedData);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Erreur traitement données:', err);
          setError(err as Error);
          setLoading(false);
        }
      });
    }, debounceMs),
    [processData, cacheKey, debounceMs]
  );

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    // Charger depuis le cache si disponible
    if (cacheKey) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    }

    // Établir le listener
    const setupListener = async () => {
      try {
        unsubscribeRef.current = onSnapshot(
          query,
          (snapshot) => {
            debouncedProcessor(snapshot);
          },
          (err) => {
            console.error('Erreur listener Firebase:', err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Erreur setup listener:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupListener();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      debouncedProcessor.cancel();
    };
  }, [query, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      debouncedProcessor.cancel();
    };
  }, []);

  const refresh = useCallback(() => {
    if (cacheKey) {
      dataCache.invalidate(cacheKey);
    }
    setLoading(true);
    // Le listener se rechargera automatiquement
  }, [cacheKey]);

  return { data, loading, error, refresh };
}

/**
 * Hook pour combiner plusieurs sources de données Firebase
 */
export function useCombinedFirebaseData<T1, T2, R>(
  query1: Query | null,
  query2: Query | null,
  combiner: (data1: T1 | null, data2: T2 | null) => R,
  processor1: (snapshot: QuerySnapshot) => T1,
  processor2: (snapshot: QuerySnapshot) => T2,
  dependencies: any[] = []
) {
  const { data: data1, loading: loading1 } = useOptimizedFirebase(
    query1,
    processor1,
    dependencies,
    { debounceMs: 200 }
  );

  const { data: data2, loading: loading2 } = useOptimizedFirebase(
    query2,
    processor2,
    dependencies,
    { debounceMs: 200 }
  );

  const [combinedData, setCombinedData] = useState<R | null>(null);
  const lastCombinedRef = useRef<R | null>(null);

  useEffect(() => {
    if (!loading1 && !loading2) {
      InteractionManager.runAfterInteractions(() => {
        const combined = combiner(data1, data2);
        
        // Éviter les mises à jour inutiles
        if (JSON.stringify(combined) !== JSON.stringify(lastCombinedRef.current)) {
          lastCombinedRef.current = combined;
          setCombinedData(combined);
        }
      });
    }
  }, [data1, data2, loading1, loading2, combiner]);

  return {
    data: combinedData,
    loading: loading1 || loading2,
  };
}