import React from 'react';
import { MdGroupAdd, MdGroupRemove, MdExitToApp, MdOutlineDeleteOutline, MdDriveFileRenameOutline } from "react-icons/md";
import { IoIosClose } from "react-icons/io";
import { Chat, ModalsState, GroupMember, User } from '../types';

interface GroupModalsState {
  activeChat: Chat | null;
  modals: ModalsState;
  groupMembersMap: Record<string, GroupMember[]>;
  myRole: 'owner' | 'admin' | 'member' | null;
  myEmail: string | null;
  users: Chat[];
  selectedToAdd: string[] | null;
  newGroupName: string;
}

interface GroupModalsActions {
  toggleModal: (name: string, value: boolean) => void;
  setSelectedToAdd: React.Dispatch<React.SetStateAction<string[] | null>>;
  changeRole: (member: GroupMember, newRole: string) => void;
  removeMember: (member: GroupMember) => void;
  addMembers: () => void;
  renameGroupSubmit: () => void;
  deleteGroup: () => void;
  leaveGroup: () => void;
}

interface GroupModalsProps {
  state: GroupModalsState;
  actions: GroupModalsActions;
}

export const GroupModals = ({ state, actions }: GroupModalsProps) => {
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
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                        onClick={() => actions.toggleModal('membersList', false)}
                    ></div>
                    <div className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 max-w-lg p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                        <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                            <h3 className="text-lg font-semibold text-white drop-shadow-sm">Group Members</h3>
                            <button
                                onClick={() => actions.toggleModal('membersList', false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            >
                                <IoIosClose size={28} />
                            </button>
                        </div>
                        {/* Admin Toolbar */}
                        <div className='flex gap-3 pb-4 mb-6 border-b border-white/10'>
                            {myRole && (
                                <button
                                    onClick={() => actions.toggleModal('addMembers', true)}
                                    className="p-2.5 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-110 hover:rotate-6 transition-all duration-600 ease-out group relative overflow-hidden"
                                >
                                    <MdGroupAdd size={16} className="group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => actions.toggleModal('renameGroup', true)}
                                    className="p-2.5 bg-linear-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-2xl hover:shadow-gray-500/30 hover:scale-110 hover:rotate-6 transition-all duration-600 ease-out group relative overflow-hidden"
                                >
                                    <MdDriveFileRenameOutline size={16} className="group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                                </button>
                            )}
                            {isOwner && (
                                <button
                                    onClick={() => actions.toggleModal('confirmDeleteGroup', true)}
                                    className="p-2.5 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-2xl hover:shadow-red-500/30 hover:scale-110 hover:-rotate-6 transition-all duration-600 ease-out group relative overflow-hidden"
                                >
                                    <MdOutlineDeleteOutline size={16} className="group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                                </button>
                            )}
                        </div>
                        {/* Member List */}
                        <ul className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {members.map(m => {
                                const isSelf = m.email === myEmail;
                                const canManage = isAdmin && !isSelf && (m.role !== 'owner'); // Simplified check
                                return (
                                    <li key={m.email} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-all duration-300 group">
                                        <div>
                                            <div className="font-medium text-white drop-shadow-sm">{m.name || m.email}</div>
                                            <div className="text-xs text-white/60">{m.email}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {m.role === 'owner' ? (
                                                <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 shadow-sm">owner</span>
                                            ) : (
                                                isAdmin && !isSelf ? (
                                                     <select
                                                        value={m.role || 'member'}
                                                        onChange={(e) => actions.changeRole(m, e.target.value)}
                                                        className="text-xs bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-lg px-3 py-1 border border-white/20 shadow-sm hover:shadow-md transition-all duration-300"
                                                     >
                                                         <option value="admin">admin</option>
                                                         <option value="member">member</option>
                                                     </select>
                                                ) : (
                                                    <span className="text-xs text-white/60">{m.role || 'member'}</span>
                                                )
                                            )}
                                            {canManage && (
                                                <button
                                                    onClick={() => actions.removeMember(m)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg p-2 transition-all duration-300 hover:scale-110"
                                                >
                                                    <MdGroupRemove size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className='flex justify-end mt-6'>
                            <button
                                onClick={actions.leaveGroup}
                                className="px-4 py-2 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                            >
                                <MdExitToApp size={18} className="mr-2" />
                                Leave Group
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Add Members Modal */}
            {modals.addMembers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                        onClick={() => actions.toggleModal('addMembers', false)}
                    ></div>
                    <div className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                        <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                            <h3 className="text-lg font-semibold text-white drop-shadow-sm">Add Members</h3>
                            <button
                                onClick={() => actions.toggleModal('addMembers', false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            >
                                <IoIosClose size={24} />
                            </button>
                        </div>

                        <div className="text-sm text-white/70 mb-4 drop-shadow-sm">Select users to add to the group</div>

                        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent rounded-xl border border-white/10 p-2 mb-4">
                            {(users || []).filter(u => !u.group && u.email !== myEmail && !members.find(m => m.email === u.email)).map(u => (
                                <div key={u.email} onClick={() => {
                                    const exists = (selectedToAdd || []).includes(u.email);
                                    actions.setSelectedToAdd(prev => exists ? (prev || []).filter(e => e !== u.email) : [...(prev || []), u.email]);
                                }} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all duration-300 group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-linear-to-br from-white/30 to-white/10 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm text-white font-semibold border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 relative z-10">
                                                {(u.username || u.email || '').slice(0,1).toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-white drop-shadow-sm">{u.username}</div>
                                            <div className="text-xs text-white/60">{u.email}</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={(selectedToAdd || []).includes(u.email)}
                                        readOnly
                                        className="w-5 h-5 accent-blue-500 rounded border-white/20"
                                    />
                                </div>
                            ))}
                            {((users || []).filter(u => !u.group && u.email !== myEmail && !members.find(m => m.email === u.email)).length === 0) && (
                                <div className="p-4 text-sm text-white/60 text-center">No eligible users to add</div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-sm text-white/60 drop-shadow-sm">Selected: {(selectedToAdd || []).length}</div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { actions.setSelectedToAdd([]); actions.toggleModal('addMembers', false); }}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={actions.addMembers}
                                    disabled={!((selectedToAdd || []).length)}
                                    className={`px-4 py-2 rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-white/20 ${
                                        ((selectedToAdd || []).length)
                                            ? 'bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                                            : 'bg-white/10 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    Add Members
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Create Group Modal */}
            {modals.createGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                        onClick={() => actions.toggleModal('createGroup', false)}
                    ></div>
                    <form onSubmit={actions.createGroup} className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                        <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                            <h3 className="text-lg font-semibold text-white drop-shadow-sm">Create Group</h3>
                            <button
                                onClick={() => actions.toggleModal('createGroup', false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            >
                                <IoIosClose size={24} />
                            </button>
                        </div>
                        <div className="text-sm text-white/70 mb-4 drop-shadow-sm">Enter a name for the new group</div>
                        <input
                            value={newGroupName}
                            onChange={(e) => actions.setNewGroupName(e.target.value)}
                            className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 shadow-lg"
                            placeholder="Group Name"
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => actions.toggleModal('createGroup', false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-white/20"
                            >
                                Create Group
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rename Group Modal */}
            {modals.renameGroup && activeChat?.group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                        onClick={() => actions.toggleModal('renameGroup', false)}
                    ></div>
                    <form onSubmit={(e) => { e.preventDefault(); actions.renameGroupSubmit(); }} className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                        <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                            <h3 className="text-lg font-semibold text-white drop-shadow-sm">Rename Group</h3>
                            <button
                                onClick={() => actions.toggleModal('renameGroup', false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            >
                                <IoIosClose size={24} />
                            </button>
                        </div>
                        <div className="text-sm text-white/70 mb-2 drop-shadow-sm">
                            Current: <span className="text-white font-medium">{activeChat.username}</span>
                        </div>
                        <input
                            value={newGroupName}
                            onChange={(e) => actions.setNewGroupName(e.target.value)}
                            className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 shadow-lg mt-4"
                            placeholder="New group name"
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => { actions.setNewGroupName(''); actions.toggleModal('renameGroup', false); }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-white/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Confirm Delete Group Modal */}
            {modals.confirmDeleteGroup && activeChat?.group && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                        onClick={() => actions.toggleModal('confirmDeleteGroup', false)}
                    ></div>
                    <div className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                        <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                            <h3 className="text-lg font-semibold text-white drop-shadow-sm">Delete Group</h3>
                            <button
                                onClick={() => actions.toggleModal('confirmDeleteGroup', false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                            >
                                <IoIosClose size={24} />
                            </button>
                        </div>

                        <div className="text-sm text-white/70 mb-6 drop-shadow-sm">
                            Are you sure you want to delete <span className="text-white font-medium">"{activeChat.username}"</span>?
                            This action cannot be undone and will permanently remove the group and all its messages.
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="text-red-400">
                                    <MdOutlineDeleteOutline size={24} />
                                </div>
                                <div>
                                    <div className="text-sm text-red-300 font-medium">Warning</div>
                                    <div className="text-xs text-red-400/80">
                                        All group members will be removed and all messages will be permanently deleted.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => actions.toggleModal('confirmDeleteGroup', false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    actions.deleteGroup();
                                    actions.toggleModal('confirmDeleteGroup', false);
                                }}
                                className="px-4 py-2 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-red-500/20"
                            >
                                Delete Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

interface ForwardModalProps {
  chats: Chat[];
  onClose: () => void;
  forwardingMessage: Message | null;
  actions: {
    setActiveChat: (chat: Chat) => void;
    setMessage: (message: string) => void;
    sendMessage: () => void;
    toggleModal: (name: string, value: boolean) => void;
    setForwardingMessage: (message: Message | null) => void;
  };
}

export const ForwardModal = ({ chats, onClose, forwardingMessage, actions }: ForwardModalProps) => {
    if (!forwardingMessage) return null;

    const handleForwardTo = (target: Chat) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-fade-in">
             <div
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop-in"
                 onClick={() => { actions.setForwardingMessage(null); onClose(); }}
             ></div>
             <div className="bg-black/12 backdrop-blur-2xl rounded-2xl shadow-xl w-96 p-6 z-60 relative border border-white/8 animate-modal-slide-up transform-gpu">
                 <div className="flex items-center justify-between mb-4 animate-modal-content-in">
                     <h3 className="text-lg font-semibold text-white drop-shadow-sm">Forward Message</h3>
                     <button
                         onClick={() => { actions.setForwardingMessage(null); onClose(); }}
                         className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-300 hover:scale-110 hover:rotate-90"
                     >
                         <IoIosClose size={24} />
                     </button>
                 </div>

                 <div className="mb-4 p-4 rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm text-sm text-white drop-shadow-sm">
                     {forwardingMessage.content || forwardingMessage.message || forwardingMessage.body || 'No content to forward'}
                 </div>

                 <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent rounded-xl border border-white/10 p-2">
                     {(chats || []).filter(c => !(forwardingMessage.groupID && c.group && String(c.groupID) === String(forwardingMessage.groupID))).map(c => (
                         <div key={c.group ? `g-${c.groupID}` : `u-${c.userID || c.email}`} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all duration-300 group">
                             <div className="flex items-center gap-3">
                                 <div className="relative">
                                     <div className="absolute inset-0 bg-linear-to-br from-white/30 to-white/10 rounded-full blur-sm group-hover:blur-md transition-all duration-300"></div>
                                     <div
                                         className="w-10 h-10 rounded-full bg-white/20 border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 relative z-10 bg-center bg-cover"
                                         style={{ backgroundImage: `url(${c.group ? (c.groupAvatarUrl || '') : (c.avatarUrl || '')})` }}
                                     ></div>
                                 </div>
                                 <div>
                                     <div className="text-sm text-white drop-shadow-sm">{c.username}</div>
                                     <div className="text-xs text-white/60">{c.group ? 'Group' : (c.email || c.userID)}</div>
                                 </div>
                             </div>
                             <div className="flex gap-2">
                                 <button
                                     onClick={() => handleForwardTo(c)}
                                     className="px-4 py-2 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-white/20"
                                 >
                                     Forward
                                 </button>
                             </div>
                         </div>
                     ))}
                     {((chats || []).filter(c => !(forwardingMessage.groupID && c.group && String(c.groupID) === String(forwardingMessage.groupID))).length === 0) && (
                         <div className="p-4 text-sm text-white/60 text-center">No target conversations available</div>
                     )}
                 </div>

                 <div className="mt-6 flex justify-end gap-3">
                     <button
                         onClick={() => { actions.setForwardingMessage(null); onClose(); }}
                         className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                     >
                         Close
                     </button>
                 </div>
             </div>
        </div>
    )
}
