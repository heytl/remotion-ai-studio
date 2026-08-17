import { NextRequest, NextResponse } from 'next/server';
import { createProject, listProjects } from '@/lib/store';
import { Requirements } from '@/lib/types';

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Requirements>;
    const project = createProject(body);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
