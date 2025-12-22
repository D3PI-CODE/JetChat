import React, { useEffect, useState, useRef } from 'react';
import './chat.css';
import useChatSocket from '../hooks/useChatSocket';
import Textbubble from '../components/Textbubble';
import { MdGroupAdd, MdGroupRemove, MdExitToApp, MdOutlineDeleteOutline, MdDriveFileRenameOutline } from "react-icons/md";
import { IoIosClose } from "react-icons/io";
import { SelectValueText } from '@ark-ui/react';
import { createGroupApi, addGroupMemberApi } from '@/Services/api';

export default function Chat() {
    // Theme: use #111818 as the primary panel/background color across the chat UI
    const [message, setMessage] = useState('');
    // state for previous messages are split into sent/received
    const [textMessage, setTextMessage] = useState([]);
    const [users, setUsers] = useState([]);
    const [groupMembersMap, setGroupMembersMap] = useState({});
    const [typingMap, setTypingMap] = useState({}); // key -> array of {id, username}
    
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const [visible, setVisible] = useState(users.filter((u) => !u.self));
    const [activeChat, setActiveChat] = useState(null);
    const textpanel = useRef(null);
    const activeChatRef = useRef(activeChat);
    const [membersList, setMembersList] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState([]);
    const [openRoleDropdownFor, setOpenRoleDropdownFor] = useState(null);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = useRef(null);
    const myEmail = localStorage.getItem('email');
    const myUserID = localStorage.getItem('userId');
    const resolvedUserID = myUserID || myEmail || null;
    const token = localStorage.getItem('token');
    const socketRef = useChatSocket({ token, userID: resolvedUserID, email: myEmail });

    const LogOut = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    const imageUploader = () => {
        // open native file picker
        if (fileInputRef.current) fileInputRef.current.click();
    }

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            // save data URL in state (variable), can be uploaded to server later
            setProfileImage(reader.result);
            if (socketRef.current && myEmail) {
                socketRef.current.emit("changeProfilePic", { imageData: reader.result, email: myEmail });
            }
        };
        reader.readAsDataURL(file);
    }

    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    useEffect(() => {
        const socket = socketRef.current;
        const usrMangement = (usersList) => {
            const processed = (usersList || []).map((user) => ({
                username: user.username ?? user.email,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                userID: user.id ?? user.email,
                online: !!user.online,
                self: user.id === myUserID,
                group:false,
            }));

            processed.sort((a, b) => {
                if (a.self && !b.self) return -1;
                if (!a.self && b.self) return 1;
                if (a.online && !b.online) return -1;
                if (!a.online && b.online) return 1;
                if ((a.username || '') < (b.username || '')) return -1;
                return (a.username || '') > (b.username || '') ? 1 : 0;
            });

            setUsers(processed);
            // if current user has an avatar provided by server, use it
            const me = processed.find(u => u.email === myEmail);
            if (me && me.avatarUrl) setProfileImage(me.avatarUrl);
            // Preserve any existing group entries in the visible list so users updates
            // don't remove groups (keeps behavior consistent and avoids flashing)
            setVisible(prev => {
                const nonGroupUsers = processed.filter((u) => !u.self);
                const existingGroups = (prev || []).filter(item => item && item.group);
                return [...nonGroupUsers, ...existingGroups];
            });
            console.log('Connected users:', processed);

            const currentActive = activeChatRef.current;
            if (currentActive) {
                const updated = processed.find(u => (u.email && currentActive.email && u.email === currentActive.email) || (u.userID && currentActive.userID && u.userID === currentActive.userID));
                if (updated) {
                    // replace activeChat so fields stay current
                    setActiveChat(updated);
                    activeChatRef.current = updated;
                } else {
                    // if the user disappeared (logged out), clear active chat
                    setActiveChat(null);
                    activeChatRef.current = null;
                }
            }
        };

        const grpMangement = (groupsList) => {
            const processed = groupsList.map((group) => ({
                username: group.groupName,
                groupID: group.groupid,
                userID: group.groupid, // use same key as users so list rendering works
                description: group.description || '',
                CreatorID: group.CreatorID,
                groupAvatarUrl: group.groupAvatar || group.groupAvatarUrl || null,
                group:true,
            }));
            console.log('Connected groups:', processed);
            // Replace any existing group entries in `visible` with the latest processed list
            setVisible((prev) => {
                const nonGroupItems = (prev || []).filter(item => !item.group);
                return [...nonGroupItems, ...processed];
            });

            // Store members for each group (if provided in payload)
            if (Array.isArray(groupsList)) {
                setGroupMembersMap(prev => {
                    const next = { ...(prev || {}) };
                    for (const g of groupsList) {
                        if (g && g.groupid) {
                            next[g.groupid] = (g.members || []).map(m => ({ id: m.id, name: m.name || m.username || m.email, email: m.email, role: m.role }));
                        }
                    }
                    return next;
                });
            }

            const currentActive = activeChatRef.current;
            if (currentActive) {
                const updated = processed.find(g => (g.groupID && currentActive.groupID && g.groupID === currentActive.groupID));
                if (updated) {
                    // replace activeChat so fields stay current
                    setActiveChat(updated);
                    activeChatRef.current = updated;
                } else {
                    // if the user disappeared (logged out), clear active chat
                    setActiveChat(null);
                    activeChatRef.current = null;
                }
            }

        };

        socket.on("users", usrMangement);
        socket.on("groups", grpMangement);

        socket.on("unreadMessageCount", (data) => {
            console.log(data.count)
            setVisible((prev) => prev.map(u => {
                if (u.userID === data.userID) {
                    return { ...u, unreadCount: data.count };
                }
                return u;
            }));
            console.log("unreadMessageCount data received: ", data);
            console.log("Updated users list: ", visible);
        });

        // Typing indicator updates from server
        const handleTypingUpdate = (data) => {
            if (!data) return;
            // group update
            if (data.groupID) {
                setTypingMap(prev => ({ ...(prev || {}), [String(data.groupID)]: (Array.isArray(data.typingUsers) ? data.typingUsers : []) }));
                return;
            }
            // private chat: data.chatKey identifies the sender
            if (data.chatKey) {
                const key = String(data.chatKey);
                setTypingMap(prev => ({ ...(prev || {}), [key]: (Array.isArray(data.typingUsers) ? data.typingUsers : []) }));
            }
        };
        socket.on('typingUpdate', handleTypingUpdate);

        // When server confirms a profile picture update, update local state immediately
        const handleProfilePicUpdated = (data) => {
            if (!data || !data.email) return;
            setUsers((prev) => prev.map(u => u.email === data.email ? { ...u, avatarUrl: data.avatarUrl } : u));
            if (data.email === myEmail && data.avatarUrl) {
                setProfileImage(data.avatarUrl);
            }
        };
        socket.on('profilePicUpdated', handleProfilePicUpdated);

        const handleChangeRoleError = (err) => {
            console.error('changeMemberRole error:', err);
            if (err && err.error) alert(`Role change failed: ${err.error}`);
            else alert('Role change failed');
        };
        const handleChangeRoleSuccess = (data) => {
            console.log('changeMemberRole success:', data);
        };

        // Add/remove/delete group feedback handlers
        const handleAddMemberError = (err) => { if (err && err.error) alert(`Add member failed: ${err.error}`); else alert('Add member failed'); };
        const handleAddMemberSuccess = (data) => { console.log('addGroupMember success', data); };
        const handleRemoveMemberError = (err) => { if (err && err.error) alert(`Remove member failed: ${err.error}`); else alert('Remove member failed'); };
        const handleRemoveMemberSuccess = (data) => { console.log('removeGroupMember success', data); };
        const handleDeleteGroupError = (err) => { if (err && err.error) alert(`Delete group failed: ${err.error}`); else alert('Delete group failed'); };
        const handleDeleteGroupSuccess = (data) => {
            console.log('deleteGroup success', data);
            try {
                const gid = data && data.groupID;
                if (gid) {
                    // remove members map entry
                    setGroupMembersMap(prev => {
                        const next = { ...(prev || {}) };
                        delete next[gid];
                        return next;
                    });
                    // remove from visible list
                    setVisible(prev => (prev || []).filter(item => !(item.group && item.groupID && String(item.groupID) === String(gid))));
                    // if active chat is the deleted group, clear it
                    setActiveChat(prev => (prev && prev.groupID && String(prev.groupID) === String(gid)) ? null : prev);
                }
            } finally {
                setMembersList(false);
            }
        };

        const handleRenameGroupSuccess = (data) => {
            console.log('renameGroup success', data);
        };
        const handleRenameGroupError = (err) => {
            console.error('renameGroup error:', err);
            if (err && err.error) alert(`Rename group failed: ${err.error}`);
            else alert('Rename group failed');
        };

        const handleChangeGroupAvatarSuccess = (data) => {
            console.log('changeGroupAvatar success', data);
            // backend sends { groupID, groupAvatar }
            const { groupID, groupAvatar, newAvatarUrl } = data || {};
            const url = groupAvatar || newAvatarUrl || null;
            if (!url) return;
            setVisible((prev) => (prev || []).map(item => (item && item.group && item.groupID && String(item.groupID) === String(groupID)) ? { ...item, groupAvatarUrl: url } : item));
            // also update activeChat if it's the same group so header updates immediately
            setActiveChat(prev => (prev && prev.groupID && String(prev.groupID) === String(groupID)) ? { ...prev, groupAvatarUrl: url } : prev);
        };
        const handleChangeGroupAvatarError = (err) => {
            console.error('changeGroupAvatar error:', err);
            if (err && err.error) alert(`Change group avatar failed: ${err.error}`);
            else alert('Change group avatar failed');
        };

        const handleMention = (data) => {
            const groupID = data.groupID;

            // mark the conversation in the list with a mention badge
            setVisible(prev => (prev || []).map(item => {
                if (!item) return item;
                if (item.group && String(item.groupID) === String(groupID)) {
                    const ac = activeChatRef.current;
                    // if this group is currently open, do not show the badge
                    if (ac && ac.group && String(ac.groupID) === String(groupID)) {
                        return { ...item, hasMention: false };
                    }
                    return { ...item, hasMention: true };
                }
                return item;
            }));
        }

        socket.on('changeGroupAvatarError', handleChangeGroupAvatarError);
        socket.on('changeGroupAvatarSuccess', handleChangeGroupAvatarSuccess);
        socket.on('renameGroupSuccess', handleRenameGroupSuccess);
        socket.on('renameGroupError', handleRenameGroupError);
        socket.on('addGroupMemberError', handleAddMemberError);
        socket.on('addGroupMemberSuccess', handleAddMemberSuccess);
        socket.on('removeGroupMemberError', handleRemoveMemberError);
        socket.on('removeGroupMemberSuccess', handleRemoveMemberSuccess);
        socket.on('deleteGroupError', handleDeleteGroupError);
        socket.on('deleteGroupSuccess', handleDeleteGroupSuccess);
        socket.on('changeMemberRoleError', handleChangeRoleError);
        socket.on('changeMemberRoleSuccess', handleChangeRoleSuccess);
        socket.on('mentionedInGroup', handleMention)

        // When the server sends previous messages (merged payload)
        socket.on('previousMessages', (data) => {
            if (Array.isArray(data)) {
                const normalized = data.map(m => ({
                    id: m.id ?? m.messageid ?? null,
                    groupID: m.groupID || null,
                    content: m.content ?? (typeof m === 'string' ? m : ''),
                    fromEmail: m.from ?? m.fromEmail ?? null,
                    toEmail: m.to ?? m.toEmail ?? null,
                    timestamp: m.timestamp ?? m.createdAt ?? null,
                    type: m.type ?? (m.from === myEmail ? 'sent' : 'received'),
                    read: m.read ?? false,
                    fromUserId: m.fromUserId ?? m.senderID ?? null,
                    fromUsername: m.fromUsername ?? m.username ?? null,
                    fromName: m.fromName ?? null,
                    fromAvatar: m.fromAvatar ?? null,
                }));
                console.log("previous msgs recieved: ", normalized)
                setTextMessage(normalized);
            } else if (data && data.error) {
                console.error('previousMessages error:', data.error);
            }
        });


        socket.on('previousMessagesError', (err) => {
            console.error('previousMessagesError:', err);
        });


        const handleReceive = (data) => {
            // data is expected to be { message, fromEmail, toEmail }
            const msgObjRecieved = {
                id: data.id,
                content: data.content,
                fromEmail: data.fromEmail,
                toEmail: data.toEmail,
                groupID: data.groupID || null,
                timestamp: data.timestamp,
                type: "received",
                read: false,
                fromUserId: data.fromUserId ?? data.fromId ?? data.senderID ?? null,
                fromUsername: data.fromUsername ?? data.username ?? null,
                fromName: data.fromName ?? null,
                fromAvatar: data.fromAvatar ?? null,
            };
            console.log('Received message:', msgObjRecieved);
            const ac = activeChatRef.current;
            if (data.groupID) {
                // Group message: if this group is active, append to messages, otherwise increment unread
                if (ac && ac.group && String(ac.groupID) === String(data.groupID)) {
                    setTextMessage((prev) => [...prev, msgObjRecieved]);
                    // For group messages we do not auto-emit a markAsRead ack here
                } else {
                    // increment unreadCount for that group in conversation list
                    setVisible(prev => (prev || []).map(item => {
                        if (item && item.group && String(item.groupID) === String(data.groupID)) {
                            const current = item.unreadCount || 0;
                            return { ...item, unreadCount: current + 1 };
                        }
                        return item;
                    }));
                }
            } else {
                // 1-1 message handling
                if (ac && (msgObjRecieved.toEmail === ac.email || msgObjRecieved.fromEmail === ac.email )) {
                    setTextMessage((prev) => [...prev, msgObjRecieved]);
                    socketRef.current.emit('markAsRead', { id: msgObjRecieved.id, fromEmail: msgObjRecieved.fromEmail, toEmail: msgObjRecieved.toEmail, toUserId: myUserID, fromUserId: ac.userID  });
                } else {
                    // not the active private chat — increment unread on the matching visible item
                    setVisible(prev => (prev || []).map(item => {
                        if (!item) return item;
                        if (!item.group) {
                            const convoEmail = item.email;
                            if (convoEmail && (convoEmail === msgObjRecieved.fromEmail || convoEmail === msgObjRecieved.toEmail)) {
                                const current = item.unreadCount || 0;
                                return { ...item, unreadCount: current + 1 };
                            }
                        }
                        return item;
                    }));
                }
            }
        };

        // stop typing for incoming messages from others (handled above via handleTypingUpdate)

        const handleSent = (data) => {
            
            const msgObjSent = {
                id: data.id,
                content: data.content,
                fromEmail: data.fromEmail,
                toEmail: data.toEmail,
                timestamp: data.timestamp,
                groupID: data.groupID || null,
                type: "sent",
                read: false,
                fromUserId: data.fromUserId ?? data.fromId ?? data.senderID ?? null,
                fromUsername: data.fromUsername ?? data.username ?? null,
                fromName: data.fromName ?? null,
                fromAvatar: data.fromAvatar ?? null,
            };

            const ac = activeChatRef.current;
            if (!ac) return;
            // append for 1-1 chats by email match, or for group chats by groupID
            if ((msgObjSent.toEmail && (msgObjSent.toEmail === ac.email || msgObjSent.fromEmail === ac.email)) || (ac.group && msgObjSent.groupID && ac.groupID && String(msgObjSent.groupID) === String(ac.groupID))) {
                setTextMessage((prev) => [...prev, msgObjSent]);
                // on send, signal stopTyping for this chat so indicator clears immediately
                try {
                    const sock = socketRef.current;
                    if (sock) {
                        const payload = ac.group ? { groupID: ac.groupID, fromUserId: myUserID, fromEmail: myEmail, fromUsername: users.find(u=>u.email===myEmail)?.username || myEmail } : { toUserId: ac.userID, toEmail: ac.email, fromUserId: myUserID, fromEmail: myEmail, fromUsername: users.find(u=>u.email===myEmail)?.username || myEmail };
                        sock.emit('typingStop', payload);
                        if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; isTypingRef.current = false; }
                    }
                } catch (e) {
                    console.error('Error emitting typingStop after send:', e);
                }
            }
        }

    socket.on('receiveMessage', handleReceive);
    socket.on('sentMessage', handleSent);
    
        socket.on('connect', () => console.log('socket connected', socket.id));
        socket.on('disconnect', (reason) => console.log('socket disconnected', reason)); 
        return () => {
            socket.off('receiveMessage', handleReceive);
            socket.off('sentMessage', handleSent);
            socket.off('previousMessages');
            socket.off('previousMessagesError');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('users', usrMangement);
            socket.off('groups', grpMangement);
            socket.off('profilePicUpdated', handleProfilePicUpdated);
            socket.off('changeMemberRoleError', handleChangeRoleError);
            socket.off('changeMemberRoleSuccess', handleChangeRoleSuccess);
            socket.off('addGroupMemberError', handleAddMemberError);
            socket.off('addGroupMemberSuccess', handleAddMemberSuccess);
            socket.off('removeGroupMemberError', handleRemoveMemberError);
            socket.off('removeGroupMemberSuccess', handleRemoveMemberSuccess);
            socket.off('deleteGroupError', handleDeleteGroupError);
            socket.off('deleteGroupSuccess', handleDeleteGroupSuccess);
            socket.off('typingUpdate', handleTypingUpdate);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When activeChat changes, request previous messages from the server
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (!activeChat || !activeChat.username) return;
        // clear current lists when switching chats
        setTextMessage([]);
        // clear unread count for the newly active chat in the conversation list
        setVisible(prev => (prev || []).map(item => {
            if (!item) return item;
            if (activeChat.group && item.group && String(item.groupID) === String(activeChat.groupID)) return { ...item, unreadCount: 0, hasMention: false };
            if (!activeChat.group && item.email && item.email === activeChat.email) return { ...item, unreadCount: 0, hasMention: false };
            return item;
        }));
        // request full conversation. If activeChat is a group, include groupID
        const payload = { from: myUserID, fromEmail: myEmail, to: activeChat.userID, toEmail: activeChat.email };
        if (activeChat.group) payload.groupID = activeChat.groupID;
        socket.emit('getMessages', payload);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChat]);

    // Clean up typing indicator when component unmounts or activeChat changes
    useEffect(() => {
        return () => {
            try {
                const sock = socketRef;
                const ac = activeChatRef.current;
                if (sock && ac) {
                    const payload = ac.group ? { groupID: ac.groupID, fromUserId: myUserID, fromEmail: myEmail, fromUsername: users.find(u=>u.email===myEmail)?.username || myEmail } : { toUserId: ac.userID, toEmail: ac.email, fromUserId: myUserID, fromEmail: myEmail, fromUsername: users.find(u=>u.email===myEmail)?.username || myEmail };
                    sock.emit('typingStop', payload);
                }
            } catch (err) { console.warn('Error emitting typingStop on unmount:', err); }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (textpanel.current) {
          textpanel.current.scrollTop = textpanel.current.scrollHeight;
        }
        socketRef.current.on('messageReadAck', (data) => {
            try {
                console.log('Message read acknowledgment received:', data);
                const ac = activeChatRef.current;

                // Clear unread count for matching conversation(s)
                setVisible(prev => (prev || []).map(item => {
                    if (!item) return item;
                    // Group-level ack
                    if (data.groupID && item.group && String(item.groupID) === String(data.groupID)) {
                        return { ...item, unreadCount: 0, hasMention: false };
                    }
                    // 1-1 ack: match by email (either side)
                    const convoEmail = item.email;
                    if (convoEmail && (convoEmail === data.fromEmail || convoEmail === data.toEmail)) {
                        return { ...item, unreadCount: 0, hasMention: false };
                    }
                    return item;
                }));

                // If the ack pertains to the active chat, mark loaded messages as read
                if (ac) {
                    const isGroupAck = data.groupID && ac.group && String(ac.groupID) === String(data.groupID);
                    const isPrivateAck = !ac.group && (data.fromEmail === ac.email || data.toEmail === ac.email);
                    if (isGroupAck || isPrivateAck) {
                        setTextMessage(prev => (prev || []).map(m => m ? { ...m, read: true } : m));
                        console.log('Updated messages after read ack for active chat');
                    }
                }
            } catch (err) {
                console.warn('Error handling messageReadAck:', err);
            }
        });
        
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [textMessage]);


    const sendMessage = () => {
        if (!activeChat) {
            console.warn('No active chat selected. Cannot send message.');
            return;
        }
        const text = message && message.trim();
        if (!text) return;
        console.log(activeChat)
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
        if (socketRef.current) {
            manageMention();
            socketRef.current.emit('sendMessage', payload);
        }
        // append locally so sender sees their message immediately (use email for matching)
        setMessage('');
    };

    const handleTypingLocal = () => {
        try {
            const sock = socketRef.current;
            const ac = activeChatRef.current;
            if (!sock || !ac) return;
            const myName = users.find(u => u.email === myEmail)?.username || myEmail;
            const payload = ac.group ? { groupID: ac.groupID, fromUserId: myUserID, fromEmail: myEmail, fromUsername: myName } : { toUserId: ac.userID, toEmail: ac.email, fromUserId: myUserID, fromEmail: myEmail, fromUsername: myName };
            if (!isTypingRef.current) {
                sock.emit('typingStart', payload);
                isTypingRef.current = true;
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                try { sock.emit('typingStop', payload); } catch (err) { console.warn('typingStop emit failed', err); }
                isTypingRef.current = false;
                typingTimeoutRef.current = null;
            }, 2000);
        } catch (err) { console.warn('handleTypingLocal error', err); }
    };

    const createGroupSubmit = async (e) => {
        e && e.preventDefault && e.preventDefault();
        const groupName = (newGroupName || '').trim();
        if (!groupName) return alert('Please enter a group name');
        try {
            const data = await createGroupApi({ groupName, createdBy: myUserID, token });
            if (data && data.groupID) {
                alert(`Group "${groupName}" created successfully.`);
                setShowCreateGroupModal(false);
                setNewGroupName('');
            } else {
                alert('Failed to create group.');
            }
        } catch (err) {
            console.error('Create group failed:', err);
            alert('Create group failed: ' + (err?.response?.data?.error || err.message));
        }
    };

    const handleInlineRemove = (member) => {
        if (!member) return;
        if (!activeChat || !activeChat.group) { alert('No active group selected.'); return; }
        if (!isAdmin) { alert('Only admins/owners can remove members.'); return; }
        const memberEmail = member.email;
        const memberID = member.id || users.find(u => u.email === member.email)?.userID || '';
        const sock = socketRef.current;
        if (sock) {
            sock.emit('removeGroupMember', { groupID: activeChat.groupID, memberEmail, memberID });
        }
    };

    const toggleSelectToAdd = (email) => {
        setSelectedToAdd(prev => {
            const next = new Set(prev);
            if (next.has(email)) next.delete(email); else next.add(email);
            return Array.from(next);
        });
    };

    const selectAllCandidates = (candidates) => {
        setSelectedToAdd(candidates.map(c => c.email));
    };

    const addSelectedMembersSubmit = async () => {
        if (!activeChat || !activeChat.group) { alert('No active group selected.'); return; }
        if (!selectedToAdd || selectedToAdd.length === 0) { alert('No users selected.'); return; }
        const results = await Promise.allSettled(selectedToAdd.map(async (email) => {
            const user = users.find(u => u.email === email);
            const memberID = user ? (user.userID || user.id) : '';
            try {
                const res = await addGroupMemberApi({ groupID: activeChat.groupID, memberEmail: email, memberID, requesterID: myUserID, token });
                return { email, ok: true, res };
            } catch (err) {
                return { email, ok: false, err };
            }
        }));
        const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok));
        const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok);
        if (failed.length > 0) {
            alert(`Added ${succeeded.length} members, ${failed.length} failed.`);
        } else {
            alert(`Successfully added ${succeeded.length} members.`);
        }
        setShowAddMembersModal(false);
        setSelectedToAdd([]);
    };

    const renameGroup = () => {
        const newGroupName = prompt("Enter the new group name:");
        if (!newGroupName) return;
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        const socket = socketRef.current;
        if (socket) {
            socket.emit('renameGroup', { groupID: activeChat.groupID, newGroupName, requestedByEmail: myEmail, requestedByID: myUserID });
        }
    };

    // Handle role changes from the dropdown. Frontend enforces only admins/owners
    // can change other members' roles; the backend will perform authoritative checks.
    const handleRoleChange = (member, role) => {
        if (!role) return;
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        let memberID = "";
        users.forEach(u => {
            if (member.email === u.email) memberID = u.userID;
        });
        const socket = socketRef.current;
        if (socket) {
            socket.emit('changeMemberRole', { groupID: activeChat.groupID, memberEmail: member.email, memberID: memberID, newRole: role });
        }
    }

    // Close open role dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (!openRoleDropdownFor) return;
            try {
                const el = document.querySelector(`[data-role-for="${openRoleDropdownFor}"]`);
                if (!el) { setOpenRoleDropdownFor(null); return; }
                if (!el.contains(e.target)) setOpenRoleDropdownFor(null);
            } catch (err) {
                setOpenRoleDropdownFor(null);
                console.log(err);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [openRoleDropdownFor]);

    const changeGroupAvatar = () => {
        const memberEmail = myEmail;
        const memberID = myUserID;
        // If the currently active chat is a group, update the group avatar.
        // Otherwise, fall back to updating the user's profile avatar.
        if (!activeChat) {
            alert("No active chat selected.");
            return;
        }

        if (!activeChat.group) {
            return;
        }

        // activeChat.group === true -> change the group avatar via a temporary input
        const tmp = document.createElement('input');
        tmp.type = 'file';
        tmp.accept = 'image/*';
        tmp.style.display = 'none';
        const handleTmpChange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
                document.body.removeChild(tmp);
                return;
            }
            if (!file.type.startsWith('image/')) {
                document.body.removeChild(tmp);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const socket = socketRef.current;
                if (socket) {
                    socket.emit("changeGroupAvatar", { imageData: reader.result, groupID: activeChat.groupID, requestedByEmail: memberEmail, requestedByID: memberID });
                }
                document.body.removeChild(tmp);
            };
            reader.readAsDataURL(file);
        };
        tmp.addEventListener('change', handleTmpChange, { once: true });
        document.body.appendChild(tmp);
        tmp.click();
    }

    const leaveGroup = () => {
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        const socket = socketRef.current;
        if (socket) {
            socket.emit('leaveGroup', { groupID: activeChat.groupID, memberEmail: myEmail, memberID: myUserID });
        }
    }

    const manageMention =() => {
        if (!activeChat || !activeChat.group) {
            return;
        }
        if(message.split(" ").pop().startsWith("@")) {
            const mentionText = message.split(" ").pop().substring(1).toLowerCase();
            const members = groupMembersMap[activeChat.groupID] || [];
            const filteredMembers = members.filter(m => m.email !== myEmail && (m.username || m.name || '').toLowerCase().includes(mentionText));
            console.log("Filtered Members: ", filteredMembers);
            if (filteredMembers.length === 1 && (filteredMembers[0].username || filteredMembers[0].name || '').toLowerCase() === mentionText) {
                const socket = socketRef.current;
                if (socket) {
                    socket.emit('mentionUser', { groupID: activeChat.groupID, mentionedEmail: filteredMembers[0].email, mentionedID: filteredMembers[0].id, fromEmail: myEmail, fromID: myUserID, messageContent: message });
                }
            }
        }
    }

    


    const deleteGroup = () => {
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        const confirmDelete = prompt("confirm deletion of group (y/n)");
        if (confirmDelete === "n" || confirmDelete === "N") return
        else if (confirmDelete === "y" || confirmDelete === "Y") {
        const socket = socketRef.current;
            if (socket) {
                socket.emit('deleteGroup', { groupID: activeChat.groupID, requestedByEmail: myEmail, requestedByID: myUserID });
            }
        } else return
    }

    // derive filtered messages for the active chat only
    const filteredMessages = activeChat ? (
        activeChat.group ?
            // group chat: filter by groupID
            textMessage.filter(m => (m.groupID && activeChat.groupID && m.groupID === activeChat.groupID)) :
            // 1-1 chat: filter by emails
            textMessage.filter(m => {
                const from = m.fromEmail ?? m.from ?? null;
                const to = m.toEmail ?? m.to ?? null;
                return (from === myEmail && to === activeChat.email) || (from === activeChat.email && to === myEmail);
            })
    ) : [];

    // Determine current user's role in the active group (if any)
    const myRole = (activeChat && activeChat.group && groupMembersMap[activeChat.groupID])
        ? (groupMembersMap[activeChat.groupID].find(m => (m.id && String(m.id) === String(myUserID)) || (m.email && m.email === myEmail)) || {}).role
        : null;
    const isMember = !!myRole; // members (and above) can add
    const isAdmin = myRole === 'admin' || myRole === 'owner';
    const isOwner = myRole === 'owner';

    // Compute a friendly typing indicator for the active chat
    const typingText = (() => {
        if (!activeChat) return null;
        const key = activeChat.group ? String(activeChat.groupID) : (activeChat.userID || activeChat.email);
        const list = typingMap && typingMap[key] ? typingMap[key] : [];
        if (!list || list.length === 0) return null;
        if (list.length === 1) return `${list[0].username || list[0].name || 'Someone'} is typing...`;
        return `${list.length} people are typing...`;
    })();

    // Prepare sorted members: owners first (always on top), then others A→Z
    const sortedMembers = (() => {
        const members = (groupMembersMap[activeChat?.groupID] || []);
        if (!Array.isArray(members) || members.length === 0) return [];
        const owners = members.filter(m => m && m.role === 'owner');
        const others = members.filter(m => !m || m.role !== 'owner').slice().sort((a, b) => {
            const an = (a && (a.name || a.username || a.email) || '').toLowerCase();
            const bn = (b && (b.name || b.username || b.email) || '').toLowerCase();
            return an.localeCompare(bn, undefined, { sensitivity: 'base' });
        });
        return [...owners, ...others];
    })();

    return (
        <div className="min-h-screen min-w-screen flex bg-[#111818] font-display text-white">
            {/* Column 1: Main Navigation Panel */}
            <aside className="flex h-screen w-20 flex-col items-center justify-between border-r border-transparent bg-[#0d1212] p-4">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div onClick={imageUploader} className="profilePic flex items-center justify-center bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: profileImage ? `url('${profileImage}')` : `url('https://placehold.co/12')`}}></div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                    </div>
                        <button onClick={() => setShowCreateGroupModal(true)} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
                            <MdGroupAdd size={24} />
                    </button>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <button onClick={LogOut} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </aside>

            {/* Column 2: Conversation List Panel */}
            <aside className="flex h-screen w-full max-w-sm flex-col border-r border-gray-200 dark:border-gray-800 bg-[#ffffff] dark:bg-[#111818]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">Chats</h1>
                    <div className="mt-4">
                        <label className="flex flex-col h-11 w-full">
                            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-[#363d3d] dark:bg-[#182222]">
                                <div className="text-gray-400 dark:text-gray-500 flex items-center justify-center pl-3">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-2 text-sm font-normal leading-normal" placeholder="Search or start new chat"/>
                            </div>
                        </label>
                    </div>
                </div>
                    <div className="flex-1 overflow-y-auto">
                    {visible.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No users found</div>
                    ) : (
                        visible.map((u) => (
                            <div key={u.userID} onClick={() => setActiveChat(u)} className={`flex cursor-pointer gap-4 px-4 py-3 justify-between ${activeChat?.userID === u.userID ? 'bg-[#137fec]/20 dark:bg-[#137fec]/30 border-r-4 border-[#137fec]' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-14 h-14" style={{backgroundImage: (u.avatarUrl || u.groupAvatarUrl) ? `url('${u.avatarUrl || u.groupAvatarUrl}')` : `url('https://placehold.co/14')`}}></div>
                                        <span className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0f1720] ${u.online ? 'bg-[#10B981]' : 'bg-gray-400 dark:bg-gray-600'}`}></span>
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center">
                                        <p className="text-[#1F2937] dark:text-white text-base font-medium leading-normal">{u.username || 'Unknown'}</p>
                                        <p className="text-[#137fec] dark:text-gray-200 text-sm font-medium leading-normal">{u.lastMessage || ''}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs font-normal">{u.lastSeen || ''}</p>
                                    {u.unreadCount > 0 ? (
                                        <div
                                            title={u.hasMention ? 'Mentioned' : (u.unreadCount + ' unread')}
                                            className={`flex w-6 h-6 items-center justify-center rounded-full text-white text-xs font-bold ${u.hasMention ? 'bg-red-500' : 'bg-[#137fec]'}`}
                                        >{u.unreadCount}</div>
                                    ) : (
                                        u.hasMention ? (
                                            <div title="You were mentioned" className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-[#0f1720]"></div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Column 3: Message View Panel */}
            <main className="flex h-screen flex-1 flex-col bg-[#D9D9D9] dark:bg-[#182222]">
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111818] px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div onClick={changeGroupAvatar} className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: activeChat ? (activeChat.group ? (activeChat.groupAvatarUrl ? `url('${activeChat.groupAvatarUrl}')` : `url('https://placehold.co/12')`) : (activeChat.avatarUrl ? `url('${activeChat.avatarUrl}')` : `url('https://placehold.co/12')`)) : `url('https://placehold.co/12')`}}></div>
                        </div>
                        <div className="relative flex flex-col">
                            <h2 onClick = {() => setMembersList(true)} className="text-lg font-semibold text-[#1F2937] dark:text-white">{activeChat?.username ?? 'Select a chat'}</h2>
                            <p className={`text-sm ${activeChat?.online ? 'text-green-500' : 'text-gray-400'}`}>{activeChat ? (activeChat.online ? 'Online' : 'Offline') : ''}</p>
                            {/* membersList modal now rendered as overlay below (improves positioning and backdrop handling) */}
                        </div>
                    </div>
                </header>

                <div ref={textpanel} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/*text messages*/}
                    <Textbubble messages={filteredMessages} activeChat={activeChat} users={users} groupMembersMap={groupMembersMap} onForward={(m) => { setForwardingMessage(m); setShowForwardModal(true); }} />

                    {/* Forward modal */}
                    {showForwardModal && forwardingMessage && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}></div>
                            <div className="bg-white dark:bg-[#111818] rounded-lg shadow-lg w-96 p-4 z-60">
                                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">Forward message</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Select a conversation to forward this message to:</p>
                                <div className="max-h-64 overflow-y-auto">
                                    {(visible || []).filter(v => v && !(v.userID === myUserID)).map(v => (
                                        <div key={v.userID} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => {
                                            // construct payload and emit
                                            try {
                                                const sock = socketRef.current;
                                                if (!sock) return;
                                                const payload = {
                                                    message: forwardingMessage.content || forwardingMessage || '',
                                                    fromUserId: myUserID,
                                                    toUserId: v.group ? null : v.userID,
                                                    groupID: v.group ? v.groupID : null,
                                                    toEmail: v.group ? null : v.email,
                                                    fromEmail: myEmail,
                                                    timestamp: new Date().toISOString(),
                                                    type: 'sent',
                                                    forwardedFrom: { id: forwardingMessage.fromUserId || null, email: forwardingMessage.fromEmail || null, name: forwardingMessage.fromUsername || forwardingMessage.fromName || null }
                                                };
                                                sock.emit('sendMessage', payload);
                                            } catch (err) { console.error('Forward failed', err); }
                                            setShowForwardModal(false);
                                            setForwardingMessage(null);
                                        }}>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8" style={{backgroundImage: (v.avatarUrl || v.groupAvatarUrl) ? `url('${v.avatarUrl || v.groupAvatarUrl}')` : `url('https://placehold.co/8')`}}></div>
                                                <div>
                                                    <div className="text-sm font-medium text-[#1F2937] dark:text-white">{v.username}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{v.group ? 'Group' : v.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-right">
                                    <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Members List Modal (overlay) */}
                    {membersList && activeChat?.groupID && (groupMembersMap[activeChat?.groupID] || []).length >= 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50" onClick={() => setMembersList(false)}></div>
                            <div className="bg-white dark:bg-[#111818] rounded-lg shadow-lg w-96 max-w-lg p-4 z-60">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-md font-semibold text-[#1F2937] dark:text-white">Group Members</h3>
                                    <button onClick={() => setMembersList(false)} className="text-gray-500 hover:text-gray-700"><IoIosClose size={32}/></button>
                                </div>
                                <div className='flex gap-2 pb-2 mb-4 border-b border-gray-300 dark:border-gray-700'>
                                    {isMember && (
                                        <button onClick={() => setShowAddMembersModal(true)} className="mt-2 px-3 py-1 bg-[#137fec] text-white rounded-md text-sm"><MdGroupAdd/></button>
                                    )}
                                    {isAdmin && (
                                        <div className='flex gap-2'>
                                            <button onClick={renameGroup} className="mt-2 px-3 py-1 bg-[#828282] text-white rounded-md text-sm"><MdDriveFileRenameOutline/></button>
                                        </div>
                                    )}
                                    {isOwner && (
                                        <button onClick={deleteGroup} className="mt-2 px-3 py-1 bg-[#fc6060] text-white rounded-md text-sm"><MdOutlineDeleteOutline/></button>
                                    )}
                                </div>
                                <ul className={`max-h-60 ${openRoleDropdownFor ? 'overflow-visible' : 'overflow-y-auto'}`}>
                                {sortedMembers.map((m) => {
                                    const hoverDisabled = !!openRoleDropdownFor;
                                    const roleChangeDisabled = !isAdmin || ((m.id && String(m.id) === String(myUserID)) || (m.email === myEmail));
                                    const canRemove = (
                                        (isOwner && m.email !== myEmail && m.role !== 'owner') ||
                                        (isAdmin && !isOwner && m.email !== myEmail && (m.role === 'member' || !m.role))
                                    );
                                    return (
                                    <li key={m.id || m.email} className={`group relative text-sm text-[#1F2937] dark:text-white mb-1 flex justify-between items-center ${hoverDisabled ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} rounded p-2`}>
                                        <div>
                                            <div className="font-medium">{m.name || m.email}</div>
                                            <div className="text-xs text-gray-500">{m.email}</div>
                                        </div>
                                        <div className="flex items-center gap-2 relative">
                                            <div className={`transform transition-transform duration-150 ${canRemove ? (hoverDisabled ? '' : 'group-hover:-translate-x-14') : ''}`}>
                                                {m.role === 'owner' ? (
                                                    <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">owner</div>
                                                ) : (
                                                    <div className="relative inline-block" data-role-for={m.email} style={{ zIndex: 99999 }}>
                                                        <select
                                                            value={m.role || 'member'}
                                                            disabled={roleChangeDisabled}
                                                            onChange={(e) => { e.stopPropagation(); handleRoleChange(m, e.target.value); }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`text-xs px-3 py-1 rounded ${roleChangeDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#137fec] text-white hover:bg-[#0f6fe6]'}`}
                                                        >
                                                            <option value="admin">admin</option>
                                                            <option value="member">member</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {canRemove && (
                                                <button onClick={() => handleInlineRemove(m)} className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity text-sm text-white bg-red-500 px-2 py-1 rounded ${hoverDisabled ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                                                    <MdGroupRemove />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                    );
                                })}
                                {(!groupMembersMap[activeChat?.groupID] || groupMembersMap[activeChat?.groupID].length === 0) && (
                                    <li className="text-sm text-[#1F2937] dark:text-white mb-1">No members</li>
                                )}
                                </ul>
                                <div className='flex gap-2 justify-end mt-3'>
                                    <button onClick={leaveGroup} className="mt-2 px-3 py-1 bg-[#fc6060] text-white rounded-md text-sm"><MdExitToApp /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Members Modal (multi-select) */}
                    {showAddMembersModal && activeChat && activeChat.group && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAddMembersModal(false); setSelectedToAdd([]); }}></div>
                            <div className="bg-white dark:bg-[#111818] rounded-lg shadow-lg w-96 p-4 z-60">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-md font-semibold text-[#1F2937] dark:text-white">Add Members</h3>
                                    <button onClick={() => { setShowAddMembersModal(false); setSelectedToAdd([]); }} className="text-gray-500 hover:text-gray-700"><IoIosClose size={28}/></button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Select users to add to <strong className="text-[#1F2937] dark:text-white">{activeChat.username}</strong></p>
                                <div className="flex items-center gap-2 mb-2">
                                    <button onClick={() => {
                                        const members = groupMembersMap[activeChat.groupID] || [];
                                        const candidates = (users || []).filter(u => u && !u.group && u.email !== myEmail && !members.find(m => m.email === u.email));
                                        selectAllCandidates(candidates);
                                    }} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">Select All</button>
                                    <div className="text-sm text-gray-500">{selectedToAdd.length} selected</div>
                                </div>
                                <div className="max-h-64 overflow-y-auto border-t border-b border-gray-200 dark:border-gray-700 py-2">
                                    {((users || []).filter(u => u && !u.group && u.email !== myEmail && !((groupMembersMap[activeChat.groupID] || []).find(m=>m.email===u.email)))).map(u => (
                                        <div key={u.email} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleSelectToAdd(u.email)}>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8" style={{backgroundImage: u.avatarUrl ? `url('${u.avatarUrl}')` : `url('https://placehold.co/8')`}}></div>
                                                <div>
                                                    <div className="text-sm font-medium text-[#1F2937] dark:text-white">{u.username}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                                                </div>
                                            </div>
                                            <div>
                                                <input type="checkbox" checked={selectedToAdd.includes(u.email)} readOnly />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-right flex gap-2 justify-end">
                                    <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={() => { setShowAddMembersModal(false); setSelectedToAdd([]); }}>Cancel</button>
                                    <button className="px-3 py-1 bg-[#137fec] text-white rounded" onClick={addSelectedMembersSubmit}>Add {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create Group Modal */}
                    {showCreateGroupModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCreateGroupModal(false); setNewGroupName(''); }}></div>
                            <form onSubmit={createGroupSubmit} className="bg-white dark:bg-[#111818] rounded-lg shadow-lg w-96 p-4 z-60">
                                <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">Create Group</h3>
                                <label className="text-sm text-gray-600 dark:text-gray-300">Group name</label>
                                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full mt-2 mb-3 px-3 py-2 rounded border border-gray-200" placeholder="Enter group name" />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setShowCreateGroupModal(false); setNewGroupName(''); }} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">Cancel</button>
                                    <button type="submit" className="px-3 py-1 bg-[#137fec] text-white rounded">Create</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* typing indicator */}
                <div className="px-6 pb-2 text-sm text-gray-700 dark:text-gray-300">
                    {typingText ? <span>{typingText}</span> : null}
                </div>

                <footer className="bg-white dark:bg-[#111818] p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <form className='flex w-full gap-2' onSubmit={(e) => { e.target.reset(); sendMessage(); e.preventDefault(); }}>
                            <input className="flex-1 rounded-md border-gray-200 dark:border-gray-700 bg-[#363d3d] dark:bg-[#182222] px-4 py-2.5 text-sm focus:border-[#363d3d] focus:ring-[#363d3d] dark:text-white dark:placeholder:text-gray-500" placeholder="Type a message..." type="text" onChange={(e) => { setMessage(e.target.value); handleTypingLocal(); }} />
                            <button className="text-white bg-[#1c2f2f] box-border border border-transparent hover:bg-[#363d3d] focus:ring-4 focus:ring-[#363d3d]/30 shadow-xs font-medium leading-5 rounded-md text-sm px-4 py-2.5 focus:outline-none" type='submit'>
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </footer>
            </main>
        </div>
    );
}