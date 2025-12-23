/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from 'react';
import useChatSocket from './useChatSocket'; // Assuming this exists based on your code
import { 
    createGroupApi, 
    addGroupMemberApi, 
    removeGroupMemberApi,
    leaveGroupApi,
    deleteGroupApi,
} from '@/Services/api';

export const useChatLogic = () => {
    // --- State ---
    const [message, setMessage] = useState('');
    const [textMessage, setTextMessage] = useState([]);
    const [users, setUsers] = useState([]);
    const [groupMembersMap, setGroupMembersMap] = useState({});
    const [typingMap, setTypingMap] = useState({});
    const [visible, setVisible] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    
    // --- Modal States ---
    const [modals, setModals] = useState({
        membersList: false,
        addMembers: false,
        createGroup: false,
        forward: false,
        roleDropdown: null, // Stores email of user to show dropdown for
    });
    
    // --- Selection/Input States ---
    const [selectedToAdd, setSelectedToAdd] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [forwardingMessage, setForwardingMessage] = useState(null);

    // --- Refs ---
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const activeChatRef = useRef(activeChat);
    const fileInputRef = useRef(null);

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
        const handleUsers = (usersList) => {
            const processed = (usersList || []).map((user) => ({
                username: user.username ?? user.email,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                userID: user.id ?? user.email,
                online: !!user.online,
                self: user.id === myUserID,
                group: false,
            }));

            processed.sort((a, b) => {
                if (a.self) return -1;
                if (b.self) return 1;
                if (a.online !== b.online) return a.online ? -1 : 1;
                return (a.username || '').localeCompare(b.username || '');
            });

            setUsers(processed);
            
            // Set own avatar
            const me = processed.find(u => u.email === myEmail);
            if (me && me.avatarUrl) setProfileImage(me.avatarUrl);

            // Merge with existing groups to prevent flashing
            setVisible(prev => {
                const existingGroups = (prev || []).filter(item => item && item.group);
                return [...processed.filter(u => !u.self), ...existingGroups];
            });

            // Update active chat reference if user details changed
            const currentActive = activeChatRef.current;
            if (currentActive && !currentActive.group) {
                const updated = processed.find(u => u.userID === currentActive.userID);
                if (updated) setActiveChat(updated);
                else setActiveChat(null);
            }
        };

        // 2. Group Management
        const handleGroups = (groupsList) => {
            const processed = groupsList.map((group) => ({
                username: group.groupName,
                groupID: group.groupid,
                userID: group.groupid, 
                description: group.description || '',
                CreatorID: group.CreatorID,
                groupAvatarUrl: group.groupAvatar || group.groupAvatarUrl || null,
                group: true,
            }));

            setVisible((prev) => {
                const nonGroupItems = (prev || []).filter(item => !item.group);
                return [...nonGroupItems, ...processed];
            });

            if (Array.isArray(groupsList)) {
                setGroupMembersMap(prev => {
                    const next = { ...(prev || {}) };
                    for (const g of groupsList) {
                        if (g && g.groupid) {
                            const membersArr = (g.members || []).map(m => ({
                                id: m.id,
                                name: m.name || m.username || m.email,
                                email: m.email,
                                role: m.role
                            }));

                            // Owner should always be first, others alphabetical by name
                            membersArr.sort((a, b) => {
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
                const updated = processed.find(g => g.groupID === currentActive.groupID);
                if (updated) setActiveChat(updated);
                else setActiveChat(null);
            }
        };

        // 3. Message Handling
        const handleReceive = (data) => {
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
                    setTextMessage((prev) => [...prev, msgObj]);
                } else {
                    incrementUnread(data.groupID, true);
                }
            } else {
                if (ac && (msgObj.toEmail === ac.email || msgObj.fromEmail === ac.email)) {
                    setTextMessage((prev) => [...prev, msgObj]);
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

        const handleSent = (data) => {
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
                setTextMessage((prev) => [...prev, msgObj]);
                stopTypingEmit(ac);
            }
        };

        const handlePreviousMessages = (data) => {
            if (Array.isArray(data)) {
                const normalized = data.map(m => ({
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
        };

        // ... Register Listeners
        socket.on("users", handleUsers);
        socket.on("groups", handleGroups);
        socket.on('receiveMessage', handleReceive);
        socket.on('sentMessage', handleSent);
        socket.on('previousMessages', handlePreviousMessages);
        
        // Helper to update unread counts
        const incrementUnread = (id, isGroup) => {
            setVisible(prev => prev.map(item => {
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
        socket.on("unreadMessageCount", (data) => {
            setVisible(prev => prev.map(u => u.userID === data.userID ? { ...u, unreadCount: data.count } : u));
        });

        socket.on('typingUpdate', (data) => {
            if (!data) return;
            const key = data.groupID ? String(data.groupID) : String(data.chatKey);
            setTypingMap(prev => ({ ...prev, [key]: (Array.isArray(data.typingUsers) ? data.typingUsers : []) }));
        });

        socket.on('profilePicUpdated', (data) => {
             setUsers((prev) => prev.map(u => u.email === data.email ? { ...u, avatarUrl: data.avatarUrl } : u));
             if (data.email === myEmail) setProfileImage(data.avatarUrl);
        });

        socket.on('changeGroupAvatarSuccess', (data) => {
            const { groupID, newAvatarUrl, groupAvatar } = data || {};
            const url = groupAvatar || newAvatarUrl;
            if(url) {
                setVisible(prev => prev.map(i => (i.group && String(i.groupID) === String(groupID)) ? {...i, groupAvatarUrl: url} : i));
                if(activeChatRef.current?.groupID === groupID) setActiveChat(prev => ({...prev, groupAvatarUrl: url}));
            }
        });

        socket.on('mentionedInGroup', (data) => {
             setVisible(prev => prev.map(item => {
                 if (item.group && String(item.groupID) === String(data.groupID) && activeChatRef.current?.groupID !== data.groupID) {
                     return { ...item, hasMention: true };
                 }
                 return item;
             }));
        });

        socket.on('messageReadAck', (data) => {
             // Logic to clear unread counts and mark messages as read
             setVisible(prev => prev.map(item => {
                 const isGroupAck = data.groupID && item.group && String(item.groupID) === String(data.groupID);
                 const isPrivateAck = !item.group && (item.email === data.fromEmail || item.email === data.toEmail);
                 return (isGroupAck || isPrivateAck) ? { ...item, unreadCount: 0, hasMention: false } : item;
             }));
             
             // If active, mark loaded messages read
             if (activeChatRef.current) {
                 const ac = activeChatRef.current;
                 const isGroupAck = data.groupID && ac.group && String(ac.groupID) === String(data.groupID);
                 const isPrivateAck = !ac.group && (data.fromEmail === ac.email || data.toEmail === ac.email);
                 if (isGroupAck || isPrivateAck) setTextMessage(prev => prev.map(m => ({ ...m, read: true })));
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
    useEffect(() => {
        if (!activeChat || !socketRef.current) return;
        setTextMessage([]);
        // Clear unread
        setVisible(prev => prev.map(item => {
            const matchGroup = activeChat.group && item.group && String(item.groupID) === String(activeChat.groupID);
            const matchUser = !activeChat.group && item.email === activeChat.email;
            return (matchGroup || matchUser) ? { ...item, unreadCount: 0, hasMention: false } : item;
        }));
        
        const payload = { from: myUserID, fromEmail: myEmail, to: activeChat.userID, toEmail: activeChat.email };
        if (activeChat.group) payload.groupID = activeChat.groupID;
        socketRef.current.emit('getMessages', payload);
        
        return () => stopTypingEmit(activeChat); // Stop typing on switch
    }, [activeChat]);

    // 2. Typing Logic
    const stopTypingEmit = (chat) => {
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
        const myName = users.find(u => u.email === myEmail)?.username || myEmail;
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

        // Handle Mention Logic
        if (activeChat.group && text.split(" ").pop().startsWith("@")) {
            const mentionText = text.split(" ").pop().substring(1).toLowerCase();
            const members = groupMembersMap[activeChat.groupID] || [];
            const targeted = members.find(m => m.email !== myEmail && (m.name || m.username || '').toLowerCase() === mentionText);
            if (targeted) {
                 socketRef.current.emit('mentionUser', { 
                     groupID: activeChat.groupID, mentionedEmail: targeted.email, mentionedID: targeted.id, 
                     fromEmail: myEmail, fromID: myUserID, messageContent: text 
                 });
            }
        }

        socketRef.current.emit('sendMessage', payload);
        setMessage('');
    };

    // 4. Group & User Actions
    const handleLogOut = () => { localStorage.removeItem('token'); window.location.href = '/login'; };
    
    const createGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return alert('Name required');
        try {
            await createGroupApi({ groupName: newGroupName, createdBy: myUserID, token });
            toggleModal('createGroup', false);
            setNewGroupName('');
        } catch (err) {
            alert('Failed to create group'); 
            console.error('Create group error:', err);
        }
    };

    const addMembers = async () => {
        if (!selectedToAdd.length || !activeChat?.group) return;
        await Promise.all(selectedToAdd.map(async email => {
            const u = users.find(usr => usr.email === email);
            await addGroupMemberApi({ groupID: activeChat.groupID, memberEmail: email, memberID: u?.userID, requesterID: myUserID, token });
        }));
        toggleModal('addMembers', false);
        setSelectedToAdd([]);
    };

    const changeRole = (member, role) => {
        socketRef.current.emit('changeMemberRole', { groupID: activeChat.groupID, memberEmail: member.email, memberID: member.id, newRole: role });
    };

    const removeMember = async (member) => {
        await removeGroupMemberApi({ groupID: activeChat.groupID, memberID: member.id, requesterID: myUserID, token });
    };

    const leaveGroup = async () => {
        await leaveGroupApi({ groupID: activeChat.groupID, requesterID: myUserID, token });
    };

    const deleteGroup = async () => {
        if(confirm("Confirm deletion?")) {
            const deleteResp = await deleteGroupApi({ groupID: activeChat.groupID, requesterId: myUserID, token });
            if (deleteResp && deleteResp.message) {
                setGroupMembersMap(prev => { const n = {...prev}; delete n[activeChat.groupID]; return n; });
                setVisible(prev => prev.filter(i => !(i.group && String(i.groupID) === String(activeChat.groupID))));
                if (activeChatRef.current?.groupID === activeChat.groupID) setActiveChat(null);
            }
        }
    };
    
    const renameGroup = () => {
        const name = prompt("New Name:");
        if(name) socketRef.current.emit('renameGroup', { groupID: activeChat.groupID, newGroupName: name, requestedByEmail: myEmail, requestedByID: myUserID });
    };

    const renameGroupSubmit = () => {
        const name = (newGroupName || '').trim();
        if (!name) return alert('Please enter a new group name');
        const socket = socketRef.current;
        if (socket && activeChat && activeChat.group) {
            socket.emit('renameGroup', { groupID: activeChat.groupID, newGroupName: name, requestedByEmail: myEmail, requestedByID: myUserID });
            // Optimistically update UI
            setVisible(prev => (prev || []).map(item => (item && item.group && String(item.groupID) === String(activeChat.groupID)) ? { ...item, username: name } : item));
            setActiveChat(prev => (prev && prev.groupID && String(prev.groupID) === String(activeChat.groupID)) ? { ...prev, username: name } : prev);
        } else {
            alert('Unable to rename group');
        }
        setNewGroupName('');
        toggleModal('renameGroup', false);
    };

    const handleAvatarUpload = (e, isGroup) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (isGroup) {
                socketRef.current.emit("changeGroupAvatar", { imageData: reader.result, groupID: activeChat.groupID, requestedByEmail: myEmail, requestedByID: myUserID });
            } else {
                setProfileImage(reader.result);
                socketRef.current.emit("changeProfilePic", { imageData: reader.result, email: myEmail });
            }
        };
        reader.readAsDataURL(file);
    };

    // Helper to toggle modals
    const toggleModal = (name, value) => setModals(prev => ({ ...prev, [name]: value }));

    // Derived Logic
    const filteredMessages = activeChat ? (activeChat.group 
        ? textMessage.filter(m => m.groupID === activeChat.groupID)
        : textMessage.filter(m => {
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
            leaveGroup, deleteGroup, renameGroup, handleAvatarUpload, toggleModal, sendMessage, handleTypingLocal,
            setNewGroupName, setSelectedToAdd, setForwardingMessage, renameGroupSubmit
        }
    };
};