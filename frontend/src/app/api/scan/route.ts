import { NextResponse } from 'next/server';
import { scanYields } from '@/lib/yield-scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minTvl = Number(searchParams.get('minTvl') ?? 100000);

    const opportunities = await scanYields(minTvl);
    return NextResponse.json({ success: true, data: opportunities });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
