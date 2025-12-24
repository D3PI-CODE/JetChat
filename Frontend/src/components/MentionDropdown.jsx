import React from 'react';

export default function MentionDropdown({
    users = [],
    query = '',
    position = { top: 0, left: 0 },
    onSelect,
    onClose
}) {
    if (!users.length) return null;

    // Filter users based on query
    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit to 5 results

    if (!filteredUsers.length) return null;

    return (
        <div
            className="fixed z-50 bg-black/25 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 max-w-xs w-64 animate-modal-slide-up transform-gpu"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translateY(-4px)'
            }}
        >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>

            <div className="relative z-10 p-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {filteredUsers.map((user, index) => (
                    <button
                        key={user.email || user.userID || index}
                        onClick={() => onSelect(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl transition-all duration-300 group text-left"
                    >
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-semibold border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 relative z-10">
                                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>

                        {/* User info */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium truncate drop-shadow-sm">
                                {user.username || user.email}
                            </div>
                            <div className="text-xs text-white/60 truncate">
                                {user.email}
                            </div>
                        </div>

                        {/* Online status indicator */}
                        {user.online !== undefined && (
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                user.online ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-white/40'
                            }`}></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/25 to-transparent rounded-b-2xl pointer-events-none"></div>
        </div>
    );
}
