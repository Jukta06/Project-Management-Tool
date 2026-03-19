# Project Management Tool

A full-stack collaborative project management tool similar to Trello/Asana with real-time updates using WebSockets.

## 🚀 Features

- **User Authentication**: JWT-based authentication system
- **Project Management**: Create, update, and delete projects
- **Task Management**: Create tasks with boards (To Do, In Progress, Done)
- **Team Collaboration**: Add members to projects with role-based access
- **Real-time Updates**: WebSocket integration for live updates
- **Comments System**: Task-level comments with mentions
- **Notifications**: Real-time notifications for task assignments and updates
- **Drag & Drop**: Intuitive task board interface
- **Priority & Tags**: Task prioritization and tagging system
- **File Attachments**: Upload files to tasks

## 🛠️ Tech Stack

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

## 📁 Project Structure

```
Project Management Tool/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── commentController.js
│   │   ├── notificationController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   ├── Comment.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── commentRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── userRoutes.js
│   ├── socket/
│   │   └── socketHandlers.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Layout/
    │   │   │   ├── Layout.jsx
    │   │   │   ├── Layout.css
    │   │   │   ├── Navbar.jsx
    │   │   │   ├── Navbar.css
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── Sidebar.css
    │   │   └── Icons.jsx
    │   ├── lib/
    │   │   ├── axios.js
    │   │   ├── socket.js
    │   │   └── utils.js
    │   ├── pages/
    │   │   ├── Auth/
    │   │   │   ├── Login.jsx
    │   │   │   ├── Register.jsx
    │   │   │   └── Auth.css
    │   │   ├── Dashboard/
    │   │   │   ├── Dashboard.jsx
    │   │   │   └── Dashboard.css
    │   │   ├── Projects/
    │   │   │   ├── Projects.jsx
    │   │   │   ├── Projects.css
    │   │   │   ├── ProjectDetail.jsx
    │   │   │   └── ProjectDetail.css
    │   │   └── Profile/
    │   │       ├── Profile.jsx
    │   │       └── Profile.css
    │   ├── store/
    │   │   ├── authStore.js
    │   │   ├── projectStore.js
    │   │   ├── taskStore.js
    │   │   └── notificationStore.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Neon PostgreSQL database (free)

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@your-neon-host/neondb?sslmode=require&channel_binding=require
DB_SSL=true
DB_LOGGING=false
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CLIENT_URLS=http://localhost:5173
```

5. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Deployment (Render Blueprint)

This repository includes `render.yaml` to deploy both backend and frontend with minimal manual setup.

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select this repo.
3. Set required backend environment variables:
    - `DATABASE_URL` (Neon connection string)
    - `JWT_SECRET`
    - `CLIENT_URLS` (your frontend URL)
4. Set frontend environment variables:
    - `REACT_APP_API_URL` = `https://<your-backend>.onrender.com/api`
    - `REACT_APP_SOCKET_URL` = `https://<your-backend>.onrender.com`
5. Deploy. Render will build backend and frontend automatically.

5. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Projects
- `GET /api/projects` - Get all user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member to project
- `DELETE /api/projects/:id/members/:userId` - Remove member
- `PUT /api/projects/:id/members/:userId/role` - Update member role

### Tasks
- `GET /api/tasks` - Get tasks (with filters)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assign` - Assign task to users
- `PATCH /api/tasks/:id/status` - Update task status
- `PATCH /api/tasks/:id/move` - Move task to different board

### Comments
- `POST /api/comments` - Create comment
- `GET /api/comments/task/:taskId` - Get comments for task
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Users
- `GET /api/users` - Get all users
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/:id` - Get user by ID

## 🔌 WebSocket Events

### Client to Server
- `authenticate` - Authenticate user with socket
- `join_project` - Join project room
- `leave_project` - Leave project room
- `typing_start` - User started typing
- `typing_stop` - User stopped typing

### Server to Client
- `notification` - New notification
- `task_updated` - Task was updated
- `task_deleted` - Task was deleted
- `task_moved` - Task was moved
- `new_comment` - New comment added
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing

## 🎨 Features to Implement

- [ ] Drag and drop task cards between boards
- [ ] File upload for task attachments
- [ ] Email notifications
- [ ] Task filtering and search
- [ ] Activity timeline
- [ ] Task due date reminders
- [ ] Export project data
- [ ] Dark mode
- [ ] Mobile responsive improvements

## 📝 Environment Variables

### Backend
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=project_management
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### Frontend
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

Your Name

## 🙏 Acknowledgments

- Inspired by Trello and Asana
- Built with modern web technologies
- Real-time collaboration features
