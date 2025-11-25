import React from 'react';
import { RiCheckDoubleLine } from "react-icons/ri";


export default function Textbubble({ messages = [], activeChat = null }) {
    // Debug helper: uncomment to log
    // console.debug('Textbubble render', { messagesLength: messages?.length, activeChat });

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
                const messageAvatar = activeChat?.avatarUrl

                if (type === 'sent') {
                    return (
                        <div key={idx} className="flex items-end gap-3 justify-end">
                            <div className="flex flex-col gap-1 items-end">
                                <div className="rounded-xl rounded-br-none bg-[#0e5555] p-3 text-white max-w-xl shadow-sm">
                                    <p className="text-sm">{content}</p>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 flex gap-2">{ts ? new Date(ts).toLocaleTimeString() : ''} <RiCheckDoubleLine className="material-symbols-outlined text-sm text-[#137fec]"/> </span> 
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
            })}
        </div>
    );
}