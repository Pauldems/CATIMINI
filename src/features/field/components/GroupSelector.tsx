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
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 18,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  noGroupContainer: {
    backgroundColor: Colors.unavailableSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 18,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.unavailable,
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  groupName: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  noGroupText: {
    fontSize: 14,
    color: Colors.unavailable,
    fontWeight: '600',
  },
  tapText: {
    fontSize: 12,
    color: Colors.unavailable,
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  groupsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGroupItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  groupItemContent: {
    flex: 1,
  },
  groupItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  groupItemDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  groupItemInfo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  selectedGroupText: {
    color: Colors.white,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkMark: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  manageButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  manageButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});