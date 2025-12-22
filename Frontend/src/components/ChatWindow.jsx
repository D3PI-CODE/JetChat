import React from 'react';
import Textbubble from '../components/Textbubble'; // Assuming existing component

export default function ChatWindow({ 
    activeChat, messages, messageInput, users, groupMembersMap, typingText, 
    textPanelRef, onInputChange, onSendMessage, onChangeGroupAvatar, onOpenMembers, onForward 
}) {
    if (!activeChat) return <div className="flex h-screen flex-1 bg-[#D9D9D9] dark:bg-[#182222]"></div>;

    const handleAvatarClick = () => {
        if (!activeChat.group) return;
        // Create hidden input programmatically or use a ref passed from hook
        const tmp = document.createElement('input');
        tmp.type = 'file'; tmp.accept = 'image/*';
        tmp.onchange = (e) => onChangeGroupAvatar(e, true);
        tmp.click();
    };

    return (
        <main className="flex h-screen flex-1 flex-col bg-[#D9D9D9] dark:bg-[#182222]">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111818] px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="cursor-pointer" onClick={handleAvatarClick}>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: activeChat.group ? `url('${activeChat.groupAvatarUrl || 'https://placehold.co/12'}')` : `url('${activeChat.avatarUrl || 'https://placehold.co/12'}')`}}></div>
                    </div>
                    <div className="relative flex flex-col">
                        <h2 onClick={onOpenMembers} className="text-lg font-semibold text-[#1F2937] dark:text-white cursor-pointer hover:underline">{activeChat.username}</h2>
                        <p className={`text-sm ${activeChat.online ? 'text-green-500' : 'text-gray-400'}`}>{activeChat.online ? 'Online' : 'Offline'}</p>
                    </div>
                </div>
            </header>

            <div ref={textPanelRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                <Textbubble messages={messages} activeChat={activeChat} users={users} groupMembersMap={groupMembersMap} onForward={onForward} />
            </div>

            <div className="px-6 pb-2 text-sm text-gray-700 dark:text-gray-300 h-6">
                {typingText}
            </div>

            <footer className="bg-white dark:bg-[#111818] p-4 border-t border-gray-200 dark:border-gray-800">
                <form className='flex w-full gap-2' onSubmit={(e) => { e.preventDefault(); onSendMessage(); }}>
                    <input 
                        className="flex-1 rounded-md bg-[#363d3d] dark:bg-[#182222] px-4 py-2.5 text-sm dark:text-white" 
                        placeholder="Type a message..." 
                        value={messageInput}
                        onChange={onInputChange} 
                    />
                    <button className="text-white bg-[#1c2f2f] hover:bg-[#363d3d] rounded-md text-sm px-4 py-2.5" type='submit'>
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </form>
            </footer>
        </main>
    );
}