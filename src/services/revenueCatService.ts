import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  PurchasesPackage,
  LogLevel 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration RevenueCat
const REVENUECAT_API_KEY_IOS = 'appl_LlOvNJVdnzcPGDRFzxffLRzdywa';
const REVENUECAT_API_KEY_ANDROID = 'votre_cle_api_android'; // À remplacer si Android

// Identifiants des produits
const PRODUCT_ID = 'creno_premium_monthly'; // À créer dans App Store Connect

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private currentOffering: PurchasesOffering | null = null;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configurer RevenueCat
      Purchases.setLogLevel(LogLevel.DEBUG);
      
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      await Purchases.configure({ apiKey });

      // Identifier l'utilisateur si connecté
      const user = auth.currentUser;
      if (user) {
        await Purchases.logIn(user.uid);
      }

      // Charger les offres
      await this.loadOfferings();

      this.isInitialized = true;
      console.log('✅ RevenueCat initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation RevenueCat:', error);
    }
  }

  async loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        this.currentOffering = offerings.current;
        console.log('📦 Offre disponible:', this.currentOffering.identifier);
      }
    } catch (error) {
      console.error('❌ Erreur chargement des offres:', error);
    }
  }

  async purchasePremium(): Promise<boolean> {
    try {
      if (!this.currentOffering) {
        await this.loadOfferings();
      }

      const monthlyPackage = this.currentOffering?.monthly;
      if (!monthlyPackage) {
        throw new Error('Aucune offre mensuelle disponible');
      }

      // Effectuer l'achat
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      
      // Vérifier le statut premium
      const isPremium = this.checkPremiumStatus(customerInfo);
      
      // Sauvegarder en cache
      await this.savePremiumStatus(isPremium);
      
      return isPremium;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('❌ Erreur achat:', error);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = this.checkPremiumStatus(customerInfo);
      await this.savePremiumStatus(isPremium);
      return isPremium;
    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      return false;
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = this.checkPremiumStatus(customerInfo);
      await this.savePremiumStatus(isPremium);
      return isPremium;
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      // Retourner le statut en cache si erreur
      const cached = await AsyncStorage.getItem('premium_status');
      return cached === 'true';
    }
  }

  private checkPremiumStatus(customerInfo: CustomerInfo): boolean {
    // Vérifier si l'utilisateur a un abonnement actif
    return typeof customerInfo.entitlements.active['premium'] !== 'undefined';
  }

  private async savePremiumStatus(isPremium: boolean) {
    await AsyncStorage.setItem('premium_status', isPremium.toString());
    await AsyncStorage.setItem('premium_check_date', new Date().toISOString());
  }

  async getPrice(): Promise<string> {
    try {
      await this.loadOfferings();
      const monthlyPackage = this.currentOffering?.monthly;
      return monthlyPackage?.product.priceString || '2,00 €';
    } catch (error) {
      return '2,00 €';
    }
  }

  async cancelSubscription(): Promise<void> {
    // Sur iOS, l'utilisateur doit aller dans les réglages
    // RevenueCat ne peut pas annuler directement
    console.log('🔗 Redirection vers les réglages d\'abonnement Apple');
  }
}

export default RevenueCatService.getInstance();