import { io, messagingDB } from '../../index.js'
import { UserModel } from '../../models/user.model.js';
import {GroupModel} from '../../models/Group.model.js';

export const broadcastGroups = async () => {
    try {
        const groupModelInstance = new GroupModel(messagingDB);
        const groupModel = groupModelInstance.getGroupModel();
        // Build per-member group lists and emit only to those members.
        const allGroups = await groupModel.findAll({ raw: true });
        const allMembers = await groupModelInstance.GroupMember.findAll({ raw: true });

        // Fetch users up-front so we can enrich member objects and map id<->email
        const userModel = new UserModel(messagingDB);
        const allUsersFull = await userModel.getUserModel().findAll({ raw: true });

        // Map groupid -> group info (we'll add members below)
        const groupsById = new Map();
        for (const g of allGroups) {
            groupsById.set(String(g.groupid), {
                groupid: g.groupid,
                groupName: g.groupName,
                description: g.description,
                CreatorID: g.CreatorID,
                // support either column name: `groupAvatar` or `groupAvatarUrl`
                groupAvatar: g.groupAvatar || g.groupAvatarUrl || null,
                groupAvatarUrl: g.groupAvatarUrl || g.groupAvatar || null,
                members: [],
            });
        }

        // Aggregate groups per member identifier (memberID can be DB id or email depending on how stored)
        // Build users map to enrich members with name/email (keyed by both id and email)
        const usersById = new Map();
        for (const u of allUsersFull || []) {
            if (u.id) usersById.set(String(u.id), u);
            if (u.email) usersById.set(String(u.email), u);
        }

        // Populate each group's members array and build per-member group lists
        const memberGroupsMap = new Map();
        for (const gm of allMembers) {
            const memberId = gm && (gm.memberID || (typeof gm.getDataValue === 'function' ? gm.getDataValue('memberID') : undefined));
            const gid = gm && (gm.groupID || (typeof gm.getDataValue === 'function' ? gm.getDataValue('groupID') : undefined));
            if (!memberId || !gid) continue;
            const key = String(gid);
            const ginfo = groupsById.get(String(gid));
            if (!ginfo) continue;

            // find user info
            const user = usersById.get(String(memberId)) || usersById.get(String(memberId)) || null;
            const memberObj = {
                id: memberId,
                name: (user && (user.username || user.name)) || null,
                email: (user && user.email) || null,
                role: gm.role || null,
            };

            // add to group's members array (avoid duplicates)
            if (!ginfo.members.some(m => String(m.id) === String(memberId))) {
                ginfo.members.push(memberObj);
            }

            // add group to member's personal groups list
            const memberKey = String(memberId);
            if (!memberGroupsMap.has(memberKey)) memberGroupsMap.set(memberKey, []);
            memberGroupsMap.get(memberKey).push(ginfo);
        }

        // Build id<->email lookup maps so we can emit to alternate rooms if needed
        const idToEmail = new Map();
        const emailToId = new Map();
        for (const u of allUsersFull || []) {
            if (u.id) idToEmail.set(String(u.id), u.email);
            if (u.email) emailToId.set(String(u.email), u.id);
        }

        // Emit to each member's room(s)
        for (const [memberKey, groupsArr] of memberGroupsMap.entries()) {
            try {
                // Emit to the room matching the stored member identifier
                io.to(String(memberKey)).emit('groups', groupsArr);

                // If the memberKey is a DB id and we know the email, also emit to email room
                const mappedEmail = idToEmail.get(String(memberKey));
                if (mappedEmail) {
                    io.to(String(mappedEmail)).emit('groups', groupsArr);
                }

                // If the memberKey is an email and we know the id, also emit to id room
                const mappedId = emailToId.get(String(memberKey));
                if (mappedId) {
                    io.to(String(mappedId)).emit('groups', groupsArr);
                }
            } catch (emitErr) {
                console.error('Error emitting groups to member', memberKey, emitErr && emitErr.message);
            }
        }
        console.log(`broadcastGroups: emitted groups to ${memberGroupsMap.size} member identifiers`);
    } catch (err) {
        console.error('Error broadcasting groups:', err);
    }
};