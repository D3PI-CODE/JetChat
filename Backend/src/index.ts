import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import messagingRoutes from './routes/messaging.routes.js';
import cors from 'cors';
import AdminJSPkg from 'adminjs'; 
const AdminJS = (AdminJSPkg as any).default || AdminJSPkg;
import AdminJSExpress from '@adminjs/express';
import AdminJSSequelize from '@adminjs/sequelize';
import { initializeCredentialsDB } from './config/CredentialsDB.js';
import { UserAuthModel } from './models/userAuth.model.js';
import { initializeMessagingDB } from './config/MessagingDB.js';
import { UserModel } from './models/user.model.js';
import {Server} from "socket.io";
import http from "http";
import { connection} from './controllers/socket.controllers.js';
import { MessageModel } from './models/message.model.js';
import { redisInitialization } from './config/RedisInit.js';
import { socketAuth } from './middleware/SocketAuth.js';
import { GroupModel } from './models/Group.model.js';
import { GroupMemberModel } from './models/groupMember.model.js';

AdminJS.registerAdapter(AdminJSSequelize);
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
app.use("/api/auth", authRoutes);
app.use("/api/messaging", messagingRoutes);

io.use(socketAuth);
io.on("connection", connection);

//initialize databases
export const credentialsDB = initializeCredentialsDB();
export const messagingDB = initializeMessagingDB();

// Ensure DB models are synced before starting the HTTP server
const userAuthModel = new UserAuthModel(credentialsDB);
const userModel = new UserModel(messagingDB);
const messageModel = new MessageModel(messagingDB);
const groupModel = new GroupModel(messagingDB);
const groupMemberModel = new GroupMemberModel(messagingDB);
// ensure DB schema updates (adds fields if missing)
await userModel.sync({ alter: true });
await userAuthModel.sync({alter:true });
await messageModel.sync({alter: true});
await groupModel.sync({alter: true});
await groupMemberModel.sync({alter: true});
// Initialize Redis
await redisInitialization();

const admin = new AdminJS({
  databases: [], 
  resources: [
    // --- 1. Credentials Users (Keep this CUSTOM) ---
    {
      resource: userAuthModel.getUserModel(),
      options: {
        id: 'auth-users', // <--- Unique ID to avoid conflict
        navigation: { name: 'Credentials DB' },
        properties: {
          password: { isVisible: false }
        }
      }
    },

    // --- 2. Chat Users (Rename this back to DEFAULT) ---
    {
      resource: userModel.getUserModel(),
      options: {
        id: 'users', // <--- FIX: Name it 'users' so AdminJS can find it!
        navigation: { name: 'Messaging DB' },
      }
    },

    // --- 3. Groups ---
    {
      resource: groupModel.getGroupModel(),
      options: { 
        id: 'groups',
        navigation: { name: 'Messaging DB' } 
      }
    },

    // --- 4. Messages ---
    {
      resource: messageModel.getMessageModel(),
      options: {
        id: 'messages',
        navigation: { name: 'Messaging DB' },
        actions: { edit: { isAccessible: false } }
        // Note: We don't need manual 'references' anymore because 
        // AdminJS will automatically find the 'users' resource now.
      }
    },

    // --- 5. Group Members ---
    {
      resource: groupMemberModel.getGroupMemberModel(),
      options: { 
        id: 'group_members',
        navigation: { name: 'Messaging DB' }
      }
    }
  ],
  rootPath: '/admin',
});

const adminRouter = (AdminJSExpress as any).buildRouter(admin);
app.use(admin.options.rootPath, adminRouter);


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

