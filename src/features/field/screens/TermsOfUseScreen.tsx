import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

interface TermsOfUseScreenProps {
  navigation: any;
}

export default function TermsOfUseScreen({ navigation }: TermsOfUseScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A3B5C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Dernière mise à jour : 28 juillet 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptation des conditions</Text>
          <Text style={styles.text}>En utilisant l'application Créno, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description du service</Text>
          <Text style={styles.text}>Créno est une application de planification d'événements qui permet aux utilisateurs de :</Text>
          <Text style={styles.bulletPoint}>• Créer et gérer des événements en groupe</Text>
          <Text style={styles.bulletPoint}>• Partager leurs disponibilités</Text>
          <Text style={styles.bulletPoint}>• Recevoir des notifications sur les événements</Text>
          <Text style={styles.bulletPoint}>• Communiquer avec les membres de leurs groupes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Inscription et compte utilisateur</Text>
          <Text style={styles.bulletPoint}>• Vous devez avoir au moins 13 ans pour utiliser Créno</Text>
          <Text style={styles.bulletPoint}>• Vous devez fournir une adresse email valide</Text>
          <Text style={styles.bulletPoint}>• Vous êtes responsable de la confidentialité de votre compte</Text>
          <Text style={styles.bulletPoint}>• Vous devez nous informer immédiatement de toute utilisation non autorisée</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Abonnement Premium</Text>
          
          <Text style={styles.subsectionTitle}>Description de l'abonnement</Text>
          <Text style={styles.bulletPoint}>• L'abonnement Premium est optionnel et offre des fonctionnalités supplémentaires</Text>
          <Text style={styles.bulletPoint}>• Prix : 0,99 € par mois (prix peut varier selon la région)</Text>
          <Text style={styles.bulletPoint}>• L'abonnement est automatiquement renouvelé chaque mois</Text>

          <Text style={styles.subsectionTitle}>Fonctionnalités Premium</Text>
          <Text style={styles.bulletPoint}>• Indisponibilités illimitées (vs 10 en version gratuite)</Text>
          <Text style={styles.bulletPoint}>• Groupes illimités (vs 1 en version gratuite)</Text>
          <Text style={styles.bulletPoint}>• Support prioritaire</Text>

          <Text style={styles.subsectionTitle}>Paiement et renouvellement</Text>
          <Text style={styles.bulletPoint}>• Le paiement est prélevé via votre compte App Store</Text>
          <Text style={styles.bulletPoint}>• Le renouvellement est automatique sauf annulation</Text>
          <Text style={styles.bulletPoint}>• L'annulation doit être effectuée au moins 24h avant la fin de la période</Text>
          <Text style={styles.bulletPoint}>• La gestion de l'abonnement se fait dans les paramètres de l'App Store</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Utilisation acceptable</Text>
          <Text style={styles.text}>Vous vous engagez à :</Text>
          <Text style={styles.bulletPoint}>• Ne pas utiliser l'app à des fins illégales</Text>
          <Text style={styles.bulletPoint}>• Respecter les autres utilisateurs</Text>
          <Text style={styles.bulletPoint}>• Ne pas publier de contenu offensant ou inapproprié</Text>
          <Text style={styles.bulletPoint}>• Ne pas tenter de contourner les limitations de la version gratuite</Text>
          <Text style={styles.bulletPoint}>• Ne pas perturber le fonctionnement du service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Propriété intellectuelle</Text>
          <Text style={styles.bulletPoint}>• L'application et son contenu sont protégés par le droit d'auteur</Text>
          <Text style={styles.bulletPoint}>• Vous conservez vos droits sur le contenu que vous créez</Text>
          <Text style={styles.bulletPoint}>• Vous nous accordez une licence pour utiliser votre contenu dans le cadre du service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitation de responsabilité</Text>
          <Text style={styles.bulletPoint}>• L'application est fournie "en l'état"</Text>
          <Text style={styles.bulletPoint}>• Nous ne garantissons pas une disponibilité continue du service</Text>
          <Text style={styles.bulletPoint}>• Nous ne sommes pas responsables des pertes de données</Text>
          <Text style={styles.bulletPoint}>• Notre responsabilité est limitée au montant de votre abonnement</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Résiliation</Text>
          <Text style={styles.bulletPoint}>• Vous pouvez supprimer votre compte à tout moment</Text>
          <Text style={styles.bulletPoint}>• Nous pouvons suspendre ou résilier votre compte en cas de violation des conditions</Text>
          <Text style={styles.bulletPoint}>• Les abonnements payés ne sont pas remboursables</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Modifications des conditions</Text>
          <Text style={styles.bulletPoint}>• Nous pouvons modifier ces conditions à tout moment</Text>
          <Text style={styles.bulletPoint}>• Les modifications importantes seront notifiées dans l'app</Text>
          <Text style={styles.bulletPoint}>• L'utilisation continue de l'app vaut acceptation des nouvelles conditions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Droit applicable</Text>
          <Text style={styles.text}>Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact</Text>
          <Text style={styles.text}>Pour toute question concernant ces conditions d'utilisation :</Text>
          <Text style={styles.bulletPoint}>• Site web : topal.fr (rubrique "Contactez-nous")</Text>
          <Text style={styles.bulletPoint}>• Via les paramètres de l'application</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Conditions spécifiques Apple</Text>
          <Text style={styles.text}>En utilisant cette application sur un appareil iOS :</Text>
          <Text style={styles.bulletPoint}>• Ces conditions sont entre vous et le développeur, pas Apple</Text>
          <Text style={styles.bulletPoint}>• Apple n'est pas responsable du contenu ou de la maintenance de l'app</Text>
          <Text style={styles.bulletPoint}>• En cas de problème, contactez le développeur, pas Apple</Text>
          <Text style={styles.bulletPoint}>• Apple est un tiers bénéficiaire de ces conditions</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
    marginRight: 39, // Compenser la largeur du bouton retour
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#FFB800',
    marginTop: 20,
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFB800',
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 0.2,
  },
  text: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'justify',
    fontWeight: '500',
  },
  bulletPoint: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 10,
    marginLeft: 0,
    marginRight: 0,
    textAlign: 'justify',
    fontWeight: '500',
    paddingLeft: 0,
  },
  bold: {
    fontWeight: '700',
    color: '#1A3B5C',
  },
  bottomPadding: {
    height: 40,
  },
});