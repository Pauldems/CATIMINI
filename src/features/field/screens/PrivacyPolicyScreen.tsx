import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

interface PrivacyPolicyScreenProps {
  navigation: any;
}

export default function PrivacyPolicyScreen({ navigation }: PrivacyPolicyScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A3B5C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de confidentialité</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Dernière mise à jour : 12 juillet 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Données que nous collectons</Text>
          
          <Text style={styles.subsectionTitle}>Données d'inscription</Text>
          <Text style={styles.bulletPoint}>• Adresse email (pour l'authentification)</Text>
          <Text style={styles.bulletPoint}>• Nom d'utilisateur (pour l'identification dans l'app)</Text>

          <Text style={styles.subsectionTitle}>Données d'utilisation</Text>
          <Text style={styles.bulletPoint}>• Événements créés (titre, description, dates, heures)</Text>
          <Text style={styles.bulletPoint}>• Disponibilités renseignées par l'utilisateur</Text>
          <Text style={styles.bulletPoint}>• Membres des groupes rejoints</Text>
          <Text style={styles.bulletPoint}>• Notifications envoyées et reçues</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Comment nous utilisons vos données</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Fonctionnement de l'app :</Text> Planification d'événements et gestion des disponibilités</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Notifications :</Text> Alertes sur les nouveaux événements et invitations (avec votre consentement)</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Amélioration du service :</Text> Analyse anonyme d'usage pour améliorer l'expérience</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Partage des données</Text>
          
          <Text style={styles.subsectionTitle}>Avec d'autres utilisateurs</Text>
          <Text style={styles.bulletPoint}>• Votre nom d'utilisateur est visible par les membres de vos groupes</Text>
          <Text style={styles.bulletPoint}>• Vos disponibilités sont partagées lors de la planification d'événements</Text>
          <Text style={styles.bulletPoint}>• Les événements que vous créez sont visibles par les participants invités</Text>

          <Text style={styles.subsectionTitle}>Avec des tiers</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Firebase (Google) :</Text> Hébergement sécurisé des données et authentification</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Expo :</Text> Plateforme de développement et notifications push</Text>
          <Text style={styles.bulletPoint}>• Nous ne vendons jamais vos données personnelles à des tiers</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Stockage et sécurité</Text>
          <Text style={styles.bulletPoint}>• Vos données sont stockées de manière sécurisée sur les serveurs Firebase (Google Cloud)</Text>
          <Text style={styles.bulletPoint}>• Nous utilisons le chiffrement pour protéger vos données en transit et au repos</Text>
          <Text style={styles.bulletPoint}>• L'accès aux données est limité aux fonctionnalités nécessaires de l'app</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Vos droits</Text>
          
          <Text style={styles.subsectionTitle}>Accès et modification</Text>
          <Text style={styles.bulletPoint}>• Vous pouvez consulter et modifier vos données dans les paramètres de l'app</Text>
          <Text style={styles.bulletPoint}>• Vous pouvez quitter un groupe à tout moment</Text>

          <Text style={styles.subsectionTitle}>Suppression</Text>
          <Text style={styles.bulletPoint}>• Vous pouvez supprimer votre compte via les paramètres</Text>
          <Text style={styles.bulletPoint}>• La suppression entraîne l'effacement de toutes vos données personnelles</Text>
          <Text style={styles.bulletPoint}>• Les événements que vous avez créés peuvent être conservés de manière anonyme</Text>

          <Text style={styles.subsectionTitle}>Notifications</Text>
          <Text style={styles.bulletPoint}>• Vous pouvez désactiver les notifications à tout moment dans les paramètres de votre appareil</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Protection des mineurs</Text>
          <Text style={styles.bulletPoint}>• L'application est destinée aux utilisateurs de 13 ans et plus</Text>
          <Text style={styles.bulletPoint}>• Nous ne collectons pas sciemment de données d'enfants de moins de 13 ans</Text>
          <Text style={styles.bulletPoint}>• Si un mineur de moins de 13 ans a fourni des données, contactez-nous</Text>
          <Text style={styles.bulletPoint}>• Nous procéderons immédiatement à la suppression de ces données</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Contact</Text>
          <Text style={styles.text}>Pour toute question concernant cette politique de confidentialité ou vos données personnelles :</Text>
          <Text style={styles.bulletPoint}>• Site web : topal.fr (rubrique "Contactez-nous")</Text>
          <Text style={styles.bulletPoint}>• Via les paramètres de l'application</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Base légale (RGPD)</Text>
          <Text style={styles.text}>Nous traitons vos données sur la base de :</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Exécution du contrat :</Text> Fourniture du service de planification d'événements</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Consentement :</Text> Notifications push et communications marketing (si applicable)</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Intérêt légitime :</Text> Amélioration du service et sécurité</Text>
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