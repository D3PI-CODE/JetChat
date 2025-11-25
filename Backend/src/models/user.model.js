import Sequelize from 'sequelize';

export const User = (sequelize) => {
    const UserModel = sequelize.define(
        'User',
        {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            username: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
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

    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserModel };