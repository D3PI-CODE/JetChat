import React, { useEffect, useState, useRef } from 'react';
import './chat.css';
import io from 'socket.io-client';
import Textbubble from './Textbubble';
import { MdGroupAdd, MdGroupRemove, MdExitToApp, MdOutlineDeleteOutline } from "react-icons/md";


export default function Chat() {
    // Theme: use #111818 as the primary panel/background color across the chat UI
    const [message, setMessage] = useState('');
    // state for previous messages are split into sent/received
    const [textMessage, setTextMessage] = useState([]);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [groupMembersMap, setGroupMembersMap] = useState({});
    const socketRef = useRef(null);
    const [visible, setVisible] = useState(users.filter((u) => !u.self));
    const [activeChat, setActiveChat] = useState(null);
    const textpanel = useRef(null);
    const activeChatRef = useRef(activeChat);
    const [membersList, setMembersList] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = useRef(null);
    const myEmail = localStorage.getItem('email');
    const myUserID = localStorage.getItem('userId');
    // Resolve a usable userID for socket auth. If no explicit userId is present
    // fall back to the email so the server still receives an identifier.
    const resolvedUserID = myUserID || myEmail || null;

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
        if (!socketRef.current) {
            console.log('Connecting socket for email:', myEmail);
            socketRef.current = io('http://localhost:5002', { autoConnect: false });
            // Attach auth for the socket handshake. Prefer JWT token for server
            // authentication; fall back to userId/email so older flows still work.
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No `token` found in localStorage; socket will use fallback auth (userId/email).');
            }
            socketRef.current.auth = { token, userID: resolvedUserID, email: myEmail };
            console.log('Socket auth before connect:', socketRef.current.auth);
            socketRef.current.connect();

            // helpful debug handlers
            socketRef.current.on('connect_error', (err) => {
                console.error('Socket connect_error:', err);
            });
            socketRef.current.on('connect_timeout', (timeout) => {
                console.warn('Socket connect_timeout:', timeout);
            });
            socketRef.current.on('error', (err) => {
                console.error('Socket error:', err);
            });
        }
        
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
                group:true,
            }));
            console.log('Connected groups:', processed);
            setGroups(processed);
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
        socket.on('changeMemberRoleError', handleChangeRoleError);
        socket.on('changeMemberRoleSuccess', handleChangeRoleSuccess);

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
                    // remove from groups state
                    setGroups(prev => (prev || []).filter(g => String(g.groupID) !== String(gid)));
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

        socket.on('addGroupMemberError', handleAddMemberError);
        socket.on('addGroupMemberSuccess', handleAddMemberSuccess);
        socket.on('removeGroupMemberError', handleRemoveMemberError);
        socket.on('removeGroupMemberSuccess', handleRemoveMemberSuccess);
        socket.on('deleteGroupError', handleDeleteGroupError);
        socket.on('deleteGroupSuccess', handleDeleteGroupSuccess);

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
            };
            console.log('Received message:', msgObjRecieved);
            const ac = activeChatRef.current;
                if (ac && ac.group) {
                    // Group message handling: compare groupID
                    if (data.groupID && ac.groupID && data.groupID === ac.groupID) {
                        setTextMessage((prev) => [...prev, msgObjRecieved]);
                        // For group messages we do not auto-emit a markAsRead ack here
                    }
                } else if (ac && (msgObjRecieved.toEmail === ac.email || msgObjRecieved.fromEmail === ac.email )) {
                setTextMessage((prev) => [...prev, msgObjRecieved]);
                    socketRef.current.emit('markAsRead', { id: msgObjRecieved.id, fromEmail: msgObjRecieved.fromEmail, toEmail: msgObjRecieved.toEmail, toUserId: myUserID, fromUserId: ac.userID  });
            }
        };

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
            };

            const ac = activeChatRef.current;
            if (!ac) return;
            // append for 1-1 chats by email match, or for group chats by groupID
            if ((msgObjSent.toEmail && (msgObjSent.toEmail === ac.email || msgObjSent.fromEmail === ac.email)) || (ac.group && msgObjSent.groupID && ac.groupID && String(msgObjSent.groupID) === String(ac.groupID))) {
                setTextMessage((prev) => [...prev, msgObjSent]);
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
        // request full conversation. If activeChat is a group, include groupID
        const payload = { from: myUserID, fromEmail: myEmail, to: activeChat.userID, toEmail: activeChat.email };
        if (activeChat.group) payload.groupID = activeChat.groupID;
        socket.emit('getMessages', payload);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChat]);

    useEffect(() => {
        if (textpanel.current) {
          textpanel.current.scrollTop = textpanel.current.scrollHeight;
        }
        socketRef.current.on('messageReadAck', (data) => {
            console.log('Message read acknowledgment received:', data);
            console.log(data.fromEmail, data.toEmail, activeChatRef.current.email);
            if (data.fromEmail !== activeChatRef.current.email && data.toEmail !== activeChatRef.current.email) {
                console.log('Ack does not pertain to active chat, ignoring.');
                return;
            }
            setTextMessage(prev => prev.map(
                m => m ? { ...m, read: true } : m
            ))
            console.log('Updated messages after read ack:', textMessage);
        });
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
            socketRef.current.emit('sendMessage', payload);
        }
        // append locally so sender sees their message immediately (use email for matching)
        setMessage('');
    };

    const createGroup = () => {
        const groupName = prompt("Enter group name:");
        if (!groupName) return;
        const socket = socketRef.current;
        if (socket) {
            socket.emit('createGroup', { groupName, createdBy: myUserID, createdByEmail: myEmail });
        }
    };

    const addMember = () => {
        const memberEmail = prompt("Enter the email of the user to add to the group:");
        let memberID = ""
        users.forEach(u => { 
            if (memberEmail === u.email) {
                console.log(u.userID);
                memberID = u.userID;
            } 
        });
        console.log("MemberID: ", memberID);
        if (!memberEmail) return;
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        const socket = socketRef.current;
        if (socket) {
            socket.emit('addGroupMember', { groupID: activeChat.groupID, memberEmail, memberID: memberID });
        }
    };

    const removeMember = () => {
        const memberEmail = prompt("Enter the email of the user to remove from the group:");
        let memberID = ""
        users.forEach(u => {
            if (memberEmail === u.email) {
                console.log(u.userID);
                memberID = u.userID;
            } 
        });
        console.log("MemberID: ", memberID);
        if (!memberEmail) return;
        if (!activeChat || !activeChat.group) {
            alert("No active group selected.");
            return;
        }
        const socket = socketRef.current;
        if (socket) {
            socket.emit('removeGroupMember', { groupID: activeChat.groupID, memberEmail, memberID: memberID });
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
    const canAdd = !!myRole; // members (and above) can add
    const canRemove = myRole === 'admin' || myRole === 'owner';
    const canDelete = myRole === 'owner';

    return (
        <div className="min-h-screen min-w-screen flex bg-[#111818] font-display text-white">
            {/* Column 1: Main Navigation Panel */}
            <aside className="flex h-screen w-20 flex-col items-center justify-between border-r border-transparent bg-[#0d1212] p-4">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div onClick={imageUploader} className="profilePic flex items-center justify-center bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: profileImage ? `url('${profileImage}')` : `url('https://placehold.co/12')`}}></div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                    </div>
                    <button onClick={createGroup} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
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
                                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-14 h-14" style={{backgroundImage: u.avatarUrl ? `url('${u.avatarUrl}')` : `url('https://placehold.co/14')`}}></div>
                                        <span className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0f1720] ${u.online ? 'bg-[#10B981]' : 'bg-gray-400 dark:bg-gray-600'}`}></span>
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center">
                                        <p className="text-[#1F2937] dark:text-white text-base font-medium leading-normal">{u.username || 'Unknown'}</p>
                                        <p className="text-[#137fec] dark:text-gray-200 text-sm font-medium leading-normal">{u.lastMessage || ''}</p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs font-normal">{u.lastSeen || ''}</p>
                                    <div className="flex w-6 h-6 items-center justify-center rounded-full bg-[#137fec] text-white text-xs font-bold">{u.unreadCount || ''}</div>
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
                                <div onClick = {() => setMembersList(true)} className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: activeChat?.avatarUrl ? `url('${activeChat.avatarUrl}')` : `url('https://placehold.co/12')`}}></div>
                        </div>
                        <div className="relative flex flex-col">
                            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white">{activeChat?.username ?? 'Select a chat'}</h2>
                            <p className={`text-sm ${activeChat?.online ? 'text-green-500' : 'text-gray-400'}`}>{activeChat ? (activeChat.online ? 'Online' : 'Offline') : ''}</p>
                            {membersList && groupMembersMap[activeChat?.groupID] && (
                                <div className="absolute w-md top-16 bg-white dark:bg-[#111818] border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10">
                                    <h3 className="text-md font-semibold mb-1 text-[#1F2937] dark:text-white">Group Members</h3>
                                    <div className='flex gap-2 pb-2 mb-4 border-b border-gray-300 dark:border-gray-700'>
                                        {canAdd && (
                                            <button onClick={addMember} className="mt-2 px-3 py-1 bg-[#137fec] text-white rounded-md text-sm"><MdGroupAdd/></button>
                                        )}
                                        {canRemove && (
                                            <button onClick={removeMember} className="mt-2 px-3 py-1 bg-[#fc6060] text-white rounded-md text-sm"><MdGroupRemove/></button>
                                        )}
                                        {canDelete && (
                                            <button onClick={deleteGroup} className="mt-2 px-3 py-1 bg-[#fc6060] text-white rounded-md text-sm"><MdOutlineDeleteOutline/></button>
                                        )}
                                    </div>
                                        <ul className="max-h-60 overflow-y-auto">
                                        {(groupMembersMap[activeChat?.groupID] || []).map((m) => (
                                            <li key={m.id || m.email} className="text-sm text-[#1F2937] dark:text-white mb-1 flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium">{m.name || m.email}</div>
                                                    <div className="text-xs text-gray-500">{m.email}</div>
                                                </div>
                                                <div>
                                                    {m.role === 'owner' ? (
                                                        <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">owner</div>
                                                    ) : (
                                                        <select
                                                            value={(m.role || 'member')}
                                                            disabled={!canRemove || ((m.id && String(m.id) === String(myUserID)) || (m.email === myEmail))}
                                                            onChange={(e) => handleRoleChange(m, e.target.value)}
                                                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                                                        >
                                                            <option value="admin">admin</option>
                                                            <option value="member">member</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                        {(!groupMembersMap[activeChat?.groupID] || groupMembersMap[activeChat?.groupID].length === 0) && (
                                            <li className="text-sm text-[#1F2937] dark:text-white mb-1">No members</li>
                                        )}
                                    </ul>
                                    <div className='flex gap-2 justify-end'>
                                        <button onClick={() => setMembersList(false)} className="mt-2 px-3 py-1 bg-[#137fec] text-white rounded-md text-sm">Close</button>
                                        <button onClick={leaveGroup} className="mt-2 px-3 py-1 bg-[#fc6060] text-white rounded-md text-sm"><MdExitToApp /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div ref={textpanel} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/*text messages*/}
                    <Textbubble messages={filteredMessages} activeChat={activeChat} users={users} groupMembersMap={groupMembersMap}/>
                </div>

                <footer className="bg-white dark:bg-[#111818] p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <form className='flex w-full gap-2' onSubmit={(e) => { e.target.reset(); sendMessage(); e.preventDefault(); }}>
                            <input className="flex-1 rounded-md border-gray-200 dark:border-gray-700 bg-[#363d3d] dark:bg-[#182222] px-4 py-2.5 text-sm focus:border-[#363d3d] focus:ring-[#363d3d] dark:text-white dark:placeholder:text-gray-500" placeholder="Type a message..." type="text" onChange={(e) => setMessage(e.target.value)} />
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