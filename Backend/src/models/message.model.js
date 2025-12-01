import Sequelize from 'sequelize';
import { User, UserModel } from './user.model.js';

export const message = (sequelize) => {
    const messageModel = sequelize.define(
        'Message',
        {
            messageid: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            senderID: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            receiverID: {
                type: Sequelize.UUID,
                allowNull: false
            },
            content: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
            read: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            tableName: 'messages',
            createdAt: true,
            updatedAt: false,
        }

    );

    return messageModel;
};



class MessageModel {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.Message = message(sequelize);
        this.User = new UserModel(sequelize).getUserModel();
        this.model = sequelize.models;

        try {
            this.User.hasMany(this.Message, { foreignKey: 'senderID' });
            this.User.hasMany(this.Message, { foreignKey: 'receiverID'});
            this.Message.belongsTo(this.User, { foreignKey: 'senderID'});
            this.Message.belongsTo(this.User, { foreignKey: 'receiverID'});
        } catch (err) {
            console.error('Error setting up associations in MessageModel:', err);
        }
    }

    getMessageModel() {
        return this.Message;
    }

    createMessage(senderID, receiverID, content) {
        return this.Message.create({
            senderID,
            receiverID,
            content,
        })
    }
    getMsgByUserIDs(senderID, receiverID) {
        return this.Message.findAll({
            where: {
                senderID: senderID,
                receiverID: receiverID,
            },
            order: [['createdAt', 'ASC']],
            include: this.User,        
        });
    }
    updateReadStatus(messageID, readStatus) {
        return this.Message.update(
            { read: readStatus },
            { where: { messageid: messageID } }
        );
    }
    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { MessageModel };