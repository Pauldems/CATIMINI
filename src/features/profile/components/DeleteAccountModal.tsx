import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onAccountDeleted
}) => {
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  const deleteUserData = async (userId: string) => {
    const collections = [
      'availabilities',
      'events', 
      'friends',
      'groups',
      'notifications'
    ];

    for (const collectionName of collections) {
      const q = query(collection(db, collectionName), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(docSnapshot.ref);
      }

      // Pour les événements créés par l'utilisateur
      if (collectionName === 'events') {
        const creatorQuery = query(collection(db, collectionName), where('creatorId', '==', userId));
        const creatorSnapshot = await getDocs(creatorQuery);
        
        for (const docSnapshot of creatorSnapshot.docs) {
          await deleteDoc(docSnapshot.ref);
        }
      }

      // Pour les participants dans les événements
      if (collectionName === 'events') {
        const participantQuery = query(collection(db, collectionName), where('participants', 'array-contains', userId));
        const participantSnapshot = await getDocs(participantQuery);
        
        for (const docSnapshot of participantSnapshot.docs) {
          const eventData = docSnapshot.data();
          const updatedParticipants = eventData.participants.filter((id: string) => id !== userId);
          const updatedConfirmed = eventData.confirmedParticipants?.filter((id: string) => id !== userId) || [];
          
          await updateDoc(docSnapshot.ref, {
            participants: updatedParticipants,
            confirmedParticipants: updatedConfirmed
          });
        }
      }

      // Pour les groupes où l'utilisateur est membre
      if (collectionName === 'groups') {
        const memberQuery = query(collection(db, collectionName), where('members', 'array-contains', userId));
        const memberSnapshot = await getDocs(memberQuery);
        
        for (const docSnapshot of memberSnapshot.docs) {
          const groupData = docSnapshot.data();
          const updatedMembers = groupData.members.filter((id: string) => id !== userId);
          
          if (updatedMembers.length === 0) {
            // Supprimer le groupe s'il n'y a plus de membres
            await deleteDoc(docSnapshot.ref);
          } else {
            await updateDoc(docSnapshot.ref, {
              members: updatedMembers
            });
          }
        }
      }

      // Pour les relations d'amitié
      if (collectionName === 'friends') {
        const friendQuery = query(collection(db, collectionName), where('friendId', '==', userId));
        const friendSnapshot = await getDocs(friendQuery);
        
        for (const docSnapshot of friendSnapshot.docs) {
          await deleteDoc(docSnapshot.ref);
        }
      }
    }

    // Supprimer le document utilisateur
    await deleteDoc(doc(db, 'users', userId));
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    Alert.alert(
      'Confirmation finale',
      'Êtes-vous absolument sûr(e) de vouloir supprimer votre compte ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const userId = auth.currentUser.uid;
              
              // Supprimer toutes les données utilisateur
              await deleteUserData(userId);
              
              // Supprimer le compte Firebase Auth
              await deleteUser(auth.currentUser);
              
              onAccountDeleted();
            } catch (error: any) {
              console.error('Erreur suppression compte:', error);
              
              if (error.code === 'auth/requires-recent-login') {
                console.log('🔐 Ouverture modal mot de passe');
                setLoading(false);
                onClose(); // Fermer la première modal
                setTimeout(() => {
                  setShowPasswordModal(true);
                }, 300);
              } else {
                Alert.alert(
                  'Erreur',
                  'Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer.'
                );
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReauthAndDelete = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    
    setLoading(true);
    try {
      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Maintenant on peut supprimer
      const userId = auth.currentUser.uid;
      await deleteUserData(userId);
      await deleteUser(auth.currentUser);
      
      setShowPasswordModal(false);
      onAccountDeleted();
    } catch (error: any) {
      console.error('Erreur réauth:', error);
      Alert.alert(
        'Erreur',
        error.code === 'auth/wrong-password' 
          ? 'Mot de passe incorrect' 
          : 'Erreur lors de la suppression du compte'
      );
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color="#FF5252" />
          </View>
          
          <Text style={styles.title}>Supprimer le compte</Text>
          
          <Text style={styles.description}>
            Cette action supprimera définitivement :
          </Text>
          
          <View style={styles.warningList}>
            <Text style={styles.warningItem}>• Votre profil utilisateur</Text>
            <Text style={styles.warningItem}>• Tous vos événements créés</Text>
            <Text style={styles.warningItem}>• Vos disponibilités</Text>
            <Text style={styles.warningItem}>• Vos relations d'amitié</Text>
            <Text style={styles.warningItem}>• Vos groupes (si vous êtes le seul membre)</Text>
          </View>
          
          <View style={styles.finalWarning}>
            <Text style={styles.finalWarningText}>
              ⚠️ Cette action est irréversible
            </Text>
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal pour le mot de passe */}
    <Modal
      visible={showPasswordModal}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Confirmation requise</Text>
          <Text style={styles.description}>
            Pour supprimer votre compte, veuillez entrer votre mot de passe
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <View style={[styles.buttonContainer, { flexDirection: 'row' }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowPasswordModal(false);
                setPassword('');
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleReauthAndDelete}
              disabled={loading || !password}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  warningList: {
    alignSelf: 'stretch',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  warningItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  finalWarning: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  finalWarningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1A3B5C',
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
  },
});