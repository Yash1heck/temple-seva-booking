import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class PgPoolClient implements IDatabaseClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrappedClient: IDatabaseClient = {
        query: async <R = any>(q: string, p?: any[]) => {
          const r = await client.query(q, p);
          return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length };
        },
        exec: async (s: string) => {
          await client.query(s);
        },
        transaction: async () => {
          throw new Error('Nested transactions not supported');
        },
        close: async () => {}
      };
      const result = await fn(wrappedClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGliteClient implements IDatabaseClient {
  private pglite: PGlite;

  constructor(pgliteInstance: PGlite) {
    this.pglite = pgliteInstance;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pglite.query(sql, params);
    const count = (res as any).affectedRows ?? (res as any).rowCount ?? res.rows?.length ?? 0;
    return { rows: res.rows as T[], rowCount: count };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    return await this.pglite.transaction(async (tx) => {
      const wrappedClient: IDatabaseClient = {
        query: async <R = any>(q: string, p?: any[]) => {
          const r = await tx.query(q, p);
          const count = (r as any).affectedRows ?? (r as any).rowCount ?? r.rows?.length ?? 0;
          return { rows: r.rows as R[], rowCount: count };
        },
        exec: async (s: string) => {
          await tx.exec(s);
        },
        transaction: async () => {
          throw new Error('Nested transactions not supported');
        },
        close: async () => {}
      };
      return await fn(wrappedClient);
    });
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }
}

let dbInstance: IDatabaseClient | null = null;

export async function getDb(): Promise<IDatabaseClient> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
    dbInstance = new PgPoolClient(databaseUrl);
  } else {
    // Default to PGlite (Real PostgreSQL in Node)
    const dataDir = process.env.PGLITE_DATA_DIR || path.join(__dirname, '../../../temple_data.db');
    const pglite = new PGlite(dataDir === ':memory:' ? undefined : dataDir);
    await pglite.waitReady;
    dbInstance = new PGliteClient(pglite);
  }

  return dbInstance;
}

export async function createTestDb(): Promise<IDatabaseClient> {
  const pglite = new PGlite();
  await pglite.waitReady;
  const client = new PGliteClient(pglite);
  await runMigrations(client);
  return client;
}

export async function runMigrations(client: IDatabaseClient): Promise<void> {
  const migrationPath = path.join(__dirname, 'migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.exec(sql);
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
