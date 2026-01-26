/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from 'react';
import useChatSocket from './useChatSocket';
import { 
    createGroupApi, 
    addGroupMemberApi, 
    removeGroupMemberApi,
    leaveGroupApi,
    deleteGroupApi,
    getMessagesApi,
    renameGroupApi,
    changeGroupMemberRole,
    changeProfilePicApi,
    changeGroupAvatarApi
} from '@/Services/api';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { Message, Chat, GroupMember, ModalsState } from '../types';

export const useChatLogic = () => {
    // --- State ---
    const [message, setMessage] = useState('');
    const [textMessage, setTextMessage] = useState<Message[]>([]);
    const [users, setUsers] = useState<Chat[]>([]);
    const [groupMembersMap, setGroupMembersMap] = useState<Record<string, GroupMember[]>>({});
    const [typingMap, setTypingMap] = useState<Record<string, { username: string }[]>>({});
    const [visible, setVisible] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    
    // --- Modal States ---
    const [modals, setModals] = useState<ModalsState & { roleDropdown: string | null }>({
        membersList: false,
        addMembers: false,
        createGroup: false,
        forward: false,
        renameGroup: false,
        deleteGroup: false,
        leaveGroup: false,
        removeMember: false,
        roleDropdown: null,
    });
    
    // --- Selection/Input States ---
    const [selectedToAdd, setSelectedToAdd] = useState<string[] | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

    // --- Refs ---
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const activeChatRef = useRef<Chat | null>(activeChat);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // --- Auth/Socket Init ---
    const myEmail = localStorage.getItem('email');
    const myUserID = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const resolvedUserID = myUserID || myEmail || null;
    const socketRef = useChatSocket({ token, userID: resolvedUserID, email: myEmail });

    // Sync ref
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    // --- Socket Listeners ---
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        // 1. User Management
        const handleUsers = (usersList: any[]) => {
            const processed = (usersList || []).map((user: any) => ({
                username: user.username ?? user.email,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                userID: user.id ?? user.email,
                online: !!user.online,
                self: user.id === myUserID,
                group: false,
            }));

            processed.sort((a: any, b: any) => {
                if (a.self) return -1;
                if (b.self) return 1;
                if (a.online !== b.online) return a.online ? -1 : 1;
                return (a.username || '').localeCompare(b.username || '');
            });

            setUsers(processed);
            
            // Set own avatar
            const me = processed.find((u: any) => u.email === myEmail);
            if (me && me.avatarUrl) setProfileImage(me.avatarUrl);

            // Merge with existing groups to prevent flashing
            setVisible((prev: Chat[]) => {
                const existingGroups = (prev || []).filter((item: Chat) => item && item.group);
                return [...processed.filter((u: any) => !u.self), ...existingGroups];
            });

            // Update active chat reference if user details changed
            const currentActive = activeChatRef.current;
            if (currentActive && !currentActive.group) {
                const updated = processed.find((u: any) => u.userID === currentActive.userID);
                if (updated) setActiveChat(updated);
                else setActiveChat(null);
            }
        };

        // 2. Group Management
        const handleGroups = (groupsList: any[]) => {
            const processed = groupsList.map((group: any) => ({
                username: group.groupName,
                groupID: group.groupid,
                userID: group.groupid, 
                description: group.description || '',
                CreatorID: group.CreatorID,
                groupAvatarUrl: group.groupAvatar || group.groupAvatarUrl || null,
                group: true,
            }));

            setVisible((prev: Chat[]) => {
                const nonGroupItems = (prev || []).filter((item: Chat) => !item.group);
                return [...nonGroupItems, ...processed];
            });

            if (Array.isArray(groupsList)) {
                setGroupMembersMap((prev: Record<string, GroupMember[]>) => {
                    const next = { ...(prev || {}) };
                    for (const g of groupsList) {
                        if (g && g.groupid) {
                            const membersArr = (g.members || []).map((m: any) => ({
                                id: m.id,
                                name: m.name || m.username || m.email,
                                email: m.email,
                                role: m.role,
                                userID: m.id,
                                username: m.username
                            }));

                            // Owner should always be first, others alphabetical by name
                            membersArr.sort((a: any, b: any) => {
                                if (a.role === 'owner' && b.role !== 'owner') return -1;
                                if (b.role === 'owner' && a.role !== 'owner') return 1;
                                return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
                            });

                            next[g.groupid] = membersArr;
                        }
                    }
                    return next;
                });
            }

            const currentActive = activeChatRef.current;
            if (currentActive && currentActive.group) {
                const updated = processed.find((g: any) => g.groupID === currentActive.groupID);
                if (updated) setActiveChat(updated);
                else setActiveChat(null);
            }
        };

        // 3. Message Handling
        const handleReceive = (data: any) => {
            const msgObj = {
                id: data.id,
                content: data.content,
                fromEmail: data.fromEmail,
                toEmail: data.toEmail,
                groupID: data.groupID || null,
                timestamp: data.timestamp,
                type: "received",
                read: false,
                fromUserId: data.fromUserId ?? data.senderID ?? null,
                fromUsername: data.fromUsername ?? null,
                fromName: data.fromName ?? null,
                fromAvatar: data.fromAvatar ?? null,
            };

            const ac = activeChatRef.current;
            const isGroupMsg = !!data.groupID;

            // Update UI Message List
            if (isGroupMsg) {
                if (ac && ac.group && String(ac.groupID) === String(data.groupID)) {
                    setTextMessage((prev: Message[]) => [...prev, msgObj]);
                } else {
                    incrementUnread(data.groupID, true);
                }
            } else {
                if (ac && (msgObj.toEmail === ac.email || msgObj.fromEmail === ac.email)) {
                    setTextMessage((prev: Message[]) => [...prev, msgObj]);
                    socketRef.current.emit('markAsRead', { 
                        id: msgObj.id, 
                        fromEmail: msgObj.fromEmail, 
                        toEmail: msgObj.toEmail, 
                        toUserId: myUserID, 
                        fromUserId: ac.userID  
                    });
                } else {
                    incrementUnread(msgObj.fromEmail || msgObj.toEmail, false);
                }
            }
        };

        const handleSent = (data: any) => {
            const msgObj = {
                ...data,
                type: "sent",
                read: false,
                groupID: data.groupID || null
            };

            const ac = activeChatRef.current;
            if (!ac) return;

            if (
                (msgObj.toEmail && (msgObj.toEmail === ac.email || msgObj.fromEmail === ac.email)) || 
                (ac.group && String(msgObj.groupID) === String(ac.groupID))
            ) {
                setTextMessage((prev: Message[]) => [...prev, msgObj]);
                stopTypingEmit(ac);
            }
        };

        // ... Register Listeners
        socket.on("users", handleUsers);
        socket.on("groups", handleGroups);
        socket.on('receiveMessage', handleReceive);
        socket.on('sentMessage', handleSent);
        
        // Helper to update unread counts
        const incrementUnread = (id: string, isGroup: boolean) => {
            setVisible((prev: Chat[]) => prev.map((item: Chat) => {
                if (isGroup && item.group && String(item.groupID) === String(id)) {
                    return { ...item, unreadCount: (item.unreadCount || 0) + 1 };
                }
                if (!isGroup && !item.group && (item.email === id)) {
                    return { ...item, unreadCount: (item.unreadCount || 0) + 1 };
                }
                return item;
            }));
        };

        // --- Other Listeners (Typing, Profile, Group Events) ---
        socket.on("unreadMessageCount", (data: any) => {
            setVisible((prev: Chat[]) => prev.map((u: Chat) => u.userID === data.userID ? { ...u, unreadCount: data.count } : u));
        });

        socket.on('typingUpdate', (data: any) => {
            if (!data) return;
            const key = data.groupID ? String(data.groupID) : String(data.chatKey);
            setTypingMap((prev: Record<string, { username: string }[]>) => ({ ...prev, [key]: (Array.isArray(data.typingUsers) ? data.typingUsers : []) }));
        });

        socket.on('profilePicUpdated', (data: any) => {
             setUsers((prev: Chat[]) => prev.map((u: Chat) => u.email === data.email ? { ...u, avatarUrl: data.avatarUrl } : u));
             if (data.email === myEmail) setProfileImage(data.avatarUrl);
        });

        socket.on('sendMessageError', (err: any) => {
            console.error('sendMessageError from server:', err);
        });

        socket.on('changeGroupAvatarSuccess', (data: any) => {
            const { groupID, newAvatarUrl, groupAvatar } = data || {};
            const url = groupAvatar || newAvatarUrl;
            if(url) {
                setVisible((prev: Chat[]) => prev.map((i: Chat) => (i.group && String(i.groupID) === String(groupID)) ? {...i, groupAvatarUrl: url} : i));
                if(activeChatRef.current?.groupID === groupID) setActiveChat((prev: any) => ({...prev, groupAvatarUrl: url}));
            }
        });

        socket.on('mentionedInGroup', (data: any) => {
             setVisible((prev: Chat[]) => prev.map((item: Chat) => {
                 if (item.group && String(item.groupID) === String(data.groupID) && activeChatRef.current?.groupID !== data.groupID) {
                     return { ...item, hasMention: true };
                 }
                 return item;
             }));
        });

        socket.on('messageReadAck', (data: any) => {
             // Logic to clear unread counts and mark messages as read
             setVisible((prev: Chat[]) => prev.map((item: Chat) => {
                 const isGroupAck = data.groupID && item.group && String(item.groupID) === String(data.groupID);
                 const isPrivateAck = !item.group && (item.email === data.fromEmail || item.email === data.toEmail);
                 return (isGroupAck || isPrivateAck) ? { ...item, unreadCount: 0, hasMention: false } : item;
             }));
             
             // If active, mark loaded messages read
             if (activeChatRef.current) {
                 const ac = activeChatRef.current;
                 const isGroupAck = data.groupID && ac.group && String(ac.groupID) === String(data.groupID);
                 const isPrivateAck = !ac.group && (data.fromEmail === ac.email || data.toEmail === ac.email);
                 if (isGroupAck || isPrivateAck) setTextMessage((prev: Message[]) => prev.map((m: Message) => ({ ...m, read: true })));
             }
        });

        return () => {
            // Cleanup all listeners
            socket.off("users"); socket.off("groups"); socket.off("receiveMessage"); socket.off("sentMessage");
            socket.off("previousMessages"); socket.off("unreadMessageCount"); socket.off("typingUpdate");
            socket.off("profilePicUpdated"); socket.off("deleteGroupSuccess"); socket.off("changeGroupAvatarSuccess");
            socket.off("mentionedInGroup"); socket.off("messageReadAck");
            // ... add others
        };
    }, []);

    // --- Actions & Handlers ---

    // 1. Chat Switching
    const getMessages = async () => {
        if (!activeChat) return;
        const payload: {
            from: string | null;
            fromEmail: string | null;
            to: string;
            toEmail: string;
            token: string | null;
            groupID?: string;
        } = { 
            from: myUserID, 
            fromEmail: myEmail, 
            to: activeChat.userID, 
            toEmail: activeChat.email, 
            token 
        };
        if (activeChat.group && activeChat.groupID) payload.groupID = activeChat.groupID;
        const message = await getMessagesApi(payload);
        if (Array.isArray(message.messages)) {
            const normalized = message.messages.map((m: any) => ({
                id: m.id ?? m.messageid,
                groupID: m.groupID,
                content: m.content,
                fromEmail: m.from ?? m.fromEmail,
                toEmail: m.to ?? m.toEmail,
                timestamp: m.timestamp ?? m.createdAt,
                type: m.type ?? (m.from === myEmail ? 'sent' : 'received'),
                read: m.read ?? false,
                fromUserId: m.fromUserId ?? m.senderID,
                fromUsername: m.fromUsername ?? m.username,
                fromName: m.fromName,
                fromAvatar: m.fromAvatar,
            }));
            setTextMessage(normalized);
        }
    }

    useEffect(() => {
        if (!activeChat || !socketRef.current) return;
        setTextMessage([]);
        // Clear unread
        setVisible(prev => prev.map(item => {
            const matchGroup = activeChat.group && item.group && String(item.groupID) === String(activeChat.groupID);
            const matchUser = !activeChat.group && item.email === activeChat.email;
            return (matchGroup || matchUser) ? { ...item, unreadCount: 0, hasMention: false } : item;
        }));

        getMessages();
        
        return () => stopTypingEmit(activeChat); // Stop typing on switch
    }, [activeChat]);

    // 2. Typing Logic
    const stopTypingEmit = (chat: Chat) => {
        if (!socketRef.current || !chat) return;
        const payload = chat.group 
            ? { groupID: chat.groupID, fromUserId: myUserID, fromEmail: myEmail } 
            : { toUserId: chat.userID, toEmail: chat.email, fromUserId: myUserID, fromEmail: myEmail };
        socketRef.current.emit('typingStop', payload);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isTypingRef.current = false;
    };

    const handleTypingLocal = () => {
        if (!activeChat || !socketRef.current) return;
        const myName = users.find((u: Chat) => u.email === myEmail)?.username || myEmail;
        const payload = activeChat.group 
            ? { groupID: activeChat.groupID, fromUserId: myUserID, fromEmail: myEmail, fromUsername: myName }
            : { toUserId: activeChat.userID, toEmail: activeChat.email, fromUserId: myUserID, fromEmail: myEmail, fromUsername: myName };

        if (!isTypingRef.current) {
            socketRef.current.emit('typingStart', payload);
            isTypingRef.current = true;
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => stopTypingEmit(activeChat), 2000);
    };

    // 3. Message Sending
    const sendMessage = () => {
        const text = message.trim();
        if (!text || !activeChat) return;
        const socket = socketRef.current;
        const payload = {
            message: text,
            fromUserId: myUserID,
            toUserId: activeChat.userID,
            groupID: activeChat.group ? activeChat.groupID : null,
            toEmail: activeChat.email,
            fromEmail: myEmail,
            timestamp: new Date().toISOString(),
            type: 'sent',
        };

        // Log and guard: ensure socket exists and is connected
        try {
            console.log('Attempting to send message, socket present:', !!socket, 'socket.connected:', socket?.connected);
        } catch (e) {
            console.warn('Socket presence check failed', e && e.message);
        }

        // Handle Mention Logic
        if (activeChat.group && text.split(" ").pop().startsWith("@")) {
            const mentionText = text.split(" ").pop().substring(1).toLowerCase();
            const members = groupMembersMap[activeChat.groupID] || [];
            const targeted = members.find((m: GroupMember) => m.email !== myEmail && (m.name || m.username || '').toLowerCase() === mentionText);
            if (targeted) {
                 try { socket?.emit('mentionUser', { 
                     groupID: activeChat.groupID, mentionedEmail: targeted.email, mentionedID: targeted.id, 
                     fromEmail: myEmail, fromID: myUserID, messageContent: text 
                 }); } catch (e) { console.warn('mentionUser emit failed', e && e.message); }
            }
        }

        if (!socket) {
            console.error('No socket available — message not sent');
            return;
        }

        if (!socket.connected) {
            console.warn('Socket not connected; attempting to connect and queue send');
            try {
                socket.connect();
            } catch (e) { console.warn('socket.connect() threw', e && e.message); }
            // emit after connect
            socket.once('connect', () => {
                try {
                    console.log('Socket connected (after reconnect) — emitting sendMessage', payload);
                    socket.emit('sendMessage', payload);
                } catch (e) {
                    console.error('sendMessage emit failed after reconnect', e && e.message);
                }
            });
        } else {
            try {
                console.log('Emitting sendMessage', payload);
                socket.emit('sendMessage', payload);
            } catch (e) {
                console.error('sendMessage emit failed', e && e.message);
            }
        }

        setMessage('');
    };

    // 4. Group & User Actions
    const handleLogOut = () => { localStorage.removeItem('token'); window.location.href = '/login'; };
    
    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return alert('Name required');
        try {
            await createGroupApi({ groupName: newGroupName, createdBy: myUserID || '', token: token || '' });
            toggleModal('createGroup', false);
            setNewGroupName('');
        } catch (err) {
            alert('Failed to create group'); 
            console.error('Create group error:', err);
        }
    };

    const addMembers = async () => {
        if (!selectedToAdd || !selectedToAdd.length || !activeChat?.group) return;
        await Promise.all(selectedToAdd.map(async (email: string) => {
            const u = users.find((usr: Chat) => usr.email === email);
            await addGroupMemberApi({ groupID: activeChat.groupID || '', memberEmail: email, memberID: u?.userID || '', requesterID: myUserID || '', token: token || '' });
        }));
        toggleModal('addMembers', false);
        setSelectedToAdd(null);
    };

    const changeRole = async (member: GroupMember, role: string) => {
        if (!activeChat?.groupID) return;
        await changeGroupMemberRole({ groupID: activeChat.groupID, memberID: (member as any).id || member.userID, newRole: role, requesterID: myUserID || '', token: token || '' });
    };

    const removeMember = async (member: GroupMember) => {
        if (!activeChat?.groupID) return;
        await removeGroupMemberApi({ groupID: activeChat.groupID, memberID: (member as any).id || member.userID, requesterID: myUserID || '', token: token || '' });
    };

    const leaveGroup = async () => {
        if (!activeChat?.groupID) return;
        await leaveGroupApi({ groupID: activeChat.groupID, requesterID: myUserID || '', token: token || '' });
    };

    const deleteGroup = async () => {
        if (!activeChat?.groupID) return;
        if(confirm("Confirm deletion?")) {
            const deleteResp = await deleteGroupApi({ groupID: activeChat.groupID, requesterId: myUserID || '', token: token || '' });
            if (deleteResp && deleteResp.message) {
                setGroupMembersMap((prev: Record<string, GroupMember[]>) => { const n = {...prev}; delete n[activeChat.groupID || '']; return n; });
                setVisible((prev: Chat[]) => prev.filter((i: Chat) => !(i.group && String(i.groupID) === String(activeChat.groupID))));
                if (activeChatRef.current?.groupID === activeChat.groupID) setActiveChat(null);
            }
        }
    };

    const renameGroupSubmit = async () => {
        if (!activeChat?.groupID) return;
        const name = (newGroupName || '').trim();
        if (!name) return alert('Please enter a new group name');
        if (activeChat && activeChat.group) {
            await renameGroupApi({ groupID: activeChat.groupID, newGroupName: name, requesterID: myUserID || '', token: token || '' });
            // Optimistically update UI
            setVisible((prev: Chat[]) => (prev || []).map((item: Chat) => (item && item.group && String(item.groupID) === String(activeChat.groupID)) ? { ...item, username: name } : item));
            setActiveChat((prev: Chat | null) => (prev && prev.groupID && String(prev.groupID) === String(activeChat.groupID)) ? { ...prev, username: name } : prev);
        } else {
            alert('Unable to rename group');
        }
        setNewGroupName('');
        toggleModal('renameGroup', false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGroup: boolean) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = async () => {
            if (reader.result && typeof reader.result === 'string' && activeChat) {
                // Convert data URL to File
                const response = await fetch(reader.result);
                const blob = await response.blob();
                const imageFile = new File([blob], file.name, { type: file.type });
                
                if (isGroup && activeChat.groupID) {
                    const uploadLink = await uploadToCloudinary(imageFile, '/group_avatars');
                    await changeGroupAvatarApi({ groupID: activeChat.groupID, imageUrl: uploadLink, requesterID: myUserID || '', token: token || '' });
                } else {
                    const uploadLink = await uploadToCloudinary(imageFile, '/avatars');
                    await changeProfilePicApi({ imageUrl: uploadLink, requesterID: myUserID || '', token: token || '' });
                }
            }
        };
        reader.readAsDataURL(file);
    };

    // Helper to toggle modals
    const toggleModal = (name: string, value: boolean) => setModals((prev: any) => ({ ...prev, [name]: value }));

    // Derived Logic
    const filteredMessages = activeChat ? (activeChat.group 
        ? textMessage.filter((m: Message) => m.groupID === activeChat.groupID)
        : textMessage.filter((m: Message) => {
            const from = m.fromEmail || m.from;
            const to = m.toEmail || m.to;
            return (from === myEmail && to === activeChat.email) || (from === activeChat.email && to === myEmail);
        })
    ) : [];

    const myRole = (activeChat?.group && groupMembersMap[activeChat.groupID]?.find(m => m.email === myEmail)?.role) || null;
    
    const typingText = (() => {
        if (!activeChat) return null;
        const key = activeChat.group ? String(activeChat.groupID) : (activeChat.userID || activeChat.email);
        const list = typingMap[key] || [];
        if (!list.length) return null;
        return list.length === 1 ? `${list[0].username} is typing...` : `${list.length} people are typing...`;
    })();

    return {
        state: {
            message, textMessage: filteredMessages, users, groupMembersMap, visible, activeChat, profileImage,
            modals, selectedToAdd, newGroupName, forwardingMessage, myEmail, myUserID, myRole, typingText
        },
        refs: { fileInputRef, textpanel: useRef(null) },
        actions: {
            setMessage, setActiveChat, handleLogOut, createGroup, addMembers, changeRole, removeMember,
            leaveGroup, deleteGroup, handleAvatarUpload, toggleModal, sendMessage, handleTypingLocal,
            setNewGroupName, setSelectedToAdd, setForwardingMessage, renameGroupSubmit
        }
    };
};