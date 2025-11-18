import React from 'react';
import './chat.css';
import { useNavigate } from 'react-router-dom';
import { Button } from 'flowbite-react';

const LogOut = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

export default function Chat() {
    // Theme: use #111818 as the primary panel/background color across the chat UI
    const navigate = useNavigate();

    return (
        <div className="min-h-screen min-w-screen flex bg-[#111818] font-display text-white">
            {/* Column 1: Main Navigation Panel */}
            <aside className="flex h-screen w-20 flex-col items-center justify-between border-r border-transparent bg-[#0d1212] p-4">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: `url('https://placehold.co/12')`}}></div>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <button onClick={LogOut} className="flex items-center justify-center rounded-lg p-3 text-gray-300 hover:bg-white/5">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </aside>

            {/* Column 2: Conversation List Panel */}
            <aside className="flex h-screen w-full max-w-sm flex-col border-r border-gray-200 dark:border-gray-800 bg-[#ffffff] dark:bg-[#111818]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">Chats</h1>
                    <div className="mt-4">
                        <label className="flex flex-col h-11 w-full">
                            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-[#363d3d] dark:bg-[#182222]">
                                <div className="text-gray-400 dark:text-gray-500 flex items-center justify-center pl-3">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-2 text-sm font-normal leading-normal" placeholder="Search or start new chat" />
                            </div>
                        </label>
                    </div>
                </div>
                    <div className="flex-1 overflow-y-auto">
                    {/* Sample active conversation */}
                    <div className="flex cursor-pointer gap-4 bg-[#137fec]/20 dark:bg-[#137fec]/30 px-4 py-3 justify-between border-r-4 border-[#137fec]">
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-14 h-14" style={{backgroundImage: `url('https://placehold.co/14')`}}></div>
                                <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#0f1720]"></span>
                            </div>
                            <div className="flex flex-1 flex-col justify-center">
                                <p className="text-[#1F2937] dark:text-white text-base font-medium leading-normal"> Testing </p>
                                <p className="text-[#137fec] dark:text-gray-200 text-sm font-medium leading-normal">last message</p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-normal">10:45 AM</p>
                            <div className="flex w-6 h-6 items-center justify-center rounded-full bg-[#137fec] text-white text-xs font-bold">2</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Column 3: Message View Panel */}
            <main className="flex h-screen flex-1 flex-col bg-[#D9D9D9] dark:bg-[#182222]">
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111818] px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12" style={{backgroundImage: `url('https://placehold.co/12')`}}></div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white">Testing</h2>
                            <p className="text-sm text-green-500">Online</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Received Message */}
                    <div className="flex items-end gap-3 max-w-xl">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8 shrink-0" style={{backgroundImage: `url('https://placehold.co/80')`}}></div>
                        <div className="flex flex-col gap-1">
                            <div className="rounded-xl rounded-bl-none bg-white dark:bg-gray-700 p-3 shadow-sm">
                                <p className="text-sm text-gray-800 dark:text-gray-200">this is a received message</p>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">10:42 AM</span>
                        </div>
                    </div>

                    {/* Sent Message */}
                    <div className="flex items-end gap-3 justify-end">
                        <div className="flex flex-col gap-1 items-end">
                            <div className="rounded-xl rounded-br-none bg-[#0e5555] p-3 text-white max-w-xl shadow-sm">
                                <p className="text-sm">this is a sent message</p>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">10:43 AM <span className="material-symbols-outlined text-sm! text-[#137fec]">read</span></span>
                        </div>
                    </div>
                </div>

                <footer className="bg-white dark:bg-[#111818] p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <input className="flex-1 rounded-md border-gray-200 dark:border-gray-700 bg-[#363d3d] dark:bg-[#182222] px-4 py-2.5 text-sm focus:border-[#363d3d] focus:ring-[#363d3d] dark:text-white dark:placeholder:text-gray-500" placeholder="Type a message..." type="text" />
                        <button className="text-white bg-[#1c2f2f] box-border border border-transparent hover:bg-[#363d3d] focus:ring-4 focus:ring-[#363d3d]/30 shadow-xs font-medium leading-5 rounded-md text-sm px-4 py-2.5 focus:outline-none">
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    );
}