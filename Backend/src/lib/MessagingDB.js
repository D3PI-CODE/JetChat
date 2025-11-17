import Sequelize from 'sequelize';
import dotenv from 'dotenv';

export function initializeMessagingDB() {
    const sequelize = new Sequelize({
        dialect : 'postgres',
        host : process.env.DB_HOST
            || 'localhost',
        port : process.env.DB_PORT
            ? parseInt(process.env.DB_PORT, 10)
            : 5432,
        database : process.env.MSGDB_NAME,
        username : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        logging : false,
    }) ;
    sequelize.authenticate().then(() => {
        console.log(`Connection to ${sequelize.getDatabaseName()} has been established successfully.`);
    }).catch((error) => {
        console.error(`Unable to connect to the ${sequelize.getDatabaseName()} database:`, error);
    });
    return sequelize;
}