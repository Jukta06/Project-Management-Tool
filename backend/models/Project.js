import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Project = sequelize.define('Project', {
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
        msg: 'Please provide a project title'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  members: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {userId, role, addedAt}'
  },
  boards: {
    type: DataTypes.JSON,
    defaultValue: [
      { name: 'To Do', order: 0 },
      { name: 'In Progress', order: 1 },
      { name: 'Done', order: 2 }
    ],
    comment: 'Array of {name, order}'
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'completed'),
    defaultValue: 'active'
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3b82f6'
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (project) => {
      if (!project.boards || project.boards.length === 0) {
        project.boards = [
          { name: 'To Do', order: 0 },
          { name: 'In Progress', order: 1 },
          { name: 'Done', order: 2 }
        ];
      }
    }
  }
});

export default Project;
