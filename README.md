# JetChat — Realtime Messaging, Simplified

<!-- Tech stack badges -->
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)


JetChat is a lightweight, beautiful realtime chat application built with React (Vite) on the frontend and Node.js + Socket.IO on the backend. It's designed for fast prototyping and clear, maintainable messaging flows.

---

## ✨ Highlights

- Clean, modern UI with dark/light-friendly theme
- Realtime messaging using Socket.IO
- Conversation-level message filtering (show only messages for the active chat)
- Simple authentication and token-based session flow
- Modular backend controllers and lightweight message models for easy extension

---

## 🧭 Quick demo

Open two browser windows, sign in with two accounts, and chat in realtime. Switching active conversations automatically requests that conversation's messages and updates realtime message delivery.

---

## 🛠 Tech stack

- Frontend: React + Vite, Tailwind 
- Backend: Node.js, Express, Socket.IO
- Data: Lightweight JS models (message, user); pluggable DB layer (MessagingDB / CredentialsDB)

Files you’ll care about:
- `Frontend/src/pages/chat.jsx` — Main chat UI + socket handlers
- `Frontend/src/pages/Textbubble.jsx` — Message rendering component
- `Backend/src/controllers/socket.controllers.js` — Socket event handling
- `Backend/src/routes/messaging.routes.js` — Messaging API endpoints

---

## ⚙️ Prerequisites

- Node 18+ (or a compatible LTS)
- npm or yarn
- PostgreSQL (recommended) — JetChat's DB layer is pluggable; Postgres is tested in this repo

---

## 🚀 Running locally

Open two terminals (one for backend, one for frontend).

Backend:

```bash
cd "./Backend"
npm install
# create a .env with the variables listed below
npm run dev
```

Frontend:

```bash
cd "./Frontend"
npm install
npm run dev
```

Then open the frontend URL printed by Vite (usually http://localhost:5173) in two windows to test realtime messaging.

---

## 🔐 Environment variables

Place a `.env` file in the `Backend/` folder. This project supports both an explicit Postgres connection (host/port/user/password) or a single `DATABASE_URL`. Include the following variables as a minimum:

Option A — full Postgres connection (recommended for clarity):

```env
# server
PORT=5002
NODE_ENV=development

# postgres connection (individual values)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=jetchat

# names for pluggable DB layers (optional)
CREDDB_NAME=CredentialsDB
MSGDB_NAME=MessagingDB

# jwt
JWT_SECRET=your_jwt_secret_here
```

Option B — single connection string (convenient for cloud/oneliner):

```env
PORT=5002
DATABASE_URL=postgresql://<db_user>:<db_pass>@localhost:5432/jetchat
JWT_SECRET=your_jwt_secret_here
```

Notes:
- If `DATABASE_URL` is present, the backend can parse and use it; otherwise it composes a connection string from `DB_*` vars.
- For production, prefer secure secrets management and avoid committing `.env` to source control.

---

## 🧩 Architecture notes

- The frontend connects to the socket server at `http://localhost:5002` and authenticates by sending `auth` data (email) on connect.
- When you select a conversation, the client emits `getMessages` (myEmail, activeChatEmail) and the server responds with `previousMessages` for that conversation.
- Outgoing messages are emitted as `sendMessage` payloads; the server relays them by targeting a socket id (`io.to(targetSocketId)`).
- The frontend keeps `activeChatRef` (a React ref) in sync with the selected chat to avoid stale closures in socket handlers. Messages are filtered by `fromEmail` / `toEmail` so only the active conversation displays in the UI.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes, add tests if appropriate
4. Open a pull request describing the change

---

## Next improvements (ideas)

- Persist messages using PostgreSQL (migrations + pagination) and add lazy-loading for older messages.
- Add delivery/read receipts, typing indicators, and message edits/deletes.
- Improve UI accessibility, responsive layout, and theming options.
- Add automated tests for socket flows and unit tests for controllers.

---

If you want, I can also add a small `docker-compose.yml` to spin up Postgres + backend + frontend for a one-command local dev environment.

---

## License

MIT — feel free to reuse and adapt JetChat for demos and prototypes.

---

If you want, I can also add a screenshot, badges (build / license), or a `docker-compose.yml` for local development.
