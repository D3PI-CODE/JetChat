import Sequelize from 'sequelize';
import { UserModel } from './user.model.js';

export const groupMember = (sequelize) => {
    const groupMemberModel = sequelize.define(
        'GroupMember',
        {
            groupMemvberid: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            groupID: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            memberID: {
                type: Sequelize.STRING,
                allowNull: false
            },
            role: {
                type: Sequelize.STRING,
                defaultValue: 'member',
            },
        },
        {
            tableName: 'group_members',
            createdAt: true,
            updatedAt: false,
        }

    );

    return groupMemberModel;
};

class GroupMemberModel {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.GroupMember = groupMember(sequelize);
        this.User = new UserModel(sequelize).getUserModel();
        this.model = sequelize.models;
    }

    getGroupMemberModel() {
        return this.GroupMember;
    }

    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { GroupMemberModel };