import React from 'react';
import { RiCheckDoubleLine } from "react-icons/ri";


export default function Textbubble({ messages = [], activeChat = null, users = [], groupMembersMap = {}}) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return (
            <div className="flex items-center justify-center text-sm text-gray-500">No messages</div>
        );
    }

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
                if (isGroup) {
                    const senderEmail = m.fromEmail || m.from || null;
                    const senderId = m.fromUserId || m.fromId || m.from || null;
                    // try to find user by email or id
                    let user = null;
                    if (senderEmail) user = users.find(u => u.email === senderEmail) || null;
                    if (!user && senderId) user = users.find(u => String(u.userID) === String(senderId) || String(u.userID) === String(senderId)) || null;
                    if (user && user.avatarUrl) messageAvatar = messageAvatar || user.avatarUrl;
                    // fallback: try to find in groupMembersMap for name/email (they may not have avatarUrl)
                    if (!messageAvatar && activeChat?.groupID && groupMembersMap && groupMembersMap[activeChat.groupID]) {
                        const member = groupMembersMap[activeChat.groupID].find(x => (x.email && x.email === senderEmail) || (x.id && String(x.id) === String(senderId)));
                        if (member && member.avatarUrl) messageAvatar = messageAvatar || member.avatarUrl;
                    }
                }

                // Render sent messages on the right; for group chats we do NOT show avatar in the bubble
                if (type === 'sent') {
                    if (isGroup) {
                        return (
                            <div key={idx} className="flex items-end gap-3 justify-end">
                                <div className="flex flex-col gap-1 items-end">
                                    <div className="rounded-xl rounded-br-none bg-[#0e5555] p-3 text-white max-w-xl shadow-sm">
                                        <p className="text-sm">{content}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex gap-2">{ts ? new Date(ts).toLocaleTimeString() : ''} 
                                        {read ? <RiCheckDoubleLine className="material-symbols-outlined text-sm text-[#137fec]"/> : null} </span> 
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="flex items-end gap-3 justify-end">
                            <div className="flex flex-col gap-1 items-end">
                                <div className="rounded-xl rounded-br-none bg-[#0e5555] p-3 text-white max-w-xl shadow-sm">
                                    <p className="text-sm">{content}</p>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 flex gap-2">{ts ? new Date(ts).toLocaleTimeString() : ''} 
                                    {read ? <RiCheckDoubleLine className="material-symbols-outlined text-sm text-[#137fec]"/> : null} </span> 
                            </div>
                        </div>
                    );
                } else {
                    // received
                    if (isGroup) {
                        return (
                            <div key={idx} className="flex items-start gap-3 max-w-xl">
                                <div className="flex flex-col gap-1">
                                    <div className="rounded-xl rounded-bl-none bg-white dark:bg-gray-700 p-3 shadow-sm">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{content}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className="flex items-start gap-3 max-w-xl">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8 shrink-0" style={{backgroundImage: messageAvatar ? `url('${messageAvatar}')` : `url('https://placehold.co/8')`}}></div>
                            <div className="flex flex-col gap-1">
                                <div className="rounded-xl rounded-bl-none bg-white dark:bg-gray-700 p-3 shadow-sm">
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{content}</p>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{ts ? new Date(ts).toLocaleTimeString() : ''}</span>
                            </div>
                        </div>
                    );
                }
            })}
        </div>
    );
}