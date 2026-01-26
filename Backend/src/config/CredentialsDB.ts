import { Sequelize } from 'sequelize';

export function initializeCredentialsDB(): Sequelize {
    const sequelize = new Sequelize({
        dialect : 'postgres',
        host : process.env.DB_HOST
            || 'localhost',
        port : process.env.DB_PORT
            ? parseInt(process.env.DB_PORT, 10)
            : 5432,
        database : process.env.CREDDB_NAME,
        username : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        logging : false,
    }) ;
    sequelize.authenticate().then(() => {
        console.log(`Connection to ${sequelize.getDatabaseName()} has been established successfully.`);
    }).catch((error: unknown) => {
        console.error(`Unable to connect to the ${sequelize.getDatabaseName()} database:`, error);
    });
    return sequelize;
}