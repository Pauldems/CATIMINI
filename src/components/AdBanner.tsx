import React from 'react';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBannerPortrait' | 'smartBannerLandscape';
  style?: any;
}

// Composant vide - AdMob a été supprimé
export const AdBanner: React.FC<AdBannerProps> = () => {
  return null;
};