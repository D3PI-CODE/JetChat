import React from 'react';

export default function ChatList({ chats, activeChat, onChatSelect }) {
    return (
        <aside className="flex h-screen w-full max-w-sm flex-col relative">
            <div className="p-6 border-b border-white/5 backdrop-blur-md">
                <h1 className="text-xl font-semibold text-white/90 tracking-tight">Chats</h1>
                {/* Search Input Omitted for brevity, purely render logic */}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                {chats.length === 0 ? (
                    <div className="p-6 text-sm text-white/50">No users found</div>
                ) : (
                    chats.map((u) => (
                        <div
                            key={u.userID}
                            onClick={() => onChatSelect(u)}
                            className={`flex cursor-pointer gap-4 px-6 py-4 justify-between transition-all duration-700 ease-out hover:scale-[1.02] hover:-translate-y-0.5 group relative overflow-hidden ${
                                activeChat?.userID === u.userID
                                    ? 'bg-linear-to-r from-blue-500/20 to-blue-600/12 border-r-2 border-blue-400/90 shadow-xl shadow-blue-500/15'
                                    : 'hover:bg-white/4 border-r-2 border-transparent hover:shadow-lg hover:shadow-white/5'
                            }`}
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-linear-to-br from-white/25 to-white/8 rounded-full blur-sm group-hover:blur-lg group-hover:scale-110 transition-all duration-700 ease-out"></div>
                                    <div
                                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12 border border-white/10 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-110 hover:rotate-6 transition-all duration-700 ease-out relative z-10 group-hover:brightness-110"
                                        style={{backgroundImage: (u.avatarUrl || u.groupAvatarUrl) ? `url('${u.avatarUrl || u.groupAvatarUrl}')` : `url('https://placehold.co/12')`}}
                                    ></div>
                                    {!u.group && (
                                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white/90 shadow-md z-20 transition-all duration-500 ${u.online ? 'bg-green-400 shadow-green-400/50' : 'bg-gray-500 shadow-gray-500/50'} group-hover:scale-125`}></span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col justify-center min-w-0 group-hover:translate-x-1 transition-transform duration-500">
                                    <p className="text-white/90 text-sm font-medium leading-tight truncate group-hover:text-white transition-colors duration-300">{u.username || 'Unknown'}</p>
                                    <p className="text-white/60 text-xs font-normal leading-tight truncate group-hover:text-white/80 transition-colors duration-300">{u.lastMessage || ''}</p>
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1 relative z-10">
                                {u.unreadCount > 0 && (
                                    <div className={`flex w-6 h-6 items-center justify-center rounded-full text-white text-xs font-medium shadow-xl transition-all duration-600 ease-out hover:scale-125 hover:rotate-12 group-hover:shadow-2xl ${
                                        u.hasMention
                                            ? 'bg-linear-to-br from-red-500 to-red-600 shadow-red-500/40 animate-pulse'
                                            : 'bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/40'
                                    }`}>
                                        {u.unreadCount}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}
