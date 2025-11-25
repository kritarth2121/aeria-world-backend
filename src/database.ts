import { Pool, type QueryResult } from "pg"

let pool: Pool

export function initializeDatabase(connectionString: string): void {
  pool = new Pool({ connectionString })
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  if (!pool) {
    throw new Error("Database not initialized. Call initializeDatabase first.")
  }
  return pool.query(text, params)
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end()
  }
}

export { pool }
