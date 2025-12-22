import React from 'react';
import { MdGroupAdd } from "react-icons/md";

export default function Sidebar({ profileImage, fileInputRef, onImageChange, onLogout, onCreateGroupClick }) {
    return (
        <aside className="flex h-screen w-20 flex-col items-center justify-between border-r border-transparent bg-[#0d1212] p-4">
            <div className="flex flex-col items-center gap-8">
                <div className="relative">
                    <div 
                        onClick={() => fileInputRef.current?.click()} 
                        className="profilePic cursor-pointer flex items-center justify-center bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" 
                        style={{backgroundImage: profileImage ? `url('${profileImage}')` : `url('https://placehold.co/12')`}}
                    />
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                </div>
                <button onClick={onCreateGroupClick} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
                    <MdGroupAdd size={24} />
                </button>
            </div>
            <div className="flex flex-col items-center gap-4">
                <button onClick={onLogout} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
                    <span className="material-symbols-outlined">logout</span>
                </button>
            </div>
        </aside>
    );
}