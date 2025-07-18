import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Group, User } from '../types';
import groupService from '../services/groupService';

export function useCurrentGroup() {
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Écouter les changements du document utilisateur pour le currentGroupId
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          // Charger tous les groupes de l'utilisateur
          try {
            const groups = await groupService.getUserGroups(auth.currentUser!.uid);
            setUserGroups(groups);

            // Si l'utilisateur a un currentGroupId, charger ce groupe
            if (userData.currentGroupId) {
              const group = await groupService.getGroup(userData.currentGroupId);
              setCurrentGroup(group);
            } else if (groups.length > 0) {
              // Si pas de groupe actuel mais l'utilisateur a des groupes, sélectionner le premier
              const firstGroup = groups[0];
              await groupService.updateUserCurrentGroup(auth.currentUser!.uid, firstGroup.id);
              setCurrentGroup(firstGroup);
            } else {
              setCurrentGroup(null);
            }
          } catch (error) {
            console.error('Erreur lors du chargement des groupes:', error);
          }
        }
        setLoading(false);
      }
    );

    return () => unsubscribeUser();
  }, []);

  const switchGroup = async (groupId: string) => {
    try {
      await groupService.updateUserCurrentGroup(auth.currentUser!.uid, groupId);
      const group = await groupService.getGroup(groupId);
      setCurrentGroup(group);
      return true;
    } catch (error) {
      console.error('Erreur lors du changement de groupe:', error);
      return false;
    }
  };

  const refreshGroups = async () => {
    if (!auth.currentUser) return;
    
    try {
      const groups = await groupService.getUserGroups(auth.currentUser.uid);
      setUserGroups(groups);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des groupes:', error);
    }
  };

  return {
    currentGroup,
    userGroups,
    loading,
    switchGroup,
    refreshGroups,
    hasGroups: userGroups.length > 0,
    needsGroupSelection: !loading && (!currentGroup || userGroups.length === 0)
  };
}