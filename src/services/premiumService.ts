import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storeKitService from './storeKitService';
import { AppState, AppStateStatus } from 'react-native';

const PREMIUM_STORAGE_KEY = 'user_premium_status';
// Limites pour les utilisateurs gratuits
const FREE_AVAILABILITY_LIMIT = 10;
const FREE_GROUP_LIMIT = 1;
const FREE_EVENT_CREATION_LIMIT = 3;

interface PremiumStatus {
  isPremium: boolean;
  subscribedAt?: string;
  expiresAt?: string;
  lastChecked?: string;
}

class PremiumService {
  private static instance: PremiumService;
  private premiumStatus: PremiumStatus = { isPremium: false };
  private appStateSubscription: any;
  private checkInterval: NodeJS.Timeout | null = null;

  static getInstance(): PremiumService {
    if (!PremiumService.instance) {
      PremiumService.instance = new PremiumService();
    }
    return PremiumService.instance;
  }

  async initialize() {
    try {
      // Charger le statut depuis le cache local
      const cachedStatus = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      if (cachedStatus && cachedStatus !== 'undefined') {
        try {
          const parsed = JSON.parse(cachedStatus);
          if (parsed && typeof parsed === 'object') {
            this.premiumStatus = parsed;
            
            // Vérifier si le cache est expiré (plus de 5 minutes)
            if (parsed.lastChecked) {
              const lastCheck = new Date(parsed.lastChecked);
              const now = new Date();
              const diffMinutes = (now.getTime() - lastCheck.getTime()) / (1000 * 60);
              
              if (diffMinutes > 5) {
                console.log('Cache premium expiré, vérification nécessaire');
                this.premiumStatus.isPremium = false; // Par défaut false jusqu'à vérification
              }
            }
          }
        } catch (parseError) {
          console.warn('Erreur parsing cache premium:', parseError);
          await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
        }
      }

      // Vérifier le statut en ligne
      await this.checkPremiumStatus();
      
      // Configurer la vérification périodique (toutes les 30 minutes en production)
      this.setupPeriodicCheck();
      
      // Écouter les changements d'état de l'app
      this.setupAppStateListener();
    } catch (error) {
      console.error('Erreur initialisation premium:', error);
      this.premiumStatus = { isPremium: false };
    }
  }

  async checkPremiumStatus(): Promise<boolean> {
    try {
      console.log('🔍 Vérification du statut premium...');
      
      // Vérifier d'abord avec StoreKit
      try {
        const subscriptionInfo = await storeKitService.getSubscriptionInfo();
        
        if (subscriptionInfo.isActive) {
          // L'abonnement est actif
          this.premiumStatus = { 
            isPremium: true,
            expiresAt: subscriptionInfo.expiresAt,
            lastChecked: new Date().toISOString()
          };
          
          // Mettre à jour Firebase avec la date d'expiration
          await this.updatePremiumInFirebase(true, subscriptionInfo.expiresAt);
          
          // Sauvegarder dans le cache
          await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
          
          console.log('✅ Premium actif jusqu\'au:', subscriptionInfo.expiresAt);
          return true;
        } else {
          // L'abonnement a expiré
          console.log('❌ Abonnement expiré');
          this.premiumStatus = { 
            isPremium: false,
            lastChecked: new Date().toISOString()
          };
          await this.removePremiumStatus();
          return false;
        }
      } catch (storeKitError) {
        console.warn('StoreKit non disponible, vérification Firebase uniquement:', storeKitError);
        // Fallback sur Firebase si StoreKit n'est pas disponible
        return await this.checkFirebasePremiumStatus();
      }
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      return this.premiumStatus.isPremium || false;
    }
  }

  private async checkFirebasePremiumStatus(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        this.premiumStatus = { isPremium: false };
        return false;
      }
      
      const userData = userDoc.data();
      if (!userData) {
        this.premiumStatus = { isPremium: false };
        return false;
      }

      if (userData.isPremium === true) {
        // Vérifier l'expiration
        if (userData.premiumExpiresAt) {
          const expirationDate = new Date(userData.premiumExpiresAt);
          const now = new Date();
          
          if (expirationDate > now) {
            this.premiumStatus = {
              isPremium: true,
              subscribedAt: userData.premiumSubscribedAt,
              expiresAt: userData.premiumExpiresAt
            };
          } else {
            // Premium expiré
            this.premiumStatus = { isPremium: false };
            await this.removePremiumStatus();
          }
        } else {
          // Premium à vie ou sans expiration
          this.premiumStatus = {
            isPremium: true,
            subscribedAt: userData.premiumSubscribedAt
          };
        }
      } else {
        this.premiumStatus = { isPremium: false };
      }

