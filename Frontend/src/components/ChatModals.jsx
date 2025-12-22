import React from 'react';
import { MdGroupAdd, MdGroupRemove, MdExitToApp, MdOutlineDeleteOutline, MdDriveFileRenameOutline } from "react-icons/md";
import { IoIosClose } from "react-icons/io";

export const GroupModals = ({ state, actions }) => {
    const { activeChat, modals, groupMembersMap, myRole, myEmail, users, selectedToAdd, newGroupName } = state;
    // handle numeric/string groupID keys gracefully
    const gid = activeChat?.groupID ?? activeChat?.userID ?? null;
    const members = (activeChat && activeChat.group) ? (groupMembersMap[gid] || groupMembersMap[String(gid)] || []) : [];
    
    // Permission checks
    const isAdmin = myRole === 'admin' || myRole === 'owner';
    const isOwner = myRole === 'owner';

    return (
        <>
            {/* 1. Members List Modal */}
            {modals.membersList && activeChat?.group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => actions.toggleModal('membersList', false)}></div>
                    <div className="bg-white dark:bg-[#111818] rounded-lg shadow-lg w-96 max-w-lg p-4 z-60 relative">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-semibold dark:text-white">Group Members</h3>
                            <button onClick={() => actions.toggleModal('membersList', false)}><IoIosClose size={32} className="text-gray-500"/></button>
                        </div>
                        {/* Admin Toolbar */}
                        <div className='flex gap-2 pb-2 mb-4 border-b border-gray-300 dark:border-gray-700'>
                            {myRole && <button onClick={() => actions.toggleModal('addMembers', true)} className="px-3 py-1 bg-[#137fec] text-white rounded-md"><MdGroupAdd/></button>}
                            {isAdmin && <button onClick={() => actions.toggleModal('renameGroup', true)} className="px-3 py-1 bg-[#828282] text-white rounded-md"><MdDriveFileRenameOutline/></button>}
                            {isOwner && <button onClick={actions.deleteGroup} className="px-3 py-1 bg-[#fc6060] text-white rounded-md"><MdOutlineDeleteOutline/></button>}
                        </div>
                        {/* Member List */}
                        <ul className="max-h-60 overflow-y-auto">
                            {members.map(m => {
                                const isSelf = m.email === myEmail;
                                const canManage = isAdmin && !isSelf && (m.role !== 'owner'); // Simplified check
                                return (
                                    <li key={m.email} className="flex justify-between items-center p-2 hover:bg-gray-800 rounded dark:text-white">
                                        <div>
                                            <div className="font-medium">{m.name || m.email}</div>
                                            <div className="text-xs text-gray-500">{m.email}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {m.role === 'owner' ? <span className="text-xs bg-gray-100 text-gray-700 px-2 rounded">owner</span> : (
                                                isAdmin && !isSelf ? (
                                                     <select 
                                                        value={m.role || 'member'} 
                                                        onChange={(e) => actions.changeRole(m, e.target.value)}
                                                        className="text-xs bg-[#137fec] text-white rounded px-2 py-1"
                                                     >
                                                         <option value="admin">admin</option>
                                                         <option value="member">member</option>
                                                     </select>
                                                ) : <span className="text-xs text-gray-500">{m.role || 'member'}</span>
                                            )}
                                            {canManage && <button onClick={() => actions.removeMember(m)} className="text-red-500"><MdGroupRemove/></button>}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className='flex justify-end mt-3'>
                            <button onClick={actions.leaveGroup} className="px-3 py-1 bg-[#fc6060] text-white rounded-md"><MdExitToApp /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Add Members Modal */}
            {modals.addMembers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => actions.toggleModal('addMembers', false)}></div>
                    <div className="bg-[#0d1212] rounded-lg shadow-lg w-96 p-4 z-60 relative border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-white">Add Members</h3>
                            <button onClick={() => actions.toggleModal('addMembers', false)}><IoIosClose size={24} className="text-gray-400"/></button>
                        </div>

                        <div className="text-sm text-gray-300 mb-3">Select users to add to the group</div>

                        <div className="max-h-64 overflow-y-auto rounded border border-gray-800 p-1 mb-3">
                            {(users || []).filter(u => !u.group && u.email !== myEmail && !members.find(m => m.email === u.email)).map(u => (
                                <div key={u.email} onClick={() => {
                                    const exists = (selectedToAdd || []).includes(u.email);
                                    actions.setSelectedToAdd(prev => exists ? (prev || []).filter(e => e !== u.email) : [...(prev || []), u.email]);
                                }} className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">{(u.username || u.email || '').slice(0,1).toUpperCase()}</div>
                                        <div>
                                            <div className="text-sm text-white">{u.username}</div>
                                            <div className="text-xs text-gray-400">{u.email}</div>
                                        </div>
                                    </div>
                                    <input type="checkbox" checked={(selectedToAdd || []).includes(u.email)} readOnly className="w-4 h-4" />
                                </div>
                            ))}
                            {((users || []).filter(u => !u.group && u.email !== myEmail && !members.find(m => m.email === u.email)).length === 0) && (
                                <div className="p-3 text-sm text-gray-400">No eligible users to add</div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-400">Selected: {(selectedToAdd || []).length}</div>
                            <div className="flex gap-2">
                                <button onClick={() => { actions.setSelectedToAdd([]); actions.toggleModal('addMembers', false); }} className="px-3 py-1 bg-gray-700 text-white rounded">Cancel</button>
                                <button onClick={actions.addMembers} disabled={!((selectedToAdd || []).length)} className={`px-3 py-1 rounded text-white ${((selectedToAdd || []).length) ? 'bg-[#137fec]' : 'bg-gray-600 cursor-not-allowed'}`}>Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Create Group Modal */}
            {modals.createGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => actions.toggleModal('createGroup', false)}></div>
                    <form onSubmit={actions.createGroup} className="bg-[#0d1212] rounded-lg shadow-lg w-96 p-4 z-60 relative border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-white">Create Group</h3>
                            <button onClick={() => actions.toggleModal('createGroup', false)}><IoIosClose size={22} className="text-gray-400"/></button>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">Enter a name for the new group</div>
                        <input value={newGroupName} onChange={(e) => actions.setNewGroupName(e.target.value)} className="w-full p-2 rounded bg-[#0f1414] border border-gray-800 text-white" placeholder="Group Name" />
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => actions.toggleModal('createGroup', false)} className="px-3 py-1 bg-gray-700 text-white rounded">Cancel</button>
                            <button type="submit" className="px-3 py-1 bg-[#137fec] text-white rounded">Create</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rename Group Modal */}
            {modals.renameGroup && activeChat?.group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => actions.toggleModal('renameGroup', false)}></div>
                    <form onSubmit={(e) => { e.preventDefault(); actions.renameGroupSubmit(); }} className="bg-[#0d1212] rounded-lg shadow-lg w-96 p-4 z-60 relative border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-white">Rename Group</h3>
                            <button onClick={() => actions.toggleModal('renameGroup', false)}><IoIosClose size={22} className="text-gray-400"/></button>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">Current: <span className="text-white">{activeChat.username}</span></div>
                        <input value={newGroupName} onChange={(e) => actions.setNewGroupName(e.target.value)} className="w-full p-2 rounded bg-[#0f1414] border border-gray-800 text-white" placeholder="New group name" />
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => { actions.setNewGroupName(''); actions.toggleModal('renameGroup', false); }} className="px-3 py-1 bg-gray-700 text-white rounded">Cancel</button>
                            <button type="submit" className="px-3 py-1 bg-[#137fec] text-white rounded">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

export const ForwardModal = ({ chats, onClose, forwardingMessage, actions }) => {
    if (!forwardingMessage) return null;

    const handleForwardTo = (target) => {
        // Set the target chat, populate the message input with forwarded content, then send
        actions.setActiveChat(target);
        const text = forwardingMessage.content || forwardingMessage.message || forwardingMessage.body || '';
        actions.setMessage(text);
        // Give a moment for activeChat to apply if needed, then send
        // sendMessage uses current message state, so call it after setting
        setTimeout(() => {
            actions.sendMessage();
            actions.toggleModal('forward', false);
            actions.setForwardingMessage(null);
        }, 50);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
             <div className="absolute inset-0 bg-black/60" onClick={() => { actions.setForwardingMessage(null); onClose(); }}></div>
             <div className="bg-[#111818] rounded-lg w-96 p-4 z-60 border border-gray-800 shadow-lg">
                 <div className="flex items-center justify-between mb-3">
                     <h3 className="text-lg font-semibold text-white">Forward Message</h3>
                     <button onClick={() => { actions.setForwardingMessage(null); onClose(); }}><IoIosClose size={22} className="text-gray-400"/></button>
                 </div>

                 <div className="mb-3 p-3 rounded border border-gray-800 bg-[#0f1414] text-sm text-gray-200">
                     {forwardingMessage.content || forwardingMessage.message || forwardingMessage.body || 'No content to forward'}
                 </div>

                 <div className="max-h-52 overflow-y-auto rounded border border-gray-800 p-1">
                     {(chats || []).filter(c => !(forwardingMessage.groupID && c.group && String(c.groupID) === String(forwardingMessage.groupID))).map(c => (
                         <div key={c.group ? `g-${c.groupID}` : `u-${c.userID || c.email}`} className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer">
                             <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 rounded-full bg-gray-700 bg-center bg-cover" style={{ backgroundImage: `url(${c.group ? (c.groupAvatarUrl || '') : (c.avatarUrl || '')})` }}></div>
                                 <div>
                                     <div className="text-sm text-white">{c.username}</div>
                                     <div className="text-xs text-gray-400">{c.group ? 'Group' : (c.email || c.userID)}</div>
                                 </div>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => handleForwardTo(c)} className="px-3 py-1 bg-[#137fec] text-white rounded">Forward</button>
                             </div>
                         </div>
                     ))}
                     {((chats || []).filter(c => !(forwardingMessage.groupID && c.group && String(c.groupID) === String(forwardingMessage.groupID))).length === 0) && (
                         <div className="p-3 text-sm text-gray-400">No target conversations available</div>
                     )}
                 </div>

                 <div className="mt-4 flex justify-end gap-2">
                     <button onClick={() => { actions.setForwardingMessage(null); onClose(); }} className="px-3 py-1 bg-gray-700 text-white rounded">Close</button>
                 </div>
             </div>
        </div>
    )
}