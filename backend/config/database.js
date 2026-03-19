import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Please set it in backend/.env');
}

const shouldUseSSL = process.env.DB_SSL !== 'false';
const isProduction = process.env.NODE_ENV === 'production';
const shouldLogSql = process.env.DB_LOGGING === 'true' && !isProduction;

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  ...(shouldUseSSL
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }
    : {}),
  logging: shouldLogSql ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL (Neon) Connected Successfully!');

    await sequelize.sync({ alter: true });
    console.log('✅ Database Synced!');
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export { sequelize, connectDB };
export default connectDB;
