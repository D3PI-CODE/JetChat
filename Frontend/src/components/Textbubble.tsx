import React from 'react';
import { RiCheckDoubleLine } from "react-icons/ri";
import { FiShare2 } from 'react-icons/fi';
import { Message, Chat, User, GroupMember } from '../types';

interface TextbubbleProps {
  messages?: Message[];
  activeChat?: Chat | null;
  users?: User[];
  groupMembersMap?: Record<string, GroupMember[]>;
  onForward?: (message: Message) => void;
}

export default function Textbubble({ messages = [], activeChat = null, users = [], groupMembersMap = {}, onForward = () => {} }: TextbubbleProps) {

    // Function to parse and highlight mentions in message content
    const renderMessageWithMentions = (content: string) => {
        if (!content) return content;

        // Split content by mentions (@username)
        const mentionRegex = /(@\w+)/g;
        const parts = content.split(mentionRegex);

        return parts.map((part, index) => {
            if (part.startsWith('@') && part.length > 1) {
                // This is a mention
                const username = part.substring(1); // Remove the @
                return (
                    <span
                        key={index}
                        className="bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded-md font-medium border border-blue-400/30 hover:bg-blue-500/40 transition-colors duration-300 cursor-pointer"
                        title={`Mention: ${username}`}
                    >
                        {part}
                    </span>
                );
            }
            // Regular text
            return part;
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {messages.map((m, idx) => {
                const content = typeof m === 'string' ? m : (m.content ?? '');
                const ts = typeof m === 'string' ? null : (m.timestamp ?? null);
                const type = typeof m === 'string' ? 'received' : (m.type ?? 'received');
                const read = m.read;

                // Determine avatar for this message. Prefer explicit sender avatar from the message payload,
                // then try activeChat (private chat avatar), then users/groupMembers lookup.
                // For group chats we intentionally do NOT render avatars inside message bubbles;
                // avatars are shown in the conversation list only.
                let messageAvatar = (m && m.fromAvatar) || activeChat?.avatarUrl || null;
                const isGroup = !!(activeChat && activeChat.group);
                let senderDisplayName = null;
                let senderIdKey = null;
                if (isGroup) {
                    const senderEmail = m.fromEmail || m.from || null;
                    const senderId = m.fromUserId || m.fromId || m.from || null;
                    // senderIdKey is used for grouping consecutive messages. Include
                    // username keys in case senderID/email are not available.
                    senderIdKey = senderId || senderEmail || m.fromUsername || m.username || null;
                    // try to find user by email or id
                    let user = null;
                    if (senderEmail) user = users.find(u => u.email === senderEmail) || null;
                    if (!user && senderId) user = users.find(u => String(u.userID) === String(senderId)) || null;
                    if (user && user.avatarUrl) messageAvatar = messageAvatar || user.avatarUrl;
                    senderDisplayName = m.fromUsername || m.username || m.fromName || (user && (user.username || user.email)) || null;
                    if (!senderDisplayName && activeChat?.groupID && groupMembersMap && groupMembersMap[activeChat.groupID]) {
                        const member = groupMembersMap[activeChat.groupID].find(x => (x.email && x.email === senderEmail) || (x.id && String(x.id) === String(senderId)));
                        if (member) senderDisplayName = member.name || member.email || null;
                    }
                    if (!senderDisplayName) senderDisplayName = m.fromUsername || m.username || senderEmail || senderId || 'Unknown';
                }

                // Render sent messages on the right; for group chats we do NOT show avatar in the bubble
                if (type === 'sent') {
                    if (isGroup) {
                        // For sent group messages we do not show the sender name.
                        return (
                            <div key={idx} className="flex items-end gap-3 justify-end group">
                                <div className="flex flex-col gap-1 items-end group/message relative">
                                    <div className="rounded-2xl rounded-br-md bg-linear-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-sm p-4 text-white max-w-xl shadow-xl border border-white/20 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-600 ease-out group-hover/message:shadow-2xl group-hover/message:shadow-blue-500/30">
                                        <p className="text-sm drop-shadow-sm group-hover/message:scale-105 transition-transform duration-300">{renderMessageWithMentions(content)}</p>
                                    </div>
                                    <span className="text-xs text-white/60 flex gap-2 drop-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        {ts ? new Date(ts).toLocaleTimeString() : ''}
                                        {read ? <RiCheckDoubleLine className="text-sm text-blue-300 drop-shadow-sm animate-pulse"/> : null}
                                    </span>
                                    <button
                                        onClick={() => onForward(m)}
                                        title="Forward message"
                                        className="absolute -left-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out text-white/60 hover:text-white hover:scale-125 hover:rotate-12 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:shadow-lg hover:shadow-white/20"
                                    >
                                        <FiShare2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="flex items-end gap-3 justify-end group">
                            <div className="flex flex-col gap-1 items-end group/message relative">
                                <div className="rounded-2xl rounded-br-md bg-linear-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-sm p-4 text-white max-w-xl shadow-xl border border-white/20 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-600 ease-out group-hover/message:shadow-2xl group-hover/message:shadow-blue-500/30">
                                    <p className="text-sm drop-shadow-sm group-hover/message:scale-105 transition-transform duration-300">{renderMessageWithMentions(content)}</p>
                                </div>
                                <span className="text-xs text-white/60 flex gap-2 drop-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    {ts ? new Date(ts).toLocaleTimeString() : ''}
                                    {read ? <RiCheckDoubleLine className="text-sm text-blue-300 drop-shadow-sm animate-pulse"/> : null}
                                </span>
                                <button
                                    onClick={() => onForward(m)}
                                    title="Forward message"
                                    className="absolute -left-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out text-white/60 hover:text-white hover:scale-125 hover:rotate-12 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:shadow-lg hover:shadow-white/20"
                                >
                                    <FiShare2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                } else {
                    // received
                    if (isGroup) {
                        // Only show sender name for received messages and when the previous
                        // message was from a different sender (grouping).
                        const prev = messages && messages[idx - 1];
                        let prevSenderKey = null;
                        if (prev) {
                            // include username fields when resolving previous sender identity
                            prevSenderKey = prev.fromUserId || prev.fromId || prev.from || prev.fromEmail || prev.fromUsername || prev.username || null;
                        }
                        const showName = type !== 'sent' && (!prevSenderKey || String(prevSenderKey) !== String(senderIdKey));
                        return (
                            <div key={idx} className="flex items-start gap-3 max-w-xl group">
                                <div className="flex flex-col gap-1 relative group/message">
                                    {showName ? <div className="text-xs font-semibold text-white/80 drop-shadow-sm ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">{senderDisplayName}</div> : null}
                                    <div className="rounded-2xl rounded-bl-md bg-white/12 backdrop-blur-sm p-4 shadow-xl border border-white/10 hover:shadow-2xl hover:shadow-white/10 hover:scale-[1.02] hover:translate-y-0.5 transition-all duration-600 ease-out relative group-hover/message:shadow-2xl group-hover/message:shadow-white/20">
                                        <p className="text-sm text-white drop-shadow-sm group-hover/message:scale-105 transition-transform duration-300">{renderMessageWithMentions(content)}</p>
                                    </div>
                                    <span className="text-xs text-white/60 drop-shadow-sm ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
                                    <button
                                        onClick={() => onForward(m)}
                                        title="Forward message"
                                        className="absolute -right-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out text-white/60 hover:text-white hover:scale-125 hover:-rotate-12 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:shadow-lg hover:shadow-white/20"
                                    >
                                        <FiShare2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="flex items-start gap-3 max-w-xl group">
                            <div className="relative group/avatar">
                                <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/15 rounded-full blur-sm group-hover/avatar:blur-lg group-hover/avatar:scale-110 transition-all duration-700 ease-out"></div>
                                <div
                                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 h-10 shrink-0 border-2 border-white/20 shadow-lg hover:shadow-2xl hover:shadow-white/20 hover:scale-110 hover:rotate-6 transition-all duration-700 ease-out relative z-10 group-hover/avatar:brightness-110"
                                    style={{backgroundImage: messageAvatar ? `url('${messageAvatar}')` : `url('https://placehold.co/10')`}}
                                ></div>
                            </div>
                            <div className="flex flex-col gap-1 relative group/message">
                                <div className="rounded-2xl rounded-bl-md bg-white/12 backdrop-blur-sm p-4 shadow-xl border border-white/10 hover:shadow-2xl hover:shadow-white/10 hover:scale-[1.02] hover:translate-y-0.5 transition-all duration-600 ease-out relative group-hover/message:shadow-2xl group-hover/message:shadow-white/20">
                                    <p className="text-sm text-white drop-shadow-sm group-hover/message:scale-105 transition-transform duration-300">{renderMessageWithMentions(content)}</p>
                                </div>
                                <span className="text-xs text-white/60 drop-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
                                <button
                                    onClick={() => onForward(m)}
                                    title="Forward message"
                                    className="absolute -right-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out text-white/60 hover:text-white hover:scale-125 hover:-rotate-12 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:shadow-lg hover:shadow-white/20"
                                >
                                    <FiShare2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                }
            })}
        </div>
    );
}
