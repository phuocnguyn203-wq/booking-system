import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const query = (text, params) => {
  return pool.query(text, params ?? new Array());
};