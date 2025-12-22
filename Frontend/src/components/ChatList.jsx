import React from 'react';

export default function ChatList({ chats, activeChat, onChatSelect }) {
    return (
        <aside className="flex h-screen w-full max-w-sm flex-col border-r border-gray-200 dark:border-gray-800 bg-[#ffffff] dark:bg-[#111818]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">Chats</h1>
                {/* Search Input Omitted for brevity, purely render logic */}
            </div>
            <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No users found</div>
                ) : (
                    chats.map((u) => (
                        <div key={u.userID} onClick={() => onChatSelect(u)} className={`flex cursor-pointer gap-4 px-4 py-3 justify-between ${activeChat?.userID === u.userID ? 'bg-[#137fec]/20 dark:bg-[#137fec]/30 border-r-4 border-[#137fec]' : ''}`}>
                             <div className="flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-14 h-14" style={{backgroundImage: (u.avatarUrl || u.groupAvatarUrl) ? `url('${u.avatarUrl || u.groupAvatarUrl}')` : `url('https://placehold.co/14')`}}></div>
                                    <span className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0f1720] ${u.online ? 'bg-[#10B981]' : 'bg-gray-400 dark:bg-gray-600'}`}></span>
                                </div>
                                <div className="flex flex-1 flex-col justify-center">
                                    <p className="text-[#1F2937] dark:text-white text-base font-medium leading-normal">{u.username || 'Unknown'}</p>
                                    <p className="text-[#137fec] dark:text-gray-200 text-sm font-medium leading-normal">{u.lastMessage || ''}</p>
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                                {u.unreadCount > 0 && (
                                    <div className={`flex w-6 h-6 items-center justify-center rounded-full text-white text-xs font-bold ${u.hasMention ? 'bg-red-500' : 'bg-[#137fec]'}`}>{u.unreadCount}</div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}