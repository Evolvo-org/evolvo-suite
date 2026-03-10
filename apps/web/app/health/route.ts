import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}