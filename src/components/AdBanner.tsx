import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import premiumService from '../services/premiumService';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBannerPortrait' | 'smartBannerLandscape';
  style?: any;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  size = 'smartBannerPortrait',
  style 
}) => {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Vérifier le statut premium
    setIsPremium(premiumService.isPremium());
  }, []);

  // Ne pas afficher de bannière pour les utilisateurs premium
  if (isPremium) {
    return null;
  }

  // En développement, afficher un placeholder
  if (__DEV__) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <Text style={styles.placeholderText}>📱 Pub (masquée en dev)</Text>
      </View>
    );
  }

  // En production, utiliser AdMob (nécessite EAS Build)
  try {
    const AdMobModule = require('expo-ads-admob');
    const { AD_UNIT_IDS } = require('../services/adMobService');
    
    return (
      <View style={[styles.container, style]}>
        <AdMobModule.AdMobBanner
          bannerSize={size}
          adUnitID={AD_UNIT_IDS.banner!}
          servePersonalizedAds={true}
          onDidFailToReceiveAdWithError={(error) => {
            console.log('❌ Erreur banner AdMob:', error);
          }}
          onAdViewDidReceiveAd={() => {
            console.log('✅ Banner AdMob chargée');
          }}
        />
      </View>
    );
  } catch (error) {
    console.log('AdMob non disponible:', error);
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 10,
  },
  placeholder: {
    height: 50,
    backgroundColor: '#E8F4F8',
    borderColor: '#FFB800',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});