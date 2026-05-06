# Project Management Tool

<<<<<<< HEAD
A full-stack collaborative project management tool real-time updates using WebSockets.
=======
Full-stack Project Management Tool (Backend: Node.js/Express + PostgreSQL, Frontend: static Node server).
>>>>>>> e5e8032 (Initial Commit)

## 1) Prerequisites

- Node.js 18+
- npm
- PostgreSQL connection string (Neon or local)

## 2) Clone and Open

<<<<<<< HEAD
### Backend
- **Node.js** & **Express.js** - Server framework
- **PostgreSQL (Neon)** - Cloud database
- **Sequelize** - ORM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **Create React App** - Build tool and development server
- **React Router** - Routing
- **Zustand** - State management
- **Custom CSS** - Styling with CSS variables
- **Socket.io Client** - WebSocket client
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

=======
```powershell
git clone https://github.com/Jukta06/Project-Management-Tool.git
cd "Project-Management-Tool"
```

## 3) Install Dependencies

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

## 4) Environment Setup

Create backend env:

```powershell
Copy-Item backend/.env.example backend/.env
```

Create frontend env:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

Update backend .env (minimum required):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@host/dbname?sslmode=require
DB_SSL=true
DB_LOGGING=false
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRE=7d
CLIENT_URLS=http://localhost:3000
```

Update frontend .env:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 5) Run in Localhost (Single Command)

From project root:

```powershell
npm run dev
```

Localhost URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## 6) Run in Localhost (Two Terminals)

Terminal 1:

```powershell
cd "backend"
npm run dev
```

Terminal 2:

```powershell
cd "frontend"
npm start
```

## 7) Build Frontend

```powershell
npm run build --prefix frontend
```
>>>>>>> e5e8032 (Initial Commit)
