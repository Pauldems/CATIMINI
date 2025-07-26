import * as RNIap from 'react-native-iap';
import { Platform, EmitterSubscription } from 'react-native';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Identifiants des produits
const PRODUCT_ID = 'com.creno.premium.monthly';
const itemSkus = Platform.select({
  ios: [PRODUCT_ID],
  android: [PRODUCT_ID] // Pour le futur
}) || [];

class StoreKitService {
  private static instance: StoreKitService;
  private isInitialized = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private products: RNIap.Subscription[] = [];

  static getInstance(): StoreKitService {
    if (!StoreKitService.instance) {
      StoreKitService.instance = new StoreKitService();
    }
    return StoreKitService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initialisation StoreKit...');
      
      // Vérifier si on est sur simulateur ou si les achats sont disponibles
      if (Platform.OS === 'ios') {
        const canMakePayments = await RNIap.canMakePayments();
        console.log('💳 Peut effectuer des paiements:', canMakePayments);
        
        if (!canMakePayments) {
          console.warn('⚠️ StoreKit: Achats intégrés non disponibles sur cet appareil');
          this.isInitialized = true;
          return;
        }
      }

      // Initialiser la connexion
      const connection = await RNIap.initConnection();
      if (!connection) {
        console.warn('StoreKit: Connexion non disponible');
        return;
      }

      // Charger les produits
      await this.loadProducts();

      // Configurer les listeners
      this.setupListeners();

      // Finaliser les transactions en attente
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid();

      this.isInitialized = true;
      console.log('✅ StoreKit initialisé avec succès');
    } catch (error: any) {
      console.error('❌ Erreur initialisation StoreKit:', error.message || error);
      // Ne pas bloquer l'app en cas d'erreur
      this.isInitialized = true;
    }
  }

  private setupListeners() {
    // Listener pour les mises à jour d'achat
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase) => {
        console.log('📦 Achat mis à jour:', purchase);
        
        // Vérifier la transaction
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            // Finaliser la transaction
            await RNIap.finishTransaction({
              purchase,
              isConsumable: false
            });
            
            // Sauvegarder le statut premium
            await this.savePremiumStatus(true);
            console.log('✅ Achat finalisé avec succès');
          } catch (error) {
            console.error('❌ Erreur finalisation achat:', error);
          }
        }
      }
    );

    // Listener pour les erreurs
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error) => {
        console.error('❌ Erreur achat:', error);
      }
    );
  }

  async loadProducts() {
    try {
      console.log('🔍 Chargement des produits:', itemSkus);
      this.products = await RNIap.getSubscriptions({ skus: itemSkus });
      console.log('📦 Produits chargés:', this.products.length);
      if (this.products.length > 0) {
        console.log('📦 Premier produit:', this.products[0].productId);
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement produits:', error.message || error);
    }
  }

  async purchasePremium(): Promise<boolean> {
    try {
      // Vérifier si on est sur simulateur
      const isSimulator = Platform.OS === 'ios' && Platform.constants?.Model?.includes('Simulator');
      if (isSimulator) {
        console.warn('⚠️ Achats non disponibles sur simulateur');
        throw new Error('Les achats intégrés ne sont pas disponibles sur simulateur');
      }

      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.products.length === 0) {
        throw new Error('Aucun produit disponible');
      }

      // Afficher les détails du produit
      const product = this.products.find(p => p.productId === PRODUCT_ID);
      console.log('💰 Produit sélectionné:', {
        productId: product?.productId,
        price: product?.localizedPrice,
        title: product?.title,
        description: product?.description
      });

      // Demander l'achat
      await RNIap.requestSubscription({
        sku: PRODUCT_ID,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      });
      
      return true;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        console.log('🚫 Achat annulé par l\'utilisateur');
      } else {
        console.error('❌ Erreur achat:', error.message || error);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      
      // Vérifier si l'abonnement est actif
      const hasActiveSub = purchases.some(purchase => 
        purchase.productId === PRODUCT_ID
      );
      
      await this.savePremiumStatus(hasActiveSub);
      
      if (hasActiveSub) {
        console.log('✅ Achats restaurés avec succès');
      }
      
      return hasActiveSub;
    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      return false;
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      
      // Vérifier si l'abonnement premium est actif
      const hasActiveSub = purchases.some(purchase => 
        purchase.productId === PRODUCT_ID
      );
      
      await this.savePremiumStatus(hasActiveSub);
      return hasActiveSub;
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      // Retourner le statut en cache si erreur
      const cached = await AsyncStorage.getItem('premium_status');
      return cached === 'true';
    }
  }

  private async savePremiumStatus(isPremium: boolean) {
    await AsyncStorage.setItem('premium_status', isPremium.toString());
    await AsyncStorage.setItem('premium_check_date', new Date().toISOString());
  }

  async getPrice(): Promise<string> {
    try {
      if (this.products.length === 0) {
        await this.loadProducts();
      }
      
      const product = this.products.find(p => p.productId === PRODUCT_ID);
      return product?.localizedPrice || '2,00 €';
    } catch (error) {
      return '2,00 €';
    }
  }

  async disconnect() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    
    try {
      await RNIap.endConnection();
      this.isInitialized = false;
      console.log('🔌 StoreKit déconnecté');
    } catch (error) {
      console.error('❌ Erreur déconnexion StoreKit:', error);
    }
  }
}

export default StoreKitService.getInstance();