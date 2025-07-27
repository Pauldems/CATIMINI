import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { auth } from '../../../config/firebase';
import { Group } from '../../../types';
import groupService from '../../../services/groupService';
import premiumService from '../../../services/premiumService';
import { Colors } from '../../../theme/colors';
import { PremiumModal } from '../../profile/components/PremiumModal';

export default function GroupManagementScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadUserGroups();
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    const premium = await premiumService.checkPremiumStatus();
    setIsPremium(premium);
  };

  const loadUserGroups = async () => {
    if (!auth.currentUser) return;

    try {
      const userGroups = await groupService.getUserGroups(auth.currentUser.uid);
      setGroups(userGroups);
      
      // Si l'utilisateur n'a pas de groupe, proposer d'en créer un
      if (userGroups.length === 0) {
        Alert.alert(
          'Bienvenue !',
          'Vous devez créer un groupe ou rejoindre un groupe existant pour commencer à utiliser l\'application.',
          [
            { text: 'Créer un groupe', onPress: () => setShowCreateModal(true) },
            { text: 'Rejoindre un groupe', onPress: () => setShowJoinModal(true) }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    try {
      // Vérifier si l'utilisateur peut créer un groupe
      const isPremium = await premiumService.checkPremiumStatus();
      const userGroups = await groupService.getUserGroups(auth.currentUser!.uid);
      
      if (!isPremium && userGroups.length >= 1) {
        setShowPremiumModal(true);
        return;
      }

      const groupId = await groupService.createGroup(
        newGroupName.trim(),
        newGroupDescription.trim(),
        auth.currentUser!.uid
      );
      
      // Mettre à jour le groupe actuel de l'utilisateur
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, groupId);
      
      Alert.alert('Succès', 'Groupe créé avec succès !');
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      loadUserGroups();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code d\'invitation');
      return;
    }

    try {
      const groupId = await groupService.joinGroupWithCode(
        inviteCode.trim().toUpperCase(),
        auth.currentUser!.uid
      );
      
      // Mettre à jour le groupe actuel de l'utilisateur
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, groupId);
      
      Alert.alert('Succès', 'Vous avez rejoint le groupe !');
      setShowJoinModal(false);
      setInviteCode('');
      loadUserGroups();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const selectGroup = async (group: Group) => {
    try {
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, group.id);
      setCurrentGroup(group);
      Alert.alert('Succès', `Vous avez sélectionné le groupe \"${group.name}\"`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };


  const leaveGroup = (group: Group) => {
    Alert.alert(
      'Quitter le groupe',
      `Êtes-vous sûr de vouloir quitter le groupe \"${group.name}\" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.leaveGroup(auth.currentUser!.uid, group.id);
              Alert.alert('Succès', 'Vous avez quitté le groupe');
              loadUserGroups();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
      <Text style={styles.title}>Mes Groupes</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.buttonText}>Créer un groupe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowJoinModal(true)}
        >
          <Text style={styles.secondaryButtonText}>Rejoindre un groupe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.groupsList}>
        {groups.length === 0 ? (
          <Text style={styles.noGroupsText}>
            Vous n'appartenez à aucun groupe.\\nCréez un groupe ou rejoignez-en un !
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.groupItem}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{group.name}</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => leaveGroup(group)}
                >
                  <Text style={styles.actionButtonText}>Quitter</Text>
                </TouchableOpacity>
              </View>
              
              {group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
              )}
              
              <Text style={styles.groupInfo}>
                {group.members.length} membre(s) • Code: {group.inviteCode}
              </Text>
              
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => selectGroup(group)}
              >
                <Text style={styles.selectButtonText}>Sélectionner ce groupe</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Modal Créer un groupe */}
      <Modal visible={showCreateModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Créer un groupe</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom du groupe"
              placeholderTextColor="#999"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optionnel)"
              placeholderTextColor="#999"
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={createGroup}
              >
                <Text style={styles.confirmButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Rejoindre un groupe */}
      <Modal visible={showJoinModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Rejoindre un groupe</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Code d'invitation"
              placeholderTextColor="#999"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={joinGroup}
              >
                <Text style={styles.confirmButtonText}>Rejoindre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>

    {/* Modal Premium */}
    <PremiumModal
      visible={showPremiumModal}
      onClose={() => setShowPremiumModal(false)}
      isPremium={isPremium}
      onUpgrade={async () => {
        setShowPremiumModal(false);
        // Attendre un peu pour que StoreKit se mette à jour
        setTimeout(async () => {
          await checkPremiumStatus();
        }, 1000);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#1A3B5C',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingTop: 80,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1A3B5C',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A3B5C',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryButtonText: {
    color: '#1A3B5C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  groupsList: {
    paddingHorizontal: 15,
  },
  noGroupsText: {
    textAlign: 'center',
    color: '#2C3E50',
    fontSize: 17,
    marginTop: 40,
    lineHeight: 24,
    fontWeight: '500',
    opacity: 0.8,
  },
  groupItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A3B5C',
    flex: 1,
    letterSpacing: 0.3,
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  groupDescription: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 10,
    fontWeight: '500',
    lineHeight: 20,
  },
  groupInfo: {
    fontSize: 13,
    color: '#FFB800',
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  selectButton: {
    backgroundColor: '#1A3B5C',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1A3B5C',
    letterSpacing: 0.3,
  },
  input: {
    height: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    marginBottom: 16,
    color: '#1A3B5C',
    borderWidth: 2,
    borderColor: 'rgba(26, 59, 92, 0.1)',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 88,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(26, 59, 92, 0.2)',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#1A3B5C',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});