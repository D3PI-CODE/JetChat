import React, { useEffect, useState, useRef } from 'react';
import './chat.css';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Textbubble from './Textbubble';


export default function Chat() {
    // Theme: use #111818 as the primary panel/background color across the chat UI
    const navigate = useNavigate();
    const [sender, setSender] = useState(null);
    const [message, setMessage] = useState('');
    // state for previous messages are split into sent/received
    const [textMessage, setTextMessage] = useState([]);
    const [users, setUsers] = useState([]);
    const socketRef = useRef(null);
    let visibleUsers = users.filter((u) => !u.self);
    const [activeChat, setActiveChat] = useState(null);
    const textpanel = useRef(null);
    const activeChatRef = useRef(activeChat);
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = useRef(null);

    const changeMessage = (e) => {
        setMessage(e.target.value);
    }

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
            const myEmail = localStorage.getItem('email');
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
            const email = localStorage.getItem('email');
            console.log('Connecting socket for email:', email);
            socketRef.current = io('http://localhost:5002', {autoConnect: false });
            socketRef.current.auth = { email };
            console.log('Socket ref before connect:', socketRef.current.auth);
            socketRef.current.connect();
        }
        
        const socket = socketRef.current;
        const usrMangement = (usersList) => {
            const processed = (usersList || []).map((user) => ({
                username: user.username ?? user.email,
                email: user.email,
                avatarUrl: user.avatarUrl || null,
                userID: user.id ?? user.email,
                socketIds: user.socketIds || [],
                online: !!user.online,
                self: Array.isArray(user.socketIds) ? user.socketIds.includes(socket.id) : false,
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
            const myEmail = localStorage.getItem('email');
            const me = processed.find(u => u.email === myEmail);
            if (me && me.avatarUrl) setProfileImage(me.avatarUrl);
            console.log('Connected users:', processed);
        };
        socket.on("users", usrMangement);

        // When server confirms a profile picture update, update local state immediately
        const handleProfilePicUpdated = (data) => {
            if (!data || !data.email) return;
            setUsers((prev) => prev.map(u => u.email === data.email ? { ...u, avatarUrl: data.avatarUrl } : u));
            const myEmailLocal = localStorage.getItem('email');
            if (data.email === myEmailLocal && data.avatarUrl) {
                setProfileImage(data.avatarUrl);
            }
        };
        socket.on('profilePicUpdated', handleProfilePicUpdated);

        // When the server sends previous messages (merged payload)
        socket.on('previousMessages', (data) => {
            console.log('Previous messages received:', data);
            if (Array.isArray(data)) {
                const myEmail = localStorage.getItem('email');
                const normalized = data.map(m => ({
                    content: m.content ?? (typeof m === 'string' ? m : ''),
                    fromEmail: m.from ?? m.fromEmail ?? null,
                    toEmail: m.to ?? m.toEmail ?? null,
                    timestamp: m.timestamp ?? m.createdAt ?? null,
                    type: m.type ?? (m.from === myEmail ? 'sent' : 'received'),
                }));
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
            if (!data) return;
            const msgObj = typeof data === 'string' ? { content: data, fromEmail: null, toEmail: null, timestamp: new Date().toISOString(), type: 'received' } : {
                content: data.message ?? data.content ?? '',
                fromEmail: data.fromEmail ?? data.from ?? null,
                toEmail: data.toEmail ?? data.to ?? null,
                timestamp: data.timestamp ?? null,
                type: 'received',
            };
            // use ref so handler sees the latest activeChat after switching
            const ac = activeChatRef.current;
            if (ac && (msgObj.toEmail === ac.email || msgObj.fromEmail === ac.email)) {
                setTextMessage((prev) => [...prev, msgObj]);
            }
        };
        const handleSent = (data) => {
            // data is expected to be { message, ... }
            if (!data) return;
            const msg = typeof data === 'string' ? { content: data, timestamp: new Date().toISOString(), type: 'sent' } : {
                content: data.message ?? data.content ?? '',
                fromEmail: data.fromEmail ?? data.from ?? null,
                toEmail: data.toEmail ?? data.to ?? null,
                timestamp: data.timestamp ?? null,
                type: 'sent',
            };
            // only append sent messages if they belong to the active chat
            const ac = activeChatRef.current;
            if (!ac || (msg.toEmail === ac.email || msg.fromEmail === ac.email)) {
                setTextMessage((prev) => [...prev, msg]);
            }
        };

    socket.on('receiveMessage', handleReceive);
    socket.on('sentMessageAck', handleSent);
    visibleUsers = users.filter((u) => !u.self)
    
        socket.on('connect', () => console.log('socket connected', socket.id));
        socket.on('disconnect', (reason) => console.log('socket disconnected', reason)); 
        return () => {
            socket.off('receiveMessage', handleReceive);
            socket.off('sentMessageAck', handleSent);
            socket.off('previousMessages');
            socket.off('previousMessagesError');
            socket.off('connect');
            socket.off('disconnect');
            socket.off('users', usrMangement);
            socket.off('profilePicUpdated', handleProfilePicUpdated);
        };
    }, []);

    // When activeChat changes, request previous messages from the server
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (!activeChat || !activeChat.username) return;
        const myEmail = localStorage.getItem('email');
        // clear current lists when switching chats
        setTextMessage([]);
        // request full conversation (server will return messages between myEmail and activeChat.username)
        socket.emit('getMessages', myEmail, activeChat.email);
    }, [activeChat]);

    useEffect(() => {
        if (textpanel.current) {
          textpanel.current.scrollTop = textpanel.current.scrollHeight;
        }
      }, [textMessage]);


    const sendMessage = () => {
        if (!activeChat) {
            console.warn('No active chat selected. Cannot send message.');
            return;
        }
        const text = message && message.trim();
        if (!text) return;
        const myEmail = localStorage.getItem('email');
        console.log(activeChat)
        // prefer a single socket id for server io.to(...) usage
        const targetSocketId = Array.isArray(activeChat.socketIds) && activeChat.socketIds.length
            ? activeChat.socketIds[0]
            : activeChat.socketIds || null;
        const payload = {
            message: text,
            to: targetSocketId,
            from: socketRef.current ? socketRef.current.id : null,
            toEmail: activeChat.email,
            fromEmail: myEmail,
            timestamp: new Date().toISOString(),
            type: 'sent',
        };
        if (socketRef.current) {
            socketRef.current.emit('sendMessage', payload);
        }
        // append locally so sender sees their message immediately (use email for matching)
        setTextMessage(prev => [...prev, { content: text, fromEmail: myEmail, toEmail: activeChat.email, timestamp: payload.timestamp, type: 'sent' }]);
        setMessage('');
    };

    // derive filtered messages for the active chat only
    const myEmail = localStorage.getItem('email');
    const filteredMessages = activeChat ? textMessage.filter(m => {
        const from = m.fromEmail ?? m.from ?? null;
        const to = m.toEmail ?? m.to ?? null;
        return (from === myEmail && to === activeChat.email) || (from === activeChat.email && to === myEmail);
    }) : [];

    return (
        <div className="min-h-screen min-w-screen flex bg-[#111818] font-display text-white">
            {/* Column 1: Main Navigation Panel */}
            <aside className="flex h-screen w-20 flex-col items-center justify-between border-r border-transparent bg-[#0d1212] p-4">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div onClick={imageUploader} className="profilePic bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: profileImage ? `url('${profileImage}')` : `url('https://placehold.co/12')`}}></div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                    </div>
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
                                <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-2 text-sm font-normal leading-normal" placeholder="Search or start new chat" onChange={(e) => setSender(e.target.value)}/>
                            </div>
                        </label>
                    </div>
                </div>
                    <div className="flex-1 overflow-y-auto">
                    {visibleUsers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No users found</div>
                    ) : (
                        visibleUsers.map((u) => (
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
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: activeChat?.avatarUrl ? `url('${activeChat.avatarUrl}')` : `url('https://placehold.co/12')`}}></div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white">{activeChat?.username ?? 'Select a chat'}</h2>
                            <p className={`text-sm ${activeChat?.online ? 'text-green-500' : 'text-gray-400'}`}>{activeChat ? (activeChat.online ? 'Online' : 'Offline') : ''}</p>
                        </div>
                    </div>
                </header>

                <div ref={textpanel} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/*text messages*/}
                    <Textbubble messages={filteredMessages} />
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