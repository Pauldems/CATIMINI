export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  currentGroupId?: string; // Groupe actuellement sélectionné
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  members: string[]; // IDs des membres du groupe
  inviteCode: string; // Code pour rejoindre le groupe
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface Availability {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  groupId?: string; // Optionnel car les indisponibilités sont partagées entre groupes
  createdAt: Date;
  createdByEvent?: string; // ID de l'événement qui a créé cette indisponibilité
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  participants: string[];
  confirmedParticipants: string[];
  groupId: string; // Obligatoire maintenant
  createdAt: Date;
}

export interface TimeSlot {
  startDate: Date;
  endDate: Date;
  availableUsers: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_event' | 'participant_unavailable' | 'event_deleted';
  title: string;
  message: string;
  eventId?: string;
  read: boolean;
  createdAt: Date;
}