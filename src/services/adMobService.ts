// Ce fichier est conservé vide pour éviter les erreurs d'import
// AdMob a été complètement supprimé du projet

class AdMobService {
  private static instance: AdMobService;

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize() {
    // Ne fait rien - AdMob supprimé
  }

  async showInterstitial() {
    // Ne fait rien - AdMob supprimé
  }

  async prepareInterstitial() {
    // Ne fait rien - AdMob supprimé
  }

  async showLaunchAd() {
    // Ne fait rien - AdMob supprimé
  }
}

export default AdMobService.getInstance();