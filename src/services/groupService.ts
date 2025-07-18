import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  arrayRemove 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group, GroupMembership, Event } from '../types';

class GroupService {
  /**
   * Génère un code d'invitation unique pour un groupe
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Crée un nouveau groupe
   */
  async createGroup(name: string, description: string, creatorId: string): Promise<string> {
    const inviteCode = this.generateInviteCode();
    
    // Créer le groupe
    const groupDoc = await addDoc(collection(db, 'groups'), {
      name,
      description,
      creatorId,
      members: [creatorId],
      inviteCode,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Ajouter le créateur comme admin du groupe
    await addDoc(collection(db, 'groupMemberships'), {
      userId: creatorId,
      groupId: groupDoc.id,
      role: 'admin',
      joinedAt: new Date()
    });

    return groupDoc.id;
  }

  /**
   * Rejoindre un groupe avec un code d'invitation
   */
  async joinGroupWithCode(inviteCode: string, userId: string): Promise<string> {
    // Trouver le groupe avec ce code
    const groupsQuery = query(
      collection(db, 'groups'),
      where('inviteCode', '==', inviteCode)
    );
    
    const groupSnapshot = await getDocs(groupsQuery);
    
    if (groupSnapshot.empty) {
      throw new Error('Code d\'invitation invalide');
    }

    const groupDoc = groupSnapshot.docs[0];
    const groupData = groupDoc.data() as Group;

    // Vérifier si l'utilisateur est déjà membre
    const membershipQuery = query(
      collection(db, 'groupMemberships'),
      where('userId', '==', userId),
      where('groupId', '==', groupDoc.id)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (!membershipSnapshot.empty) {
      throw new Error('Vous êtes déjà membre de ce groupe');
    }

    // Ajouter l'utilisateur au groupe
    await updateDoc(doc(db, 'groups', groupDoc.id), {
      members: [...groupData.members, userId],
      updatedAt: new Date()
    });

    // Créer le membership
    await addDoc(collection(db, 'groupMemberships'), {
      userId,
      groupId: groupDoc.id,
      role: 'member',
      joinedAt: new Date()
    });

    return groupDoc.id;
  }

  /**
   * Récupérer tous les groupes d'un utilisateur
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    const membershipQuery = query(
      collection(db, 'groupMemberships'),
      where('userId', '==', userId)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    const groupIds = membershipSnapshot.docs.map(doc => doc.data().groupId);

    if (groupIds.length === 0) {
      return [];
    }

    const groups: Group[] = [];
    for (const groupId of groupIds) {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        groups.push({ ...groupDoc.data(), id: groupDoc.id } as Group);
      }
    }

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Récupérer les détails d'un groupe
   */
  async getGroup(groupId: string): Promise<Group | null> {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    
    if (!groupDoc.exists()) {
      return null;
    }

    return { ...groupDoc.data(), id: groupDoc.id } as Group;
  }

  /**
   * Récupérer le rôle d'un utilisateur dans un groupe
   */
  async getUserRole(userId: string, groupId: string): Promise<'admin' | 'member' | null> {
    const membershipQuery = query(
      collection(db, 'groupMemberships'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (membershipSnapshot.empty) {
      return null;
    }

    return membershipSnapshot.docs[0].data().role;
  }

  /**
   * Quitter un groupe
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    // 1. Retirer l'utilisateur de tous les événements du groupe
    const eventsQuery = query(
      collection(db, 'events'),
      where('groupId', '==', groupId),
      where('participants', 'array-contains', userId)
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    
    // Retirer l'utilisateur de chaque événement du groupe
    for (const eventDoc of eventsSnapshot.docs) {
      await updateDoc(eventDoc.ref, {
        participants: arrayRemove(userId),
        confirmedParticipants: arrayRemove(userId)
      });
    }

    // 2. Supprimer le membership
    const membershipQuery = query(
      collection(db, 'groupMemberships'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );
    
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (!membershipSnapshot.empty) {
      await deleteDoc(membershipSnapshot.docs[0].ref);
    }

    // 3. Retirer l'utilisateur de la liste des membres du groupe
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (groupDoc.exists()) {
      const groupData = groupDoc.data() as Group;
      const updatedMembers = groupData.members.filter(id => id !== userId);
      
      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        updatedAt: new Date()
      });
    }
  }

  /**
   * Mettre à jour le groupe actuel de l'utilisateur
   */
  async updateUserCurrentGroup(userId: string, groupId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      currentGroupId: groupId
    });
  }
}

export default new GroupService();