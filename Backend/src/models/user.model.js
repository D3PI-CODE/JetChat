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
        return this.model.User.findOne({ where: { email: email } })
            .then(user => {
                if (!user) {
                    return null
                }
                return user.getDataValue("id");
            });
    }
    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserModel };