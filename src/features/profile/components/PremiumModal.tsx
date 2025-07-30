import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import premiumService from '../../../services/premiumService';
import { useNavigation } from '@react-navigation/native';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  visible,
  onClose,
  isPremium: isPremiumProp,
  onUpgrade
}) => {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('0,99 €');
  const [isPremium, setIsPremium] = useState(isPremiumProp);
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Vérifier le statut premium et charger le prix à chaque ouverture
    if (visible) {
      const checkStatus = async () => {
        const status = await premiumService.checkPremiumStatus();
        setIsPremium(status);
      };
      checkStatus();
      
      // Recharger le prix à chaque ouverture
      const loadPrice = async () => {
        const priceString = await premiumService.getSubscriptionPrice();
        setPrice(priceString);
      };
      loadPrice();
    }
  }, [visible]);

  const handleUpgrade = async () => {
    // Vérifier d'abord si on est déjà premium
    const currentStatus = await premiumService.checkPremiumStatus();
    if (currentStatus) {
      Alert.alert(
        'Vous êtes déjà Premium !',
        'Votre abonnement Premium est actif.',
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }
    
    setLoading(true);
    try {
      const success = await premiumService.activatePremium();
      if (success) {
        // Forcer une vérification immédiate du statut
        await premiumService.forceSyncPremiumStatus();
        
        // Mettre à jour l'état local
        setIsPremium(true);
        
        Alert.alert(
          '🎉 Félicitations !',
          'Vous êtes maintenant Premium. Profitez de toutes les fonctionnalités illimitées !',
          [{ text: 'Super !', onPress: async () => {
            // Attendre un peu pour que tout se synchronise
            setTimeout(async () => {
              await premiumService.checkPremiumStatus();
              onUpgrade();
            }, 500);
            onClose();
          }}]
        );
      }
    } catch (error: any) {
      console.error('Erreur dans handleUpgrade:', error);
      
      // Vérifier si c'est une erreur "déjà abonné" ou "invalid product"
      if (error.message && (error.message.includes('already') || error.message.toLowerCase().includes('invalid product'))) {
        // Vérifier le statut réel
        const currentStatus = await premiumService.forceSyncPremiumStatus();
        if (currentStatus) {
          setIsPremium(true);
          Alert.alert(
            '✅ Vous êtes déjà Premium !',
            'Votre abonnement est actif. Profitez de toutes les fonctionnalités illimitées !',
            [{ text: 'OK', onPress: () => {
              onUpgrade();
              onClose();
            }}]
          );
        } else {
          Alert.alert(
            'Erreur',
            'Un problème est survenu. Essayez de restaurer vos achats.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Restaurer', onPress: handleRestore }
            ]
          );
        }
      } else if (error.message === 'Achat annulé') {
        // L'utilisateur a annulé, pas besoin d'afficher une alerte
        console.log('Achat annulé par l\'utilisateur');
      } else if (error.message?.includes('App Store')) {
        Alert.alert(
          'Problème de connexion',
          error.message,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réessayer', onPress: () => setTimeout(handleUpgrade, 1000) }
          ]
        );
      } else if (error.message?.includes('Timeout')) {
        Alert.alert(
          'Délai dépassé',
          'La connexion à l\'App Store prend trop de temps. Vérifiez votre connexion internet et réessayez.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réessayer', onPress: () => setTimeout(handleUpgrade, 1000) }
          ]
        );
      } else {
        Alert.alert(
          'Erreur',
          error.message || 'Une erreur est survenue lors de l\'achat. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleRestore = async () => {
    setLoading(true);
    try {
      const restored = await premiumService.restorePurchases();
      if (restored) {
        Alert.alert(
          '✅ Restauration réussie',
          'Vos achats ont été restaurés avec succès.',
          [{ text: 'OK', onPress: () => {
            onUpgrade();
            onClose();
          }}]
        );
      } else {
        Alert.alert(
          'Aucun achat trouvé',
          'Aucun achat antérieur n\'a été trouvé pour ce compte.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la restauration. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: 'infinite',
      title: 'Indisponibilités illimitées',
      description: 'Ajoutez autant d\'indisponibilités que vous voulez'
    },
    {
      icon: 'people',
      title: 'Groupes illimités',
      description: 'Créez et rejoignez autant de groupes que vous voulez'
    },
    {
      icon: 'heart',
      title: 'Soutenir Créno',
      description: 'Aidez-nous à améliorer l\'app'
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
              
              <View style={styles.starContainer}>
                <Ionicons name="star" size={30} color="#FFD700" />
              </View>
              
              <Text style={styles.title}>
                {isPremium ? 'Créno Premium' : 'Passez à Premium'}
              </Text>
              
              {isPremium ? (
                <View style={styles.premiumStatusContainer}>
                  <Text style={styles.premiumStatusText}>
                    ✨ Vous êtes Premium !
                  </Text>
                  {premiumService.getRemainingTime() && !premiumService.getRemainingTime().includes('minute') && (
                    <Text style={styles.premiumStatusSubtext}>
                      {premiumService.getRemainingTime()} restant{premiumService.getRemainingTime().includes('jour') ? 's' : ''}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.subtitle}>
                  Déverrouillez tout le potentiel de Créno
                </Text>
              )}
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons 
                      name={feature.icon as any} 
                      size={24} 
                      color="#1A3B5C" 
                    />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Comparison - Moved before pricing */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>Comparaison des plans</Text>
              
              <View style={styles.comparisonTable}>
                <View style={[styles.comparisonRow, styles.comparisonHeader]}>
                  <Text style={styles.comparisonFeature}></Text>
                  <Text style={styles.comparisonHeaderText}>Gratuit</Text>
                  <Text style={[styles.comparisonHeaderText, styles.comparisonHeaderPremium]}>Premium</Text>
                </View>
                
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonFeature}>Indisponibilités</Text>
                  <Text style={styles.comparisonFree}>10 max</Text>
                  <Text style={styles.comparisonPremium}>Illimitées ✨</Text>
                </View>
                
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonFeature}>Groupes</Text>
                  <Text style={styles.comparisonFree}>1 max</Text>
                  <Text style={styles.comparisonPremium}>Illimités ✨</Text>
                </View>
                
                
              </View>
            </View>

            {!isPremium && (
              <>
                {/* Pricing */}
                <View style={styles.pricingContainer}>
                  <View style={styles.priceCard}>
                    <Text style={styles.priceAmount}>{price.split(' ')[0]}</Text>
                    <Text style={styles.pricePeriod}>par mois</Text>
                  </View>
                  <Text style={styles.pricingNote}>
                    Annulable à tout moment • Pas d'engagement
                  </Text>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={[styles.upgradeButton, loading && styles.upgradeButtonDisabled]}
                  onPress={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="rocket" size={20} color="white" />
                      <Text style={styles.upgradeButtonText}>
                        Devenir Premium
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                
                {/* Restore Button */}
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestore}
                  disabled={loading}
                >
                  <Text style={styles.restoreButtonText}>
                    Restaurer mes achats
                  </Text>
                </TouchableOpacity>
                
                {/* Liens légaux */}
                <View style={styles.legalLinks}>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      navigation.navigate('TermsOfUse');
                    }}
                    style={styles.legalLinkButton}
                  >
                    <Text style={styles.legalLinkText}>Conditions d'utilisation</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.legalSeparator}>•</Text>
                  
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      navigation.navigate('PrivacyPolicy');
                    }}
                    style={styles.legalLinkButton}
                  >
                    <Text style={styles.legalLinkText}>Politique de confidentialité</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    padding: 12,
    paddingTop: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
  },
  starContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF8E1',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumStatusContainer: {
    alignItems: 'center',
  },
  premiumStatusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  premiumStatusSubtext: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  priceCard: {
    backgroundColor: '#1A3B5C',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#FFB800',
    marginTop: 4,
  },
  pricingNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#FFB800',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  restoreButton: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  restoreButtonText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  comparisonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 0,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 8,
  },
  comparisonTable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  comparisonFeature: {
    flex: 1.5,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3B5C',
    paddingRight: 8,
  },
  comparisonFree: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  comparisonPremium: {
    flex: 1,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  comparisonHeader: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    marginBottom: 2,
  },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
  },
  comparisonHeaderPremium: {
    color: '#FFB800',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  legalLinkButton: {
    padding: 4,
  },
  legalLinkText: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    marginHorizontal: 8,
    color: '#999',
    fontSize: 12,
  },
});