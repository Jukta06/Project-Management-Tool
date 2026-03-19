import User from './User.js';
import Project from './Project.js';
import Task from './Task.js';
import Comment from './Comment.js';
import Notification from './Notification.js';
import ProjectInvite from './ProjectInvite.js';

// Define associations/relationships

// User - Project relationships
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User - Task relationships
User.hasMany(Task, { foreignKey: 'createdById', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });

// Project - Task relationships
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User - Comment relationships
User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Task - Comment relationships
Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments' });
Comment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// Comment - Comment (parent-child) relationships
Comment.hasMany(Comment, { foreignKey: 'parentCommentId', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentCommentId', as: 'parentComment' });

// User - Notification relationships
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'receivedNotifications' });
User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Task - Notification relationships
Task.hasMany(Notification, { foreignKey: 'relatedTaskId', as: 'notifications' });
Notification.belongsTo(Task, { foreignKey: 'relatedTaskId', as: 'relatedTask' });

// Project - Notification relationships
Project.hasMany(Notification, { foreignKey: 'relatedProjectId', as: 'notifications' });
Notification.belongsTo(Project, { foreignKey: 'relatedProjectId', as: 'relatedProject' });

// Project - Invite relationships
Project.hasMany(ProjectInvite, { foreignKey: 'projectId', as: 'invites' });
ProjectInvite.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User - Invite relationships
User.hasMany(ProjectInvite, { foreignKey: 'invitedById', as: 'sentProjectInvites' });
User.hasMany(ProjectInvite, { foreignKey: 'approvedById', as: 'approvedProjectInvites' });
User.hasMany(ProjectInvite, { foreignKey: 'inviteeUserId', as: 'receivedProjectInvites' });
ProjectInvite.belongsTo(User, { foreignKey: 'invitedById', as: 'invitedBy' });
ProjectInvite.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
ProjectInvite.belongsTo(User, { foreignKey: 'inviteeUserId', as: 'invitee' });

export { User, Project, Task, Comment, Notification, ProjectInvite };
