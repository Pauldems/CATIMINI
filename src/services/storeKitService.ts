import * as RNIap from 'react-native-iap';
import { Platform, EmitterSubscription } from 'react-native';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionInfo {
  isActive: boolean;
  expiresAt?: string;
  productId?: string;
}

// Identifiants des produits
// Le product ID doit correspondre EXACTEMENT à celui dans App Store Connect
const PRODUCT_ID = 'com.creno.premium.monthly';
const itemSkus = Platform.select({
  ios: [PRODUCT_ID],
  android: [PRODUCT_ID] // Pour le futur
}) || [];

// Supprimé pour production

class StoreKitService {
  private static instance: StoreKitService;
  private isInitialized = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private products: RNIap.Subscription[] = [];
  private purchasePromiseResolve: ((value: boolean) => void) | null = null;
  private purchasePromiseReject: ((reason?: any) => void) | null = null;

  static getInstance(): StoreKitService {
    if (!StoreKitService.instance) {
      StoreKitService.instance = new StoreKitService();
    }
    return StoreKitService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialisation StoreKit
      
      // Vérifier si on est sur simulateur
      if (Platform.OS === 'ios') {
        const isSimulator = Platform.constants?.Model?.includes('Simulator');
        // Simulateur détecté
        
        try {
          // Certaines versions de react-native-iap n'ont pas canMakePayments
          if (typeof RNIap.canMakePayments === 'function') {
            const canMakePayments = await RNIap.canMakePayments();
            // Vérification des paiements
          }
        } catch (error) {
          // canMakePayments non supporté
        }
      }

      // Initialiser la connexion
      const connection = await RNIap.initConnection();
      
      if (!connection) {
        this.isInitialized = true;
        return;
      }

      // Charger les produits
      await this.loadProducts();

      // Configurer les listeners
      this.setupListeners();

      // Finaliser les transactions en attente (iOS uniquement)
      if (Platform.OS === 'ios') {
        try {
          await RNIap.clearTransactionIOS();
        } catch (error) {
          // Erreur nettoyage transactions
        }
      }

      this.isInitialized = true;
    } catch (error: any) {
      // Erreur initialisation
      this.isInitialized = true;
    }
  }

  private setupListeners() {
    // Listener pour les mises à jour d'achat
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase) => {
        
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
            // Pour un nouvel achat, calculer l'expiration (sandbox: 5 minutes)
            const now = new Date();
            const isSandbox = false; // PRODUCTION: mode production App Store
            const durationMs = isSandbox ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
            const expiresAt = new Date(now.getTime() + durationMs).toISOString();
            
            await this.savePremiumStatus(true, expiresAt);
            
            // Résoudre la promesse d'achat si elle existe
            if (this.purchasePromiseResolve) {
              this.purchasePromiseResolve(true);
              this.purchasePromiseResolve = null;
              this.purchasePromiseReject = null;
            }
          } catch (error) {
            if (this.purchasePromiseReject) {
              this.purchasePromiseReject(error);
              this.purchasePromiseResolve = null;
              this.purchasePromiseReject = null;
            }
          }
        }
      }
    );

    // Listener pour les erreurs
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error) => {
        if (this.purchasePromiseReject) {
          this.purchasePromiseReject(error);
          this.purchasePromiseResolve = null;
          this.purchasePromiseReject = null;
        }
      }
    );
  }

  async loadProducts() {
    try {
      // Essayer différentes méthodes de chargement
      try {
        // Méthode 1: getSubscriptions avec skus
        this.products = await RNIap.getSubscriptions({ skus: itemSkus });
      } catch (subError) {
        
        try {
          // Méthode 2: getSubscriptions sans paramètres
          const allSubscriptions = await RNIap.getSubscriptions();
          this.products = allSubscriptions.filter(p => itemSkus.includes(p.productId));
        } catch (allSubError) {
          // Méthode 3: getProducts
          try {
            this.products = await RNIap.getProducts({ skus: itemSkus });
          } catch (prodError) {
            
            // Méthode 4: getProducts sans paramètres
            try {
              const allProducts = await RNIap.getProducts();
              this.products = allProducts.filter(p => itemSkus.includes(p.productId));
            } catch (allProdError) {
              this.products = [];
            }
          }
        }
      }
      
      // Vérification silencieuse
    } catch (error: any) {
      // Erreur chargement produits
    }
  }

  async purchasePremium(): Promise<boolean> {
    try {
      
      // Vérifier si on est sur simulateur
      const isSimulator = Platform.OS === 'ios' && Platform.constants?.Model?.includes('Simulator');
      if (isSimulator) {
        console.warn('⚠️ Achats non disponibles sur simulateur');
        throw new Error('Les achats intégrés ne sont pas disponibles sur simulateur. Utilisez un appareil physique.');
      }
      
      // Vérification du compte sandbox

      if (!this.isInitialized) {
        await this.initialize();
      }

      // Vérifier l'état de la connexion
      try {
        const testProducts = await RNIap.getProducts({ skus: itemSkus });
      } catch (error: any) {
        if (error.message?.includes('E_IAP_NOT_AVAILABLE')) {
          throw new Error('Les achats intégrés ne sont pas disponibles. Vérifiez votre connexion App Store.');
        }
        throw error;
      }

      // Vérifier les produits chargés
      if (this.products.length === 0) {
        await this.loadProducts();
        
        if (this.products.length === 0) {
          throw new Error('Aucun produit disponible. Vérifiez votre connexion internet et App Store Connect.');
        }
      }

      // Vérifier le produit
      const product = this.products.find(p => p.productId === PRODUCT_ID);
      if (!product) {
        throw new Error(`Produit ${PRODUCT_ID} non trouvé`);
      }

      // Créer une promesse qui sera résolue par le listener
      const purchasePromise = new Promise<boolean>((resolve, reject) => {
        this.purchasePromiseResolve = resolve;
        this.purchasePromiseReject = reject;
        
        // Timeout de sécurité
        setTimeout(() => {
          if (this.purchasePromiseResolve) {
            reject(new Error('Timeout - Aucune réponse d\'Apple. Vérifiez votre connexion internet.'));
            this.purchasePromiseResolve = null;
            this.purchasePromiseReject = null;
          }
        }, 60000); // 60 secondes
      });
      
      // Vérifier s'il y a des transactions en attente
      try {
        const availablePurchases = await RNIap.getAvailablePurchases();
        if (availablePurchases.length > 0) {
          await this.clearPendingTransactions();
        }
      } catch (error) {
        // Ignorer l'erreur
      }

      // Demander l'achat
      console.log('🚀 Lancement de requestSubscription...');
      console.log('📱 Configuration:', {
        sku: PRODUCT_ID,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      });
      console.log('📱 Produit à acheter:', {
        productId: product.productId,
        price: product.localizedPrice,
        title: product.title,
        description: product.description
      });
      
      // Lancer l'achat
      
      try {
        // Essayer avec await pour capturer les erreurs synchrones
        const immediateResult = await RNIap.requestSubscription({
          sku: PRODUCT_ID,
          andDangerouslyFinishTransactionAutomaticallyIOS: false
        });
        
        // Si on arrive ici, c'est que la requête a été lancée
        // Le vrai résultat arrivera via les listeners
      } catch (error: any) {
        if (this.purchasePromiseReject) {
          this.purchasePromiseReject(error);
          this.purchasePromiseResolve = null;
          this.purchasePromiseReject = null;
        }
        
        // Re-throw pour que la promesse principale capture l'erreur
        throw error;
      }
      
      // Attendre le résultat via le listener
      const success = await purchasePromise;
      
      return success;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        console.log('🚫 Achat annulé par l\'utilisateur');
        throw new Error('Achat annulé');
      } else if (error.message?.includes('helper application')) {
        console.error('❌ Erreur StoreKit Helper:', error);
        throw new Error('Erreur de connexion avec l\'App Store. Réessayez dans quelques instants.');
      } else if (error.message?.includes('Timeout')) {
        throw error;
      } else {
        console.error('❌ Erreur achat:', error.message || error);
        throw new Error(error.message || 'Erreur lors de l\'achat');
      }
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      console.log('🔄 Restauration des achats...');
      const purchases = await RNIap.getAvailablePurchases();
      console.log('📦 Achats trouvés:', purchases.length);
      
      // Vérifier si l'abonnement est actif
      const hasActiveSub = purchases.some(purchase => 
        purchase.productId === PRODUCT_ID
      );
      
      await this.savePremiumStatus(hasActiveSub);
      
      if (hasActiveSub) {
        console.log('✅ Achats restaurés avec succès');
      } else {
        console.log('❌ Aucun achat actif trouvé');
      }
      
      return hasActiveSub;
    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      return false;
    }
  }

  async clearPendingTransactions(): Promise<void> {
    try {
      console.log('🧹 Nettoyage des transactions en attente...');
      
      if (Platform.OS === 'ios') {
        // Nettoyer toutes les transactions en attente
        try {
          await RNIap.clearTransactionIOS();
          console.log('✅ Transactions iOS nettoyées');
        } catch (error) {
          console.log('⚠️ Erreur clearTransactionIOS:', error);
        }
        
        // Finaliser toutes les transactions non finalisées
        try {
          const purchases = await RNIap.getAvailablePurchases();
          console.log(`📦 ${purchases.length} transactions à finaliser`);
          
          for (const purchase of purchases) {
            try {
              console.log(`🔄 Finalisation de: ${purchase.productId}`);
              await RNIap.finishTransaction({ purchase, isConsumable: false });
              console.log('✅ Transaction finalisée:', purchase.productId);
            } catch (error) {
              console.log('⚠️ Impossible de finaliser:', purchase.productId, error);
            }
          }
          
          // Essayer aussi de finaliser avec acknowledgePurchaseAndroid pour être sûr
          if (purchases.length > 0) {
            console.log('🔄 Nettoyage supplémentaire...');
            await RNIap.clearProductsIOS();
            console.log('✅ Produits iOS nettoyés');
          }
        } catch (error) {
          console.log('⚠️ Erreur getAvailablePurchases:', error);
        }
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage transactions:', error);
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const info = await this.getSubscriptionInfo();
      return info.isActive;
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      // Retourner le statut en cache si erreur
      const cached = await AsyncStorage.getItem('premium_status');
      return cached === 'true';
    }
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    try {
      // Récupérer tous les achats disponibles
      const purchases = await RNIap.getAvailablePurchases();
      console.log('📦 Achats disponibles:', purchases.length);
      
      // Chercher l'abonnement premium
      const premiumPurchase = purchases.find(purchase => 
        purchase.productId === PRODUCT_ID
      );
      
      if (!premiumPurchase) {
        console.log('❌ Aucun abonnement premium trouvé');
        await this.savePremiumStatus(false);
        return { isActive: false };
      }
      
      // Vérifier si l'abonnement est toujours actif
      // Pour iOS, vérifier la date d'expiration
      if (Platform.OS === 'ios' && premiumPurchase.transactionDate) {
        // Calculer la date d'expiration (pour sandbox: +5 minutes)
        const purchaseDate = new Date(parseInt(premiumPurchase.transactionDate));
        const now = new Date();
        
        // PRODUCTION: Toujours utiliser le mode production
        const isSandbox = false;
        
        // En sandbox, les abonnements mensuels durent 5 minutes
        const durationMs = isSandbox ? 5 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000; // 5 min ou 30 jours
        const expirationDate = new Date(purchaseDate.getTime() + durationMs);
        
        console.log('📅 Date d\'achat:', purchaseDate.toISOString());
        console.log('📅 Date d\'expiration estimée:', expirationDate.toISOString());
        console.log('🎨 Mode sandbox:', isSandbox);
        
        const isActive = expirationDate > now;
        
        await this.savePremiumStatus(isActive);
        
        return {
          isActive,
          expiresAt: expirationDate.toISOString(),
          productId: premiumPurchase.productId
        };
      }
      
      // Fallback: considérer actif si présent
      await this.savePremiumStatus(true);
      return {
        isActive: true,
        productId: premiumPurchase.productId
      };
      
    } catch (error) {
      console.error('❌ Erreur récupération info abonnement:', error);
      return { isActive: false };
    }
  }

  private async savePremiumStatus(isPremium: boolean, expiresAt?: string) {
    await AsyncStorage.setItem('premium_status', isPremium.toString());
    await AsyncStorage.setItem('premium_check_date', new Date().toISOString());
    if (expiresAt) {
      await AsyncStorage.setItem('premium_expires_at', expiresAt);
    } else {
      await AsyncStorage.removeItem('premium_expires_at');
    }
  }

  async getPrice(): Promise<string> {
    try {
      console.log('💰 Récupération du prix...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (this.products.length === 0) {
        console.log('🔄 Chargement des produits pour obtenir le prix...');
        await this.loadProducts();
      }
      
      const product = this.products.find(p => p.productId === PRODUCT_ID);
      console.log('💰 Produit trouvé:', {
        productId: product?.productId,
        price: product?.localizedPrice,
        currency: product?.currency
      });
      
      // Retourner le vrai prix si trouvé, sinon prix par défaut
      return product?.localizedPrice || '0,99 €';
    } catch (error) {
      console.error('❌ Erreur récupération prix:', error);
      return '0,99 €'; // Prix par défaut basé sur App Store Connect
    }
  }

  async testStoreKitConnection(): Promise<{ status: string; details: any }> {
    try {
      console.log('🧪 Test de connexion StoreKit...');
      
      const result: any = {
        platform: Platform.OS,
        model: Platform.constants?.Model,
        initialized: this.isInitialized,
        productsLoaded: this.products.length,
        products: [],
        allProducts: [],
        canMakePayments: null,
        connection: false,
        availablePurchases: 0,
        bundleId: 'com.catimini.app',
        expectedProductId: PRODUCT_ID
      };
      
      // Test 1: Can make payments
      try {
        if (typeof RNIap.canMakePayments === 'function') {
          result.canMakePayments = await RNIap.canMakePayments();
        }
      } catch (error) {
        result.canMakePaymentsError = error.message;
      }
      
      // Test 2: Connection
      try {
        const connection = await RNIap.initConnection();
        result.connection = connection;
      } catch (error) {
        result.connectionError = error.message;
      }
      
      // Test 3: Load specific products
      try {
        const products = await RNIap.getSubscriptions({ skus: itemSkus });
        result.products = products.map(p => ({
          id: p.productId,
          price: p.localizedPrice,
          title: p.title
        }));
      } catch (error) {
        result.productsError = error.message;
      }
      
      // Test 3b: Load ALL products
      try {
        console.log('🔍 Tentative de récupération de TOUS les produits...');
        const allSubs = await RNIap.getSubscriptions();
        result.allSubscriptions = allSubs.map(p => ({
          id: p.productId,
          price: p.localizedPrice,
          title: p.title || 'Sans titre'
        }));
        console.log('📦 Tous les abonnements trouvés:', allSubs);
      } catch (error) {
        result.allSubscriptionsError = error.message;
      }
      
      // Test 4: Available purchases
      try {
        const purchases = await RNIap.getAvailablePurchases();
        result.availablePurchases = purchases.length;
        if (purchases.length > 0) {
          result.purchaseDetails = purchases.map(p => ({
            productId: p.productId,
            transactionDate: p.transactionDate
          }));
        }
      } catch (error) {
        result.purchasesError = error.message;
      }
      
      const status = result.connection && result.products.length > 0 ? 'OK' : 'ERROR';
      return { status, details: result };
    } catch (error) {
      return { status: 'ERROR', details: { error: error.message } };
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