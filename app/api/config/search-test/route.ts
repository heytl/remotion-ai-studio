import { NextRequest, NextResponse } from 'next/server';
import { testSearchConnection } from '@/lib/search';
import { SearchProvider } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      provider?: SearchProvider;
      apiKey?: string;
      maxResults?: number;
    };
    const result = await testSearchConnection(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}
