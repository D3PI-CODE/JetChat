import React from 'react';
import { MdGroupAdd } from "react-icons/md";

export default function Sidebar({ profileImage, fileInputRef, onImageChange, onLogout, onCreateGroupClick }) {
    return (
        <aside className="flex h-screen w-20 flex-col items-center justify-between p-4 relative">
            <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-full blur-sm group-hover:blur-md transition-all duration-700 ease-out"></div>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="profilePic cursor-pointer flex items-center justify-center bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12 border border-white/10 shadow-lg hover:shadow-2xl hover:shadow-white/10 hover:scale-110 hover:-rotate-3 transition-all duration-700 ease-out relative z-10 group-hover:brightness-110"
                        style={{backgroundImage: profileImage ? `url('${profileImage}')` : `url('https://placehold.co/12')`}}
                    />
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                </div>
                <button
                    onClick={onCreateGroupClick}
                    className="flex items-center justify-center rounded-xl p-2.5 text-white/70 hover:text-white hover:bg-white/10 hover:backdrop-blur-lg border border-white/8 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-110 hover:rotate-12 transition-all duration-600 ease-out group relative overflow-hidden"
                >
                    <MdGroupAdd size={18} className="group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                </button>
            </div>
            <div className="flex flex-col items-center gap-3">
                <button
                    onClick={onLogout}
                    className="flex items-center justify-center rounded-xl p-2 text-white/70 hover:text-white hover:bg-white/10 hover:backdrop-blur-lg border border-white/8 shadow-lg hover:shadow-2xl hover:shadow-red-500/20 hover:scale-110 hover:-rotate-12 transition-all duration-600 ease-out group relative overflow-hidden"
                >
                    <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform duration-300">logout</span>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-600 ease-out"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                </button>
            </div>
        </aside>
    );
}
