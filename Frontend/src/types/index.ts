// User and Chat types
export interface User {
  userID: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  unreadCount?: number;
}

export interface Chat extends User {
  group?: boolean;
  groupID?: string;
  groupName?: string;
  groupAvatarUrl?: string;
  lastMessage?: string;
  timestamp?: string;
}

// Message types
export interface Message {
  id: string;
  senderID: string;
  from: string;
  to: string;
  fromEmail?: string;
  toEmail?: string;
  content?: string;
  message?: string;
  body?: string;
  timestamp: string | Date;
  type: 'sent' | 'received';
  read: boolean;
  groupID?: string;
}

// Group types
export interface GroupMember {
  userID: string;
  email: string;
  username?: string;
  name?: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
}

// Modal state types
export interface ModalsState {
  membersList: boolean;
  addMembers: boolean;
  removeMember: boolean;
  renameGroup: boolean;
  deleteGroup: boolean;
  leaveGroup: boolean;
  forward: boolean;
  createGroup: boolean;
}

// Socket hook params
export interface SocketParams {
  url?: string;
  token: string | null;
  userID: string | null;
  email: string | null;
}

// Notification types
export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  groupID?: string;
}
