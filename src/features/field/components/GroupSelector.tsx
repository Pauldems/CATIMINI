import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Group } from '../../../types';
import { useCurrentGroup } from '../../../hooks/useCurrentGroup';
import { Colors } from '../../../theme/colors';

interface GroupSelectorProps {
  navigation?: any;
}

export default function GroupSelector({ navigation }: GroupSelectorProps) {
  const { currentGroup, userGroups, switchGroup } = useCurrentGroup();
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleGroupSwitch = async (groupId: string) => {
    const success = await switchGroup(groupId);
    if (success) {
      setShowGroupModal(false);
      Alert.alert('Succès', 'Groupe sélectionné !');
    } else {
      Alert.alert('Erreur', 'Impossible de changer de groupe');
    }
  };

  const goToGroupManagement = () => {
    setShowGroupModal(false);
    if (navigation) {
      navigation.navigate('GroupManagement');
    } else {
      // Fallback si navigation n'est pas disponible
      Alert.alert('Info', 'Accédez aux paramètres pour gérer vos groupes');
    }
  };

  if (!currentGroup) {
    return (
      <TouchableOpacity 
        style={styles.noGroupContainer}
        onPress={goToGroupManagement}
      >
        <Text style={styles.noGroupText}>Aucun groupe sélectionné</Text>
        <Text style={styles.tapText}>Appuyez pour gérer vos groupes</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={() => setShowGroupModal(true)}
      >
        <View style={styles.groupInfo}>
          <Text style={styles.groupLabel}>Groupe:</Text>
          <Text style={styles.groupName}>{currentGroup.name}</Text>
        </View>
        <Text style={styles.changeText}>Changer</Text>
      </TouchableOpacity>

      <Modal
        visible={showGroupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un groupe</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGroupModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.groupsList}>
              {userGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupItem,
                    currentGroup.id === group.id && styles.selectedGroupItem
                  ]}
                  onPress={() => handleGroupSwitch(group.id)}
                >
                  <View style={styles.groupItemContent}>
                    <Text style={[
                      styles.groupItemName,
                      currentGroup.id === group.id && styles.selectedGroupText
                    ]}>
                      {group.name}
                    </Text>
                    {group.description && (
                      <Text style={[
                        styles.groupItemDescription,
                        currentGroup.id === group.id && styles.selectedGroupText
                      ]}>
                        {group.description}
                      </Text>
                    )}
                    <Text style={[
                      styles.groupItemInfo,
                      currentGroup.id === group.id && styles.selectedGroupText
                    ]}>
                      {group.members.length} membre(s)
                    </Text>
                  </View>
                  {currentGroup.id === group.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={goToGroupManagement}
              >
                <Text style={styles.manageButtonText}>Gérer mes groupes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 18,
    borderWidth: 0,
    // Effet flottant
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    // Effet glassmorphism
    backdropFilter: 'blur(10px)',
  },
  noGroupContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 18,
    borderWidth: 0,
    alignItems: 'center',
    // Effet flottant
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    // Effet glassmorphism
    backdropFilter: 'blur(10px)',
  },
  groupInfo: {
    flex: 1,
  },
  groupLabel: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupName: {
    fontSize: 18,
    color: '#1A3B5C',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  noGroupText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '700',
  },
  tapText: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 4,
    fontWeight: '500',
  },
  changeText: {
    fontSize: 14,
    color: '#FFB800',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    // Effet flottant
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3B5C',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '700',
  },
  groupsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 18,
    marginVertical: 8,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedGroupItem: {
    backgroundColor: '#1A3B5C',
    borderLeftColor: '#FFB800',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  groupItemContent: {
    flex: 1,
  },
  groupItemName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A3B5C',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  groupItemDescription: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
    fontWeight: '500',
  },
  groupItemInfo: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
    opacity: 0.8,
  },
  selectedGroupText: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#1A3B5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  checkMark: {
    fontSize: 16,
    color: '#1A3B5C',
    fontWeight: '800',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 59, 92, 0.1)',
  },
  manageButton: {
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
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});