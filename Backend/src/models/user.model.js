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
            username: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
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
        this.models = sequelize.models;
    }

    getUserModel() {
        return this.User;
    }

    createUser(username, email, password) {
        return this.User.create({ username,
            email, 
            password });
    }

    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserModel };