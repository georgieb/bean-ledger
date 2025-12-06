import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres client
const client = postgres(connectionString, {
  max: 20, // Maximum number of connections
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

export type DrizzleDB = typeof db;