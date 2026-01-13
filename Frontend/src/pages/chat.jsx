import React, { useEffect, useState } from 'react';
import './chat.css';
import { useChatLogic } from '@/hooks/useChatLogic';
import Sidebar from '../components/Sidebar.jsx';
import ChatList from '../components/ChatList.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import { GroupModals, ForwardModal } from '../components/ChatModals';
import NotificationBanner from '../components/NotificationBanner.jsx';

export default function Chat() {
    const { state, refs, actions } = useChatLogic();
    const [currentNotification, setCurrentNotification] = useState(null);

    // Auto-scroll effect
    useEffect(() => {
        if (refs.textpanel.current) {
            refs.textpanel.current.scrollTop = refs.textpanel.current.scrollHeight;
        }
    }, [state.textMessage, refs.textpanel]);

    // Listen for new messages from other chats to show notifications
    useEffect(() => {
        const handleNewMessage = (messageData) => {
            // Check if the current user was mentioned in the message
            const messageText = messageData.message || messageData.content || '';
            const currentUser = localStorage.getItem('email') || '';

            // Extract username from email (before @) for mention checking
            const currentUsername = currentUser.split('@')[0];

            // Check if message contains @currentUsername
            const isMentioned = messageText.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);

            // Only show notification if user is mentioned AND message is not from the currently active chat
            if (isMentioned && state.activeChat && (
                (state.activeChat.group && messageData.groupID !== state.activeChat.groupID) ||
                (!state.activeChat.group && messageData.senderID !== state.activeChat.userID)
            )) {
                // Find the chat this message belongs to
                const chat = state.visible.find(c =>
                    (c.group && c.groupID === messageData.groupID) ||
                    (!c.group && c.userID === messageData.senderID)
                );

                if (chat) {
                    setCurrentNotification({
                        senderName: messageData.senderName || messageData.sender,
                        sender: messageData.sender,
                        message: messageData.message || messageData.content,
                        chatName: chat.username,
                        timestamp: new Date(),
                        isMention: true
                    });
                }
            }
        };

        // Listen for socket messages (this would need to be integrated with your socket system)
        // For now, we'll simulate with a timeout for demo purposes
        const interval = setInterval(() => {
            // This is just for demonstration - replace with actual socket integration
            if (Math.random() < 0.05) { // 5% chance every 10 seconds for mentions
                const currentUser = localStorage.getItem('email') || '';
                const currentUsername = currentUser.split('@')[0];

                handleNewMessage({
                    senderName: 'Demo User',
                    sender: 'Demo User',
                    message: `Hey @${currentUsername}, check this out!`,
                    groupID: null,
                    senderID: 'demo-user-id'
                });
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [state.activeChat, state.visible]);

    return (
        <div className="min-h-screen min-w-screen flex bg-gradient-to-br from-[#0a0e0e] via-[#0f1414] to-[#0a0e0e] font-['Inter','system-ui','-apple-system','sans-serif'] text-white relative overflow-hidden">
            {/* Extremely subtle Apple-esque background blur - barely visible */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.008),transparent_80%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.005),transparent_80%)] pointer-events-none"></div>

            {/* 1. Sidebar (Navigation) - refined Tahoe glass */}
            <div className="relative z-10 backdrop-blur-2xl bg-black/15 border-r border-white/5 shadow-xl transition-all duration-500 hover:bg-black/20">
                <Sidebar
                    profileImage={state.profileImage}
                    fileInputRef={refs.fileInputRef}
                    onImageChange={(e) => actions.handleAvatarUpload(e, false)}
                    onLogout={actions.handleLogOut}
                    onCreateGroupClick={() => actions.toggleModal('createGroup', true)}
                />
            </div>

            {/* 2. Chat List - refined Tahoe glass */}
            <div className="relative z-10 backdrop-blur-2xl bg-black/8 border-r border-white/3 shadow-lg transition-all duration-500 hover:bg-black/12">
                <ChatList
                    chats={state.visible}
                    activeChat={state.activeChat}
                    onChatSelect={actions.setActiveChat}
                />
            </div>

            {/* 3. Chat Window (Main View) - refined Tahoe glass */}
            <div className="relative z-10 flex-1 backdrop-blur-sm bg-transparent transition-all duration-500">
                <ChatWindow
                    activeChat={state.activeChat}
                    messages={state.textMessage}
                    messageInput={state.message}
                    users={state.users}
                    groupMembersMap={state.groupMembersMap}
                    typingText={state.typingText}
                    textPanelRef={refs.textpanel}
                    onInputChange={(e) => { actions.setMessage(e.target.value); actions.handleTypingLocal(); }}
                    onSendMessage={actions.sendMessage}
                    onChangeGroupAvatar={actions.handleAvatarUpload}
                    onOpenMembers={() => actions.toggleModal('membersList', true)}
                    onForward={(msg) => { actions.setForwardingMessage(msg); actions.toggleModal('forward', true); }}
                />
            </div>

            {/* 4. Modals */}
            <GroupModals
                state={state}
                actions={actions}
            />
            {state.modals.forward && (
                <ForwardModal
                    chats={state.visible}
                    forwardingMessage={state.forwardingMessage}
                    onClose={() => actions.toggleModal('forward', false)}
                    actions={actions}
                />
            )}

            {/* 5. Notification Banner */}
            <NotificationBanner
                notification={currentNotification}
                onDismiss={() => setCurrentNotification(null)}
            />
        </div>
    );
}
