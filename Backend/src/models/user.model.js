import Sequelize from 'sequelize';

export const User = (sequelize) => {
    const UserModel = sequelize.define(
        'User',
        {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false
            },
            avatarUrl: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            Bio: {
                type: Sequelize.STRING,
                defaultValue: '',
            },
        },
        {
            tableName: 'users',
            timestamps: false,
        }
    );

    return UserModel;
};

class UserModel {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.User = User(sequelize);
        this.model = sequelize.models;
    }

    getUserModel() {
        return this.User;
    }

    createUser(email, username) {
        return this.User.create({
            email, 
            username,
        });
    }
    emailSearch(email) {
        if (!email) {
            // Avoid passing undefined into Sequelize WHERE
            console.warn('UserModel.emailSearch called with falsy email:', email);
            return Promise.resolve(null);
        }
        return this.model.User.findOne({ where: { email: email } })
            .then((user)=> {
                return user ? user.getDataValue("id") : null;
            })
    }
    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserModel };