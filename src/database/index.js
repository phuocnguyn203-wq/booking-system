import pg from 'pg';

const { Pool, types } = pg;

types.setTypeParser(types.builtins.DATE, value => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const query = (text, params) => {
  return pool.query(text, params ?? new Array());
};