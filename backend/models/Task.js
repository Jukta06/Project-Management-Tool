import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Please provide a task title'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  board: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'To Do'
  },
  assignedTo: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of user IDs'
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('todo', 'in-progress', 'review', 'completed'),
    defaultValue: 'todo'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of tag strings'
  },
  subtasks: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {id, text, completed}'
  },
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {filename, url, uploadedBy, uploadedAt}'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

export default Task;
