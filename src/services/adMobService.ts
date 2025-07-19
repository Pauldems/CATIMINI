// Imports conditionnels pour éviter les erreurs Expo Go
let AdMobModule: any = null;
try {
  if (!__DEV__) {
    AdMobModule = require('expo-ads-admob');
  }
} catch (error) {
  console.log('AdMob non disponible');
}
import { Platform } from 'react-native';
import premiumService from './premiumService';

// IDs AdMob - iOS en production, Android en test
export const AD_UNIT_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-6698381010934241/3318200340', // Votre vrai ID
    android: 'ca-app-pub-3940256099942544/6300978111', // Test
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-6698381010934241/6236007724', // Votre vrai ID "Start"
    android: 'ca-app-pub-3940256099942544/1033173712', // Test
  }),
};

class AdMobService {
  private static instance: AdMobService;
  private isInitialized = false;
  private lastAdShown = 0;
  private minTimeBetweenAds = 30000; // 30 secondes minimum entre les pubs

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Vérifier si on est dans Expo Go (AdMob pas supporté)
      if (__DEV__) {
        console.log('⚠️ AdMob désactivé en mode développement (Expo Go)');
        this.isInitialized = true;
        return;
      }

      // Demander les permissions
      if (AdMobModule) {
        await AdMobModule.requestPermissionsAsync();
      }

      // Préparer la première pub interstitielle
      this.prepareInterstitial();

      console.log('📱 AdMob initialisé avec succès');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erreur initialisation AdMob:', error);
      this.isInitialized = true; // Marquer comme initialisé pour éviter les répétitions
    }
  }

  async showInterstitial() {
    // Ne pas afficher de pub pour les utilisateurs premium
    if (premiumService.isPremium()) {
      console.log('✨ Pub ignorée (utilisateur premium)');
      return;
    }

    // Désactivé en développement (Expo Go)
    if (__DEV__) {
      console.log('📱 Pub interstitielle simulée (mode dev)');
      return;
    }

    // Vérifier si assez de temps s'est écoulé depuis la dernière pub
    const now = Date.now();
    if (now - this.lastAdShown < this.minTimeBetweenAds) {
      console.log('📱 Pub interstitielle ignorée (trop récente)');
      return;
    }

    try {
      if (AdMobModule) {
        await AdMobModule.AdMobInterstitial.setAdUnitID(AD_UNIT_IDS.interstitial!);
        await AdMobModule.AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true });
        await AdMobModule.AdMobInterstitial.showAdAsync();
      }
      
      this.lastAdShown = now;
      
      // Préparer la prochaine pub après avoir montré celle-ci
      setTimeout(() => {
        this.prepareInterstitial();
      }, 2000);
      
      console.log('📱 Pub interstitielle affichée');
    } catch (error) {
      console.error('❌ Erreur interstitial:', error);
    }
  }

  // Préparer l'interstitial à l'avance
  async prepareInterstitial() {
    // Désactivé en développement
    if (__DEV__) {
      return;
    }

    try {
      if (AdMobModule) {
        await AdMobModule.AdMobInterstitial.setAdUnitID(AD_UNIT_IDS.interstitial!);
        await AdMobModule.AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true });
        console.log('📱 Pub interstitielle préparée');
      }
    } catch (error) {
      console.error('❌ Erreur préparation interstitial:', error);
    }
  }

  // Afficher une pub au lancement de l'app
  async showLaunchAd() {
    // Attendre un peu que l'utilisateur voie l'app
    setTimeout(() => {
      this.showInterstitial();
    }, 3000); // 3 secondes après l'ouverture
  }
}

export default AdMobService.getInstance();