import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storeKitService from './storeKitService';

const PREMIUM_STORAGE_KEY = 'user_premium_status';
// Limites pour les utilisateurs gratuits
const FREE_AVAILABILITY_LIMIT = 10;
const FREE_GROUP_LIMIT = 1;
const FREE_EVENT_CREATION_LIMIT = 3;

interface PremiumStatus {
  isPremium: boolean;
  subscribedAt?: string;
  expiresAt?: string;
}

class PremiumService {
  private static instance: PremiumService;
  private premiumStatus: PremiumStatus = { isPremium: false };

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
          }
        } catch (parseError) {
          console.warn('Erreur parsing cache premium:', parseError);
          await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
        }
      }

      // Vérifier le statut en ligne
      await this.checkPremiumStatus();
    } catch (error) {
      console.error('Erreur initialisation premium:', error);
      this.premiumStatus = { isPremium: false };
    }
  }

  async checkPremiumStatus(): Promise<boolean> {
    try {
      // Vérifier d'abord avec StoreKit
      try {
        const isPremiumStoreKit = await storeKitService.checkSubscriptionStatus();
        if (isPremiumStoreKit) {
          this.premiumStatus = { isPremium: true };
          await this.savePremiumStatus(true);
          return true;
        }
      } catch (storeKitError) {
        console.warn('StoreKit non disponible, vérification Firebase uniquement');
      }
      
      // Sinon vérifier dans Firebase
      return await this.checkFirebasePremiumStatus();
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

      // Sauvegarder dans le cache
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
      
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
      // Utiliser StoreKit pour l'achat
      const success = await storeKitService.purchasePremium();
      
      if (success) {
        // Mettre à jour Firebase
        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            isPremium: true,
            premiumSubscribedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        this.premiumStatus = { isPremium: true };
        await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
        console.log('✨ Premium activé avec succès');
      }
      
      return success;
    } catch (error) {
      console.error('Erreur activation premium:', error);
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
}

export default PremiumService.getInstance();