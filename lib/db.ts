import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDbPool(): mysql.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set in environment variables')
    }

    // Parse MySQL connection string: mysql://user:password@host:port/database
    const url = new URL(connectionString)
    
    pool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }

  return pool
}

export async function query(sql: string, params?: any[]): Promise<any> {
  const pool = getDbPool()
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error: any) {
    // Handle connection errors
    if (error.code === 'ER_CON_COUNT_ERROR' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection error, retrying...', error.message)
      // Wait a bit and retry once
      await new Promise(resolve => setTimeout(resolve, 1000))
      try {
        const [results] = await pool.execute(sql, params)
        return results
      } catch (retryError) {
        console.error('Database retry failed:', retryError)
        throw retryError
      }
    }
    throw error
  }
}

export async function queryOne(sql: string, params?: any[]): Promise<any> {
  const results = await query(sql, params)
  return Array.isArray(results) && results.length > 0 ? results[0] : null
}

