import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import premiumService from '../../../services/premiumService';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  visible,
  onClose,
  isPremium,
  onUpgrade
}) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Pour l'instant, on simule l'achat (à remplacer par vraie logique de paiement)
      await premiumService.activatePremium(1); // 1 mois
      
      Alert.alert(
        '🎉 Premium activé !',
        'Vous êtes maintenant premium ! Profitez de vos indisponibilités illimitées et d\'une expérience sans publicité.',
        [
          { 
            text: 'Parfait !', 
            onPress: () => {
              onUpgrade();
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur activation premium:', error);
      Alert.alert('Erreur', 'Impossible d\'activer le premium. Réessayez plus tard.');
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
      icon: 'close-circle',
      title: 'Zéro publicité',
      description: 'Profitez de l\'app sans interruption'
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
                <Ionicons name="star" size={48} color="#FFD700" />
              </View>
              
              <Text style={styles.title}>
                {isPremium ? 'Créno Premium' : 'Passez à Premium'}
              </Text>
              
              {isPremium ? (
                <View style={styles.premiumStatusContainer}>
                  <Text style={styles.premiumStatusText}>
                    ✨ Vous êtes Premium !
                  </Text>
                  <Text style={styles.premiumStatusSubtext}>
                    {premiumService.getRemainingDays()} jours restants
                  </Text>
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

            {!isPremium && (
              <>
                {/* Pricing */}
                <View style={styles.pricingContainer}>
                  <View style={styles.priceCard}>
                    <Text style={styles.priceAmount}>2€</Text>
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
              </>
            )}

            {/* Comparison */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>Comparaison des plans</Text>
              
              <View style={styles.comparisonTable}>
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
                
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonFeature}>Publicités</Text>
                  <Text style={styles.comparisonFree}>Oui</Text>
                  <Text style={styles.comparisonPremium}>Aucune ✨</Text>
                </View>
                
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonFeature}>Support prioritaire</Text>
                  <Text style={styles.comparisonFree}>Standard</Text>
                  <Text style={styles.comparisonPremium}>Prioritaire ✨</Text>
                </View>
              </View>
            </View>
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
    maxHeight: '90%',
    paddingBottom: 34, // Safe area
  },
  header: {
    padding: 24,
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
    width: 80,
    height: 80,
    backgroundColor: '#FFF8E1',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 8,
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
    padding: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A3B5C',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  priceCard: {
    backgroundColor: '#1A3B5C',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  priceAmount: {
    fontSize: 32,
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
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
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
  comparisonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3B5C',
    textAlign: 'center',
    marginBottom: 20,
  },
  comparisonTable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  comparisonFeature: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3B5C',
  },
  comparisonFree: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  comparisonPremium: {
    flex: 1,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
});