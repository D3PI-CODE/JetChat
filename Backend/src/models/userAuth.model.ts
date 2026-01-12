import Sequelize from 'sequelize';

export const UserAuth = (sequelize: Sequelize.Sequelize) => {
    const UserAuthModel = sequelize.define(
        'User',
        {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
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
            Status: {
                type: Sequelize.STRING,
                defaultValue: 'enabled',
            },
            role: {
                type: Sequelize.STRING,
                defaultValue: 'user',
            }
        },
        {
            tableName: 'users',
            timestamps: false,
        }
    );

    return UserAuthModel;
};

class UserAuthModel {
    sequelize: Sequelize.Sequelize;
    UserAuth: Sequelize.ModelStatic<Sequelize.Model<any, any>>;
    model: Record<string, Sequelize.ModelStatic<Sequelize.Model<any, any>>>;
    constructor(sequelize: Sequelize.Sequelize) {
        this.sequelize = sequelize;
        this.UserAuth = UserAuth(sequelize);
        this.model = sequelize.models;
    }

    getUserModel() {
        return this.UserAuth;
    }

    async getRole(UserID: string): Promise<string | null> {
        if (!UserID) {
            console.warn('UserAuthModel.getStatus called with falsy UserID:', UserID);
            return Promise.resolve(null);
        }
        return this.model.User.findOne({where: {id: UserID}})
            .then(user => {
                    if (!user) {
                        return null
                    }
                    return user.getDataValue("role");
                });
    }

    createUser(email: string, password: string) {
        return this.UserAuth.create({
            email, 
            password });
    }
    async emailSearch(email: string): Promise<string | null> {
        if (!email) {
            console.warn('UserAuthModel.emailSearch called with falsy email:', email);
            return Promise.resolve(null);
        }
        return this.model.User.findOne({ where: { email: email } })
            .then(user => {
                if (!user) {
                    return null
                }
                return user.getDataValue("id");
            });
    }
    async getPassword(UserID: string): Promise<string | null> {
        if (!UserID) {
            console.warn('UserAuthModel.getPassword called with falsy UserID:', UserID);
            return Promise.resolve(null);
        }
        return this.model.User.findOne({where: {id: UserID}})
            .then(user => {
                    if (!user) {
                        return null
                    }
                    return user.getDataValue("password");
                });

    }
    async getStatus(UserID: string): Promise<string | null> {
        if (!UserID) {
            console.warn('UserAuthModel.getStatus called with falsy UserID:', UserID);
            return Promise.resolve(null);
        }
        return this.model.User.findOne({where: {id: UserID}})
            .then(user => {
                    if (!user) {
                        return null
                    }
                    return user.getDataValue("Status");
                });
    }
    
    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserAuthModel };