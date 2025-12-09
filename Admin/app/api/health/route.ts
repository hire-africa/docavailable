import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Admin dashboard is running',
    timestamp: new Date().toISOString()
  });
}
