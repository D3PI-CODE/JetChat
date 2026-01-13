import Sequelize from 'sequelize';
import { UserModel } from './user.model.js';
import type sequelize from 'sequelize';

export const groupMember = (sequelize : Sequelize.Sequelize) => {
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
    sequelize: Sequelize.Sequelize;
    GroupMember: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    User: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    constructor(sequelize : Sequelize.Sequelize) {
        this.sequelize = sequelize;
        this.GroupMember = groupMember(sequelize);
        this.User = new UserModel(sequelize).getUserModel();
    }

    getGroupMemberModel() {
        return this.GroupMember;
    }

    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { GroupMemberModel };