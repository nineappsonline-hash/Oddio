import fs from 'node:fs';
import path from 'node:path';
import type { SessionUser, StaffRole } from '@ai-music/contracts';
import { createSeedDb } from './seed';
import type { DemoDb, DemoUser } from './types';
import { notifyFollowersOfRelease } from './release-notifications';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'demo.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SEED_AUDIO_DIR = path.join(DATA_DIR, 'seed-audio');

function ensureDirs(): void {
  for (const dir of [DATA_DIR, UPLOAD_DIR, SEED_AUDIO_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function dataDir(): string {
  return DATA_DIR;
}

export function uploadDir(): string {
  ensureDirs();
  return UPLOAD_DIR;
}

export function seedAudioDir(): string {
  ensureDirs();
  return SEED_AUDIO_DIR;
}

export function readDb(): DemoDb {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const db = createSeedDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw) as DemoDb;
    if (!db.version) throw new Error('Invalid demo database');
    if (promoteScheduledTracks(db)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    }
    return db;
  } catch {
    const db = createSeedDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
}

export function writeDb(db: DemoDb): void {
  ensureDirs();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

export function mutateDb<T>(fn: (db: DemoDb) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function resetDb(): void {
  ensureDirs();
  const db = createSeedDb();
  writeDb(db);
}

export function userIsArtistManager(db: DemoDb, userId: string): boolean {
  return db.applications.some(
    (application) =>
      application.applicantId === userId && application.status === 'approved',
  );
}

export function toSessionUser(db: DemoDb, user: DemoUser): SessionUser {
  const ownedArtists = db.artists.filter((artist) => artist.ownerUserId === user.id);
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    country: user.country,
    roles: user.roles as StaffRole[],
    isArtistManager: userIsArtistManager(db, user.id),
    artistIds: ownedArtists.map((artist) => artist.id),
  };
}

export function findUserById(db: DemoDb, id: string): DemoUser | undefined {
  return db.users.find((user) => user.id === id);
}

export function findUserByEmail(db: DemoDb, email: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return db.users.find((user) => user.email.toLowerCase() === normalized);
}

export function objectKeyToPath(objectKey: string): string | null {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(objectKey)) return null;
  if (objectKey.includes('..')) return null;
  const full = path.resolve(DATA_DIR, objectKey);
  if (!full.startsWith(path.resolve(DATA_DIR) + path.sep)) return null;
  return full;
}

export function audit(
  db: DemoDb,
  actor: { id: string; displayName: string },
  action: string,
  entityType: string,
  entityId: string,
): void {
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    actorId: actor.id,
    actorName: actor.displayName,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  });
}

export function promoteScheduledTracks(db: DemoDb, now = new Date()): boolean {
  let changed = false;
  for (const track of db.tracks) {
    if (track.publishStatus !== 'scheduled') continue;
    if (track.reviewStatus !== 'approved') continue;
    if (new Date(track.releaseAt).getTime() > now.getTime()) continue;
    track.publishStatus =
      track.visibility === 'private' ? 'available_private' : 'published';
    track.updatedAt = now.toISOString();
    changed = true;
    notifyFollowersOfRelease(db, track, now);
    db.notifications.push({
      id: crypto.randomUUID(),
      userId:
        db.artists.find((artist) => artist.id === track.artistId)?.ownerUserId ?? '',
      type: 'track_review_decision',
      title: `“${track.title}” is now live`,
      body: 'Your scheduled release was published automatically.',
      readAt: null,
      createdAt: now.toISOString(),
    });
  }
  return changed;
}
