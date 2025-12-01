import 'dotenv/config';
import express from 'express';
import routes from './routes/auth.routes.js';
import cors from 'cors';
import { initializeCredentialsDB } from './lib/CredentialsDB.js';
import { UserAuthModel } from './models/userAuth.model.js';
import { initializeMessagingDB } from './lib/MessagingDB.js';
import { UserModel } from './models/user.model.js';
import {Server} from "socket.io";
import http from "http";
import { connection} from './controllers/socket.controllers.js';
import { MessageModel } from './models/message.model.js';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5002; 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/auth", routes);

io.on("connection", connection);

//initialize databases
export const credentialsDB = await initializeCredentialsDB();
export const messagingDB = await initializeMessagingDB();

// Ensure DB models are synced before starting the HTTP server
const userAuthModel = new UserAuthModel(credentialsDB);
const userModel = new UserModel(messagingDB);
const messageModel = new MessageModel(messagingDB);
// ensure DB schema updates (adds avatarUrl if missing)
await userModel.sync({ alter: true });
await userAuthModel.sync();
await messageModel.sync({alter: true});


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

