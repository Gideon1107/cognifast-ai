import dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/drizzle-migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
