import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/auth.routes.js';
import cors from 'cors';
import { initializeCredentialsDB } from './lib/CredentialsDB.js';
import { UserAuthModel } from './models/userAuth.model.js';
import { initializeMessagingDB } from './lib/MessagingDB.js';
import { UserModel } from './models/user.model.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5002; 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/auth", routes);

export const credentialsDB = await initializeCredentialsDB();
export const messagingDB = await initializeMessagingDB();
const userAuthModel = new UserAuthModel(credentialsDB);
const userModel = new UserModel(messagingDB);
userModel.sync()
userAuthModel.sync()
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

