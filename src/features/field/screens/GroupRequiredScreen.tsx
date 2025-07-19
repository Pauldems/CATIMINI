import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { auth } from '../../../config/firebase';
import groupService from '../../../services/groupService';
import premiumService from '../../../services/premiumService';
import { Colors } from '../../../theme/colors';

interface GroupRequiredScreenProps {
  onGroupSelected: () => void;
}

export default function GroupRequiredScreen({ onGroupSelected }: GroupRequiredScreenProps) {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    // Vérifier la limite de groupes pour les utilisateurs gratuits
    if (!premiumService.isPremium()) {
      const userGroups = await groupService.getUserGroups(auth.currentUser!.uid);
      if (userGroups.length >= premiumService.getGroupLimit()) {
        Alert.alert(
          '🌟 Limite atteinte',
          `Vous avez atteint la limite de ${premiumService.getGroupLimit()} groupe en version gratuite.\n\nPassez à Créno Premium pour créer des groupes illimités et supprimer les publicités !`,
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Devenir Premium', 
              onPress: () => {
                // Naviguer vers les paramètres avec modal premium
                // TODO: implémenter navigation premium
              }
            }
          ]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const groupId = await groupService.createGroup(
        groupName.trim(),
        groupDescription.trim(),
        auth.currentUser!.uid
      );
      
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, groupId);
      onGroupSelected();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code d\'invitation');
      return;
    }

    // Vérifier la limite de groupes pour les utilisateurs gratuits
    if (!premiumService.isPremium()) {
      const userGroups = await groupService.getUserGroups(auth.currentUser!.uid);
      if (userGroups.length >= premiumService.getGroupLimit()) {
        Alert.alert(
          '🌟 Limite atteinte',
          `Vous avez atteint la limite de ${premiumService.getGroupLimit()} groupe en version gratuite.\n\nPassez à Créno Premium pour rejoindre des groupes illimités et supprimer les publicités !`,
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Devenir Premium', 
              onPress: () => {
                // Naviguer vers les paramètres avec modal premium
                // TODO: implémenter navigation premium
              }
            }
          ]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const groupId = await groupService.joinGroupWithCode(
        inviteCode.trim().toUpperCase(),
        auth.currentUser!.uid
      );
      
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, groupId);
      onGroupSelected();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choice') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Bienvenue sur Créno !</Text>
          <Text style={styles.subtitle}>
            Pour commencer, vous devez créer un groupe ou rejoindre un groupe existant.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setMode('create')}
            >
              <Text style={styles.buttonText}>Créer un nouveau groupe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode('join')}
            >
              <Text style={styles.secondaryButtonText}>Rejoindre un groupe</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Qu'est-ce qu'un groupe ?</Text>
            <Text style={styles.infoText}>
              Un groupe permet de partager vos disponibilités et événements avec les personnes de votre choix. 
              Vous pouvez appartenir à plusieurs groupes (famille, travail, amis...) et basculer entre eux.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Créer un groupe</Text>
          <Text style={styles.subtitle}>
            Choisissez un nom pour votre groupe et invitez vos proches !
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nom du groupe (ex: Famille, Travail...)"
            placeholderTextColor="#999"
            value={groupName}
            onChangeText={setGroupName}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optionnel)"
            placeholderTextColor="#999"
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('choice')}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={createGroup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Création...' : 'Créer le groupe'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (mode === 'join') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Rejoindre un groupe</Text>
          <Text style={styles.subtitle}>
            Entrez le code d'invitation que quelqu'un vous a donné.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Code d'invitation (6 caractères)"
            placeholderTextColor="#999"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            maxLength={6}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Comment obtenir un code ?</Text>
            <Text style={styles.infoText}>
              Demandez à la personne qui a créé le groupe de vous donner son code d'invitation. 
              Elle peut le trouver dans les paramètres du groupe.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('choice')}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={joinGroup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Connexion...' : 'Rejoindre'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(26, 59, 92, 0.2)',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#1A3B5C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: Colors.white,
    fontSize: 13,
    opacity: 0.7,
  },
  input: {
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white,
    marginBottom: 24,
    opacity: 0.95,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});