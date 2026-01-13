import Sequelize from 'sequelize';
import { UserModel } from './user.model.js';
import { GroupMemberModel } from './groupMember.model.js';

export const group = (sequelize : Sequelize.Sequelize) => {
    const groupModel = sequelize.define(
        'Group',
        {
            groupid: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            groupName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            CreatorID: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            groupAvatarUrl: {
                type: Sequelize.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'groups',
            createdAt: true,
            updatedAt: false,
        }

    );

    return groupModel;
};

class GroupModel {
    sequelize : Sequelize.Sequelize;
    Group: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    GroupMember: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    User: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    model: any;
    constructor(sequelize: Sequelize.Sequelize) {
        this.sequelize = sequelize;
        this.Group = group(sequelize);
        this.GroupMember = new GroupMemberModel(sequelize).getGroupMemberModel();
        this.User = new UserModel(sequelize).getUserModel();

        try {
            this.User.belongsToMany(this.Group, {through: this.GroupMember, foreignKey: 'memberID'});
            this.Group.belongsToMany(this.User, {through: this.GroupMember, foreignKey: 'groupID'});
        
        } catch (err) {
            console.error('Error setting up associations in GroupModel:', err);
        }
    }

    getGroupModel(): Sequelize.ModelStatic<Sequelize.Model<any, any>> {
        return this.Group;
    }

    async createGroup(groupName: string, description: string, CreatorID: string) {
        const transaction = await this.sequelize.transaction();
        try {
            const group = await this.Group.create({
                groupName,
                description,
                CreatorID
            }, { transaction });
            
            // Add the creator as a member of the group
            await this.GroupMember.create({
                groupID: group.getDataValue('groupid'),
                memberID: CreatorID,
                role: 'owner'
            }, { transaction });

            await transaction.commit();
            return group;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    deleteGroup(groupID: string) {
        return this.Group.destroy({
            where: { groupid: groupID }
        });
    }

    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { GroupModel };