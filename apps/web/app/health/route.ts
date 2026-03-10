import { NextResponse } from 'next/server';
import packageJson from '../../package.json' with { type: 'json' };

export function GET() {
  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  });
}