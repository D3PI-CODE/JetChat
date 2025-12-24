import Sequelize from 'sequelize';
import { randomUUID } from 'crypto';

export const User = (sequelize: Sequelize.Sequelize) => {
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
    sequelize: Sequelize.Sequelize;
    User: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    model: Record<string, Sequelize.ModelStatic<Sequelize.Model<any, any>>>;
    constructor(sequelize : Sequelize.Sequelize) {
        this.sequelize = sequelize;
        this.User = User(sequelize);
        this.model = sequelize.models;
    }

    getUserModel() {
        return this.User;
    }

    async createUser(email: string, username: string, attempts = 0): Promise<Sequelize.Model<any, any>> {
        try {
            // Attempt to create. If successful, it returns the user.
            const user = await this.User.create({
                email,
                username,
            });
            return user;
        } catch (error: any) {
            // Check if this is a Unique Constraint Error (Collision)
            if (error.name === 'SequelizeUniqueConstraintError') {
                if (error.fields.id) {
                    console.warn(`UUID Collision for USER ID detected. Retrying... (Attempt ${attempts + 1})`);
                    return this.createUser(email, username, attempts + 1);
                }
            }
            throw error;
        }
    }

    async emailSearch(email: string): Promise<string | null> {
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