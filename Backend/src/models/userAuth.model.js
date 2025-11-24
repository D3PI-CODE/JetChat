import Sequelize from 'sequelize';

export const UserAuth = (sequelize) => {
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
        },
        {
            tableName: 'users',
            timestamps: false,
        }
    );

    return UserAuthModel;
};

class UserAuthModel {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.UserAuth = UserAuth(sequelize);
        this.model = sequelize.models;
    }

    getUserModel() {
        return this.UserAuth;
    }

    createUser(email, password) {
        return this.UserAuth.create({
            email, 
            password });
    }
    emailSearch(email) {
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
    getPassword(UserID) {
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
    async sync(options = {}) {
        await this.sequelize.sync(options);
    }
}

export { UserAuthModel };