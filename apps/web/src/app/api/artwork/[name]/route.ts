import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { uploadDir } from '@/lib/data/db';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!/^artwork-[a-f0-9-]+\.(png|jpg|jpeg|webp|gif)$/.test(name)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const filePath = path.join(uploadDir(), name);
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const ext = name.split('.').pop() ?? 'jpg';
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
