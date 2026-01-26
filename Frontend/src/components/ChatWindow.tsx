import React from 'react';
import Textbubble from '../components/Textbubble';

export default function ChatWindow({
    activeChat, messages, messageInput, users, groupMembersMap, typingText,
    textPanelRef, onInputChange, onSendMessage, onChangeGroupAvatar, onOpenMembers, onForward
}) {
    if (!activeChat) return <div className="flex h-screen flex-1 bg-transparent"></div>;

    const handleAvatarClick = () => {
        if (!activeChat.group) return;
        // Create hidden input programmatically or use a ref passed from hook
        const tmp = document.createElement('input');
        tmp.type = 'file'; tmp.accept = 'image/*';
        tmp.onchange = (e) => onChangeGroupAvatar(e, true);
        tmp.click();
    };



    return (
        <main className="flex h-screen flex-1 flex-col bg-transparent relative">
            <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/15 backdrop-blur-2xl px-6 py-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="cursor-pointer group relative" onClick={handleAvatarClick}>
                        <div className="absolute inset-0 bg-linear-to-br from-white/20 to-white/5 rounded-full blur-sm group-hover:blur-md transition-all duration-500"></div>
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12 border border-white/10 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-500 relative z-10"
                            style={{backgroundImage: activeChat.group ? `url('${activeChat.groupAvatarUrl || 'https://placehold.co/12'}')` : `url('${activeChat.avatarUrl || 'https://placehold.co/12'}')`}}
                        ></div>
                    </div>
                    <div className="relative flex flex-col">
                        <h2 onClick={onOpenMembers} className="text-base font-medium text-white/90 cursor-pointer hover:text-white transition-colors duration-500">{activeChat.username}</h2>
                        <p className={`text-xs transition-colors duration-500 ${activeChat.online ? 'text-green-400' : 'text-white/50'}`}>{activeChat.online ? 'Online' : 'Offline'}</p>
                    </div>
                </div>
            </header>

            <div ref={textPanelRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {messages && messages.length > 0 ? (
                    <Textbubble
                        messages={messages}
                        activeChat={activeChat}
                        users={users}
                        groupMembersMap={groupMembersMap}
                        onForward={onForward}
                    />
                ) : (
                    <div className="flex items-center justify-center text-sm text-white/60">No messages</div>
                )}
            </div>

            <div className="px-6 pb-2 text-xs text-white/60 h-6">
                {typingText}
            </div>

            <footer className="bg-black/15 backdrop-blur-2xl p-4 border-t border-white/5 shadow-lg">
                <form className='flex w-full gap-3' onSubmit={(e) => { e.preventDefault(); onSendMessage(); }}>
                    <input
                        className="flex-1 rounded-xl bg-white/8 backdrop-blur-md border border-white/10 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all duration-500 shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-blue-500/20"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={onInputChange}
                    />
                    <button
                        className="text-white bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-sm p-2.5 shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-110 hover:rotate-12 transition-all duration-600 ease-out border border-white/10 group relative overflow-hidden"
                        type='submit'
                    >
                        <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform duration-300">send</span>
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    </button>
                </form>
            </footer>
        </main>
    );
}