      // Sauvegarder dans le cache avec timestamp
      const statusWithTimestamp = {
        ...this.premiumStatus,
        lastChecked: new Date().toISOString()
      };
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(statusWithTimestamp));
      
      return this.premiumStatus.isPremium;
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      return false;
    }
  }

  isPremium(): boolean {
    return this.premiumStatus.isPremium;
  }

  getAvailabilityLimit(): number {
    return this.isPremium() ? Infinity : FREE_AVAILABILITY_LIMIT;
  }

  getGroupLimit(): number {
    return this.isPremium() ? Infinity : FREE_GROUP_LIMIT;
  }

  async activatePremium(): Promise<boolean> {
    try {
      console.log('🚀 Activation premium - Début');
      
      // Utiliser StoreKit pour l'achat
      const success = await storeKitService.purchasePremium();
      console.log('💳 Résultat achat StoreKit:', success);
      
      if (success) {
        // Mettre à jour immédiatement le statut local
        this.premiumStatus = { 
          isPremium: true,
          subscribedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString()
        };
        
        // Sauvegarder dans le cache
        await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
        
        // Mettre à jour Firebase
        const user = auth.currentUser;
        if (user) {
          console.log('📝 Mise à jour Firebase pour user:', user.uid);
          await updateDoc(doc(db, 'users', user.uid), {
            isPremium: true,
            premiumSubscribedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        // Forcer une vérification pour obtenir la date d'expiration
        setTimeout(() => {
          this.checkPremiumStatus();
        }, 2000);
        
        console.log('✨ Premium activé avec succès');
      }
      
      return success;
    } catch (error: any) {
      console.error('❌ Erreur activation premium:', error);
      console.error('Message erreur:', error.message);
      console.error('Code erreur:', error.code);
      throw error;
    }
  }
  
  async restorePurchases(): Promise<boolean> {
    try {
      const restored = await storeKitService.restorePurchases();
      if (restored) {
        await this.checkPremiumStatus();
      }
      return restored;
    } catch (error) {
      console.error('Erreur restauration achats:', error);
      return false;
    }
  }
  
  async getSubscriptionPrice(): Promise<string> {
    return await storeKitService.getPrice();
  }

  async removePremiumStatus() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: false,
        updatedAt: new Date().toISOString()
      });

      this.premiumStatus = { isPremium: false };
      await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
    } catch (error) {
      console.error('Erreur suppression premium:', error);
    }
  }

  getRemainingDays(): number {
    if (!this.premiumStatus.isPremium || !this.premiumStatus.expiresAt) {
      return 0;
    }

    const now = new Date();
    const expiresAt = new Date(this.premiumStatus.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  getRemainingTime(): string {
    if (!this.premiumStatus.isPremium || !this.premiumStatus.expiresAt) {
      return '';
    }

    const now = new Date();
    const expiresAt = new Date(this.premiumStatus.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    
    if (diffTime <= 0) {
      return 'Expiré';
    }
    
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  private async updatePremiumInFirebase(isPremium: boolean, expiresAt?: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const updateData: any = {
        isPremium: isPremium,
        updatedAt: new Date().toISOString()
      };

      if (isPremium) {
        updateData.premiumSubscribedAt = new Date().toISOString();
        if (expiresAt) {
          updateData.premiumExpiresAt = expiresAt;
        }
      } else {
        updateData.premiumSubscribedAt = null;
        updateData.premiumExpiresAt = null;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);

      this.premiumStatus = { 
        isPremium,
        expiresAt,
        lastChecked: new Date().toISOString()
      };
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
    } catch (error) {
      console.error('Erreur mise à jour premium Firebase:', error);
    }
  }

  private setupPeriodicCheck() {
    // Nettoyer l'intervalle existant
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Vérifier toutes les 30 minutes en production
    this.checkInterval = setInterval(async () => {
      console.log('⏰ Vérification périodique du statut premium');
      await this.checkPremiumStatus();
    }, 30 * 60 * 1000); // 30 minutes
  }

  private setupAppStateListener() {
    // Vérifier le statut quand l'app revient au premier plan
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App revenue active, vérification du statut premium');
        this.checkPremiumStatus();
      }
    });
  }

  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  async forceSyncPremiumStatus(): Promise<boolean> {
    try {
      console.log('🔄 Synchronisation forcée du statut premium...');
      
      // Nettoyer le cache local
      await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
      await AsyncStorage.removeItem('premium_status');
      await AsyncStorage.removeItem('premium_expires_at');
      this.premiumStatus = { isPremium: false };
      
      // Forcer une nouvelle vérification complète
      const status = await this.checkPremiumStatus();
      
      console.log('✅ Synchronisation terminée, statut:', status);
      return status;
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      return false;
    }
  }
}

export default PremiumService.getInstance();