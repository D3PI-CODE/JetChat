import React, { useEffect } from 'react';
import './chat.css';
import { useChatLogic } from '@/hooks/useChatLogic';
import Sidebar from '../components/Sidebar.jsx';
import ChatList from '../components/ChatList.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import { GroupModals, ForwardModal } from '../components/ChatModals';

export default function Chat() {
    const { state, refs, actions } = useChatLogic();

    // Auto-scroll effect
    useEffect(() => {
        if (refs.textpanel.current) {
            refs.textpanel.current.scrollTop = refs.textpanel.current.scrollHeight;
        }
    }, [state.textMessage, refs.textpanel]);

    return (
        <div className="min-h-screen min-w-screen flex bg-[#111818] font-display text-white">
            {/* 1. Sidebar (Navigation) */}
            <Sidebar 
                profileImage={state.profileImage}
                fileInputRef={refs.fileInputRef}
                onImageChange={(e) => actions.handleAvatarUpload(e, false)}
                onLogout={actions.handleLogOut}
                onCreateGroupClick={() => actions.toggleModal('createGroup', true)}
            />

            {/* 2. Chat List */}
            <ChatList 
                chats={state.visible}
                activeChat={state.activeChat}
                onChatSelect={actions.setActiveChat}
            />

            {/* 3. Chat Window (Main View) */}
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
        </div>
    );
}