import Sequelize from 'sequelize';
import { randomUUID } from 'crypto';

export const User = (sequelize) => {
    const UserModel = sequelize.define(
        'User',
        {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
                defaultValue: () => `USER-${randomUUID()}`,
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

    async createUser(email, username, attempts = 0) {
        try {
            // Attempt to create. If successful, it returns the user.
            const user = await this.User.create({
                email,
                username,
            });
            return user;
        } catch (error) {
            // Check if this is a Unique Constraint Error (Collision)
            if (error.name === 'SequelizeUniqueConstraintError') {
                if (error.fields.id) {
                    console.warn(`UUID Collision for USER ID detected. Retrying... (Attempt ${attempts + 1})`);
                    return this.createUser(email, username);
                }
            }
            throw error;
        }
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