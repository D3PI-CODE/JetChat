import React, { useState, useRef, useEffect } from 'react';
import Textbubble from '../components/Textbubble';
import MentionDropdown from './MentionDropdown';

export default function ChatWindow({
    activeChat, messages, messageInput, users, groupMembersMap, typingText,
    textPanelRef, onInputChange, onSendMessage, onChangeGroupAvatar, onOpenMembers, onForward
}) {
    // Mention functionality state - must be before any early returns
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const inputRef = useRef(null);

    // Handle keyboard navigation in dropdown - must be before early return
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showMentionDropdown) return;

            if (e.key === 'Escape') {
                setShowMentionDropdown(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showMentionDropdown]);

    if (!activeChat) return <div className="flex h-screen flex-1 bg-transparent"></div>;

    const handleAvatarClick = () => {
        if (!activeChat.group) return;
        // Create hidden input programmatically or use a ref passed from hook
        const tmp = document.createElement('input');
        tmp.type = 'file'; tmp.accept = 'image/*';
        tmp.onchange = (e) => onChangeGroupAvatar(e, true);
        tmp.click();
    };

    // Get mentionable users based on chat type
    const getMentionableUsers = () => {
        if (!activeChat) return [];

        if (activeChat.group) {
            // For group chats, get all group members
            const gid = activeChat.groupID || activeChat.userID;
            const members = groupMembersMap[gid] || groupMembersMap[String(gid)] || [];
            return members.map(member => ({
                ...member,
                username: member.name,
                online: member.online || false
            }));
        } else {
            // For direct chats, return the other user
            return [activeChat].map(user => ({
                ...user,
                username: user.username,
                online: user.online || false
            }));
        }
    };

    // Handle input changes with mention detection
    const handleInputChange = (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;

        // Check for @ symbol before cursor
        const textBeforeCursor = value.substring(0, cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
            // @ is at the end of text before cursor, show dropdown
            const mentionableUsers = getMentionableUsers();
            if (mentionableUsers.length > 0) {
                setShowMentionDropdown(true);
                setMentionQuery('');
                updateDropdownPosition();
            }
        } else if (atIndex !== -1) {
            // There's text after @, extract query
            const query = textBeforeCursor.substring(atIndex + 1);
            if (query.length > 0 && !query.includes(' ')) {
                setShowMentionDropdown(true);
                setMentionQuery(query);
                updateDropdownPosition();
            } else {
                setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }

        // Call original onChange - pass the event with updated value
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                value: value
            }
        };
        onInputChange(syntheticEvent);
    };

    // Update dropdown position based on input cursor
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();

            setDropdownPosition({
                top: rect.top - 280, // Position above the input with some space
                left: rect.left
            });
        }
    };

    // Handle user selection from mention dropdown
    const handleMentionSelect = (user) => {
        const cursorPosition = inputRef.current?.selectionStart || messageInput.length;
        const textBeforeCursor = messageInput.substring(0, cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            // Replace @query with @username
            const textAfterCursor = messageInput.substring(cursorPosition);
            const newText = textBeforeCursor.substring(0, atIndex) + `@${user.username} ` + textAfterCursor;

            // Create synthetic event for onInputChange
            const syntheticEvent = {
                target: {
                    value: newText,
                    selectionStart: atIndex + user.username.length + 2 // +2 for @ and space
                }
            };

            onInputChange(syntheticEvent);
            setShowMentionDropdown(false);

            // Focus back on input and set cursor position
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(
                        atIndex + user.username.length + 2,
                        atIndex + user.username.length + 2
                    );
                }
            }, 0);
        }
    };



    return (
        <main className="flex h-screen flex-1 flex-col bg-transparent relative">
            <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/15 backdrop-blur-2xl px-6 py-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="cursor-pointer group relative" onClick={handleAvatarClick}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-full blur-sm group-hover:blur-md transition-all duration-500"></div>
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
                        ref={inputRef}
                        className="flex-1 rounded-xl bg-white/8 backdrop-blur-md border border-white/10 px-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all duration-500 shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-blue-500/20"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={handleInputChange}
                    />

                    {/* Mention Dropdown */}
                    {showMentionDropdown && (
                        <MentionDropdown
                            users={getMentionableUsers()}
                            query={mentionQuery}
                            position={dropdownPosition}
                            onSelect={handleMentionSelect}
                            onClose={() => setShowMentionDropdown(false)}
                        />
                    )}
                    <button
                        className="text-white bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-sm p-2.5 shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-110 hover:rotate-12 transition-all duration-600 ease-out border border-white/10 group relative overflow-hidden"
                        type='submit'
                    >
                        <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform duration-300">send</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    </button>
                </form>
            </footer>
        </main>
    );
}
