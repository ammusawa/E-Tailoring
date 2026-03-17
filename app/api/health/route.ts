import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection
    await query('SELECT 1')
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        hint: 'Make sure you have run: npm run db:setup',
      },
      { status: 500 }
    )
  }
}
