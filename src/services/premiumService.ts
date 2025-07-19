import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_STORAGE_KEY = 'user_premium_status';
const FREE_AVAILABILITY_LIMIT = 10;
const FREE_GROUP_LIMIT = 1;

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

  async activatePremium(durationMonths: number = 1) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true,
        premiumSubscribedAt: now.toISOString(),
        premiumExpiresAt: expiresAt.toISOString(),
        updatedAt: now.toISOString()
      });

      this.premiumStatus = {
        isPremium: true,
        subscribedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(this.premiumStatus));
      
      console.log('✨ Premium activé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur activation premium:', error);
      throw error;
    }
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