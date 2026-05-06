# Project Management Tool

A simple project management app where you can create projects, manage tasks, and work with your team.

## Features
- **Sign Up & Login** - Create an account and login
- **Create Projects** - Make new projects and give them names
- **Manage Tasks** - Add tasks, move them between To Do → In Progress → Done
- **Set Task Details** - Add priority, due date, and description to tasks
- **Get Notifications** - See updates about task assignments and project changes
- **Update Your Profile** - Change your name and bio

## Technology

### Backend (Server Side)

- **Node.js** - JavaScript runtime to run the server
- **Express.js** - Web framework for creating APIs
- **PostgreSQL** - Database to store projects, tasks, users
- **Socket.io** - For real-time updates
- **JWT** - Secure login tokens

### Frontend (User Interface)

- **HTML & CSS** 
- **JavaScript** 
- **Node.js Server** 
## How to Run 
### Step 1: Download the project

Open PowerShell and run:

```powershell
git clone https://github.com/Jukta06/Project-Management-Tool.git
cd "Project-Management-Tool"
```

### Step 2: Install packages

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Step 3: Setup backend database

Copy the backend env file:

```powershell
Copy-Item backend/.env.example backend/.env
```

### Step 4: Update backend configuration

Open `backend/.env` and update these lines:

```
PORT=5000
DATABASE_URL=postgresql://username:password@your-database-host/dbname?sslmode=require
JWT_SECRET=your_secret_key_here
CLIENT_URLS=http://localhost:3000
```

### Step 5: Run everything

From the main folder, run:

```powershell
npm run dev
```

### Step 6: Open in browser

- App: http://localhost:3000
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

