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
import { Colors } from '../../../theme/colors';

export default function GroupManagementScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    loadUserGroups();
  }, []);

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: Colors.white,
    padding: 18,
    paddingTop: 80,
    paddingBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  groupsList: {
    paddingHorizontal: 18,
  },
  noGroupsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 40,
    lineHeight: 24,
  },
  groupItem: {
    backgroundColor: Colors.primarySoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  groupInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  input: {
    height: 48,
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  textArea: {
    height: 80,
    paddingTop: 14,
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
    backgroundColor: Colors.primarySoft,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});