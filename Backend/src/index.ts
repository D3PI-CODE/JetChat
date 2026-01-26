import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import authRoutes from './routes/auth.routes.js';
import messagingRoutes from './routes/messaging.routes.js';
import cors from 'cors';
import session from 'express-session';
import AdminJSPkg from 'adminjs';
const AdminJS = (AdminJSPkg as any).default || AdminJSPkg;
import AdminJSExpress from '@adminjs/express';
import AdminJSSequelize from '@adminjs/sequelize';
import bcrypt from 'bcryptjs';
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

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    adminUser?: any;
    isAdmin?: boolean;
  }
}

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

// Session middleware
app.use(session({
  secret: process.env.ADMIN_SESSION_SECRET || 'admin-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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
await userModel.sync({ force: false });
await userAuthModel.sync({ force: false });
await messageModel.sync({ force: false });
await groupModel.sync({ force: false });
await groupMemberModel.sync({ force: false });
// Initialize Redis
await redisInitialization();

// Create a test admin user if none exists
try {
  const adminEmail = 'admin@test.com';
  const adminPassword = 'admin123';

  const existingAdmin = await userAuthModel.emailSearch(adminEmail);
  if (!existingAdmin) {
    console.log('Creating test admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user in auth database
    await userAuthModel.createUser(adminEmail, hashedPassword);

    // Create admin user in messaging database
    await userModel.createUser(adminEmail, 'Admin User');

    // Update the role to admin in auth database
    const adminUser = await userAuthModel.getUserModel().findOne({ where: { email: adminEmail } });
    if (adminUser) {
      await adminUser.update({ role: 'admin' });
      console.log('Test admin user created successfully!');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
    }
  } else {
    console.log('Admin user already exists');
  }
} catch (error: unknown) {
  console.error('Error creating test admin user:', error);
}

// AdminJS Authentication Function
const authenticate = async (email: string, password: string) => {
  try {
    // Check if user exists in credentials database
    const credUserId = await userAuthModel.emailSearch(email);
    if (!credUserId) {
      return null; // User not found
    }

    // Get user password and status
    const userPass = await userAuthModel.getPassword(credUserId);
    const userStatus = await userAuthModel.getStatus(credUserId);
    const userRole = await userAuthModel.getRole(credUserId);

    // Check if password exists and account is enabled
    if (!userPass || userStatus !== 'enabled') {
      return null;
    }

    if (userRole !== 'admin') {
      return null; // Not an admin user
    }

    // Verify password
    const isPassValid = await bcrypt.compare(password, userPass);
    if (!isPassValid) {
      return null; // Invalid password
    }

    // Return admin user object
    return {
      email: email,
      id: credUserId,
      role: 'admin'
    };
  } catch (error: unknown) {
    console.error('Admin authentication error:', error);
    return null;
  }
};

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
  loginPath: '/admin/login',
  logoutPath: '/admin/logout',

});

// Move AdminJS router to the end
const adminRouter = (AdminJSExpress as any).buildAuthenticatedRouter(admin, {
  authenticate,
  cookiePassword: process.env.ADMIN_COOKIE_PASSWORD || 'admin-secret-password-change-in-production',
  cookieName: 'adminjs',
}, null, {
  resave: false,
  saveUninitialized: false,
  secret: process.env.ADMIN_SESSION_SECRET || 'admin-session-secret-change-in-production',
});

app.post('/admin/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const authenticateResult = await authenticate(email, password);
    if (authenticateResult) {
      // Set session data for AdminJS
      (req.session as any).adminUser = authenticateResult;
      (req.session as any).isAdmin = true;

      // Redirect to admin dashboard
      return res.redirect('/admin');
    } else {
      // Authentication failed
      return res.redirect('/admin/login?error=Invalid email or password');
    }
  } catch (error: unknown) {
    console.error('Login error:', error);
    return res.redirect('/admin/login?error=Login failed. Please try again.');
  }
});

app.use(admin.options.rootPath, adminRouter);


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
