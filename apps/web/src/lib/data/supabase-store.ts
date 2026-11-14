import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Album,
  Artist,
  AudioAsset,
  Comment,
  Genre,
  Mood,
  Notification,
  Playlist,
  Report,
  Track,
} from '@ai-music/contracts';
import { env } from '@/lib/env';
import type {
  DemoDb,
  DemoUser,
  FeaturedSlotRecord,
  FollowRecord,
  LikeRecord,
  NotificationPreferenceRecord,
  PlaybackEventRecord,
  PlaybackSessionRecord,
  PlaylistFollowRecord,
  QuotaLimitRecord,
  UploadEventRecord,
  VerificationRequestRecord,
} from './types';

/**
 * Snapshot adapter for the Postgres/Supabase schema in `supabase/migrations`.
 *
 * The application's domain logic (queries.ts / mutations.ts) is written against
 * an in-memory `DemoDb` graph. This module loads that graph from PostgREST and
 * writes back only the rows that changed, so the same pure functions serve both
 * the demo JSON store and Postgres.
 *
 * Trade-offs, deliberately accepted for this first production step:
 * - One snapshot per request (N selects). Fine for the first 10k users; replace
 *   with targeted queries when read volume grows.
 * - Reads use the service role, so authorization stays in `packages/db` +
 *   route handlers, exactly as in demo mode. RLS still protects client access.
 */

type Row = Record<string, unknown>;

let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (!env.supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!env.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

const PAGE = 1000;

async function fetchAll(table: string): Promise<Row[]> {
  const client = serviceClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function iso(value: unknown, fallback = new Date(0).toISOString()): string {
  if (typeof value === 'string' && value) return value;
  return fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = map.get(id);
    if (list) list.push(row);
    else map.set(id, [row]);
  }
  return map;
}

function audioAsset(row: Row): AudioAsset {
  return {
    kind: row.kind === 'original' ? 'original' : 'rendition',
    objectKey: text(row.object_key),
    format: text(row.format, 'mp3'),
    bitrateKbps: num(row.bitrate_kbps, 320),
    sampleRate: num(row.sample_rate, 44100),
    channels: num(row.channels, 2),
    bytes: num(row.bytes),
    sha256: text(row.sha256),
    processingStatus: text(
      row.processing_status,
      'ready',
    ) as AudioAsset['processingStatus'],
  };
}

export async function loadDbFromSupabase(): Promise<DemoDb> {
  const [
    profileRows,
    staffRows,
    artistRows,
    socialRows,
    albumRows,
    trackRows,
    trackMoodRows,
    audioRows,
    genreRows,
    moodRows,
    playlistRows,
    playlistTrackRows,
    likeRows,
    artistFollowRows,
    playlistFollowRows,
    commentRows,
    notificationRows,
    preferenceRows,
    applicationRows,
    reportRows,
    verificationRows,
    featuredRows,
    auditRows,
    quotaRows,
    uploadEventRows,
    sessionRows,
    playbackRows,
  ] = await Promise.all([
    fetchAll('profiles'),
    fetchAll('staff_roles'),
    fetchAll('artists'),
    fetchAll('artist_social_links'),
    fetchAll('albums'),
    fetchAll('tracks'),
    fetchAll('track_moods'),
    fetchAll('audio_assets'),
    fetchAll('genres'),
    fetchAll('moods'),
    fetchAll('playlists'),
    fetchAll('playlist_tracks'),
    fetchAll('likes'),
    fetchAll('artist_follows'),
    fetchAll('playlist_follows'),
    fetchAll('comments'),
    fetchAll('notifications'),
    fetchAll('notification_preferences'),
    fetchAll('artist_applications'),
    fetchAll('reports'),
    fetchAll('verification_requests'),
    fetchAll('featured_slots'),
    fetchAll('audit_logs'),
    fetchAll('upload_quotas'),
    fetchAll('upload_events'),
    fetchAll('playback_sessions'),
    fetchAll('playback_events'),
  ]);

  const rolesByUser = groupBy(staffRows, (row) => text(row.user_id));
  const nameById = new Map(profileRows.map((row) => [text(row.id), row]));

  const users: DemoUser[] = profileRows.map((row) => {
    const id = text(row.id);
    return {
      id,
      email: '',
      passwordHash: '',
      handle: text(row.handle),
      displayName: text(row.display_name, text(row.handle)),
      avatarUrl: text(row.avatar_key),
      locale: text(row.locale) === 'ar' ? 'ar' : 'en',
      country: text(row.country),
      roles: (rolesByUser.get(id) ?? []).map(
        (roleRow) => text(roleRow.role) as DemoUser['roles'][number],
      ),
      createdAt: iso(row.created_at),
    };
  });

  const displayName = (userId: string) =>
    text(nameById.get(userId)?.display_name, text(nameById.get(userId)?.handle));

  const socialByArtist = groupBy(socialRows, (row) => text(row.artist_id));
  const artists: Artist[] = artistRows.map((row) => ({
    id: text(row.id),
    ownerUserId: text(row.owner_user_id),
    slug: text(row.slug),
    name: text(row.name),
    bio: text(row.bio),
    avatarUrl: text(row.avatar_key),
    coverUrl: text(row.cover_key),
    accent: text(row.accent, '#9D5CFF'),
    featuredTrackId:
      typeof row.featured_track_id === 'string' ? row.featured_track_id : null,
    verificationStatus: text(
      row.verification_status,
      'not_requested',
    ) as Artist['verificationStatus'],
    socialLinks: (socialByArtist.get(text(row.id)) ?? [])
      .map((link) => ({
        platform: text(link.platform),
        url: text(link.url),
        sortOrder: num(link.sort_order),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    createdAt: iso(row.created_at),
  }));

  const albums: Album[] = albumRows.map((row) => ({
    id: text(row.id),
    artistId: text(row.artist_id),
    title: text(row.title),
    description: text(row.description),
    artworkUrl: text(row.artwork_key),
    releaseAt: iso(row.release_at),
    status: text(row.status, 'unpublished') as Album['status'],
    visibility: text(row.visibility, 'public') as Album['visibility'],
  }));

  const moodsByTrack = groupBy(trackMoodRows, (row) => text(row.track_id));
  const assetsByTrack = groupBy(audioRows, (row) => text(row.track_id));

  const tracks: Track[] = trackRows.map((row) => {
    const id = text(row.id);
    const assets = (assetsByTrack.get(id) ?? []).map(audioAsset);
    const playable =
      assets.find(
        (asset) => asset.kind === 'rendition' && asset.processingStatus === 'ready',
      ) ??
      assets.find((asset) => asset.processingStatus === 'ready') ??
      // Keep the uploaded master visible to staff while transcoding is queued.
      // Public playback still requires a ready rendition in /api/stream.
      assets.find((asset) => asset.kind === 'original') ??
      null;
    return {
      id,
      artistId: text(row.artist_id),
      albumId: typeof row.album_id === 'string' ? row.album_id : null,
      title: text(row.title),
      slug: text(row.slug),
      description: text(row.description),
      genreId: text(row.genre_id),
      genreIds: Array.isArray(row.genre_ids) && row.genre_ids.length ? row.genre_ids as string[] : [text(row.genre_id)],
      moodIds: (moodsByTrack.get(id) ?? []).map((mood) => text(mood.mood_id)),
      languageCode: text(row.language_code, 'en'),
      countryCode: text(row.country_code),
      productionType: text(row.production_type, 'fully_ai') as Track['productionType'],
      aiTools: text(row.ai_tools),
      explicit: bool(row.explicit),
      visibility: text(row.visibility, 'public') as Track['visibility'],
      reviewStatus: text(row.review_status, 'draft') as Track['reviewStatus'],
      publishStatus: text(row.publish_status, 'unpublished') as Track['publishStatus'],
      releaseAt: iso(row.release_at),
      durationMs: num(row.duration_ms),
      lyrics: text(row.lyrics),
      credits: text(row.credits),
      artwork: {
        url: text(row.artwork_key),
        accent: text(row.artwork_accent, '#9D5CFF'),
      },
      audioUrl: '',
      audio: playable,
      qualityLabel: text(row.quality_label, 'standard'),
      qualifiedPlays: num(row.qualified_plays),
      likeCount: num(row.like_count),
      commentCount: num(row.comment_count),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  });

  const genres: Genre[] = genreRows.map((row) => ({
    id: text(row.id),
    slug: text(row.slug),
    labelEn: text(row.label_en),
    labelAr: text(row.label_ar),
    active: bool(row.active, true),
  }));

  const moods: Mood[] = moodRows.map((row) => ({
    id: text(row.id),
    slug: text(row.slug),
    labelEn: text(row.label_en),
    labelAr: text(row.label_ar),
    active: bool(row.active, true),
  }));

  const trackIdsByPlaylist = groupBy(playlistTrackRows, (row) => text(row.playlist_id));
  const playlists: Playlist[] = playlistRows.map((row) => {
    const id = text(row.id);
    const ownerId = text(row.owner_id);
    return {
      id,
      ownerId,
      ownerName: displayName(ownerId),
      title: text(row.title),
      description: text(row.description),
      visibility: text(row.visibility, 'public') as Playlist['visibility'],
      coverUrl: text(row.cover_key),
      trackIds: (trackIdsByPlaylist.get(id) ?? [])
        .slice()
        .sort((a, b) => num(a.position) - num(b.position))
        .map((entry) => text(entry.track_id)),
      followers: num(row.follower_count),
      createdAt: iso(row.created_at),
    };
  });

  const likes: LikeRecord[] = likeRows.map((row) => ({
    userId: text(row.user_id),
    trackId: text(row.track_id),
    createdAt: iso(row.created_at),
  }));

  const artistFollows: FollowRecord[] = artistFollowRows.map((row) => ({
    userId: text(row.user_id),
    artistId: text(row.artist_id),
    createdAt: iso(row.created_at),
  }));

  const playlistFollows: PlaylistFollowRecord[] = playlistFollowRows.map((row) => ({
    userId: text(row.user_id),
    playlistId: text(row.playlist_id),
    createdAt: iso(row.created_at),
  }));

  const comments: Comment[] = commentRows.map((row) => ({
    id: text(row.id),
    userId: text(row.user_id),
    userName: displayName(text(row.user_id)),
    trackId: text(row.track_id),
    body: text(row.body),
    status: text(row.status, 'visible') as Comment['status'],
    createdAt: iso(row.created_at),
  }));

  const notifications: Notification[] = notificationRows.map((row) => ({
    id: text(row.id),
    userId: text(row.user_id),
    type: text(row.type, 'system') as Notification['type'],
    title: text(row.title),
    body: text(row.body),
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : undefined,
    readAt: typeof row.read_at === 'string' ? row.read_at : null,
    createdAt: iso(row.created_at),
  }));

  const notificationPreferences: NotificationPreferenceRecord[] = preferenceRows.map(
    (row) => ({
      userId: text(row.user_id),
      releaseAlerts: bool(row.release_alerts, true),
      emailOptIn: bool(row.email_opt_in),
      pushOptIn: bool(row.push_opt_in),
    }),
  );

  const applications = applicationRows.map((row) => ({
    id: text(row.id),
    applicantId: text(row.applicant_id),
    applicantName: displayName(text(row.applicant_id)),
    displayName: text(row.display_name),
    description: text(row.description),
    portfolioUrl: text(row.portfolio_url),
    contactEmail: text(row.contact_email),
    rightsDeclared: bool(row.rights_declared),
    status: text(row.status, 'submitted') as DemoDb['applications'][number]['status'],
    reviewNotes: text(row.review_notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }));

  const trackTitle = new Map(tracks.map((track) => [track.id, track.title]));
  const artistName = new Map(artists.map((artist) => [artist.id, artist.name]));
  const reportTargetLabel = (targetType: string, targetId: string) => {
    if (targetType === 'track') return trackTitle.get(targetId) ?? '';
    if (targetType === 'artist') return artistName.get(targetId) ?? '';
    return '';
  };

  const reports: Report[] = reportRows.map((row) => {
    const targetType = text(row.target_type, 'track') as Report['targetType'];
    const targetId = text(row.target_id);
    return {
      id: text(row.id),
      reporterId: text(row.reporter_id),
      reporterName: displayName(text(row.reporter_id)),
      targetType,
      targetId,
      targetLabel: reportTargetLabel(targetType, targetId),
      reason: text(row.reason, 'other') as Report['reason'],
      details: text(row.details),
      status: text(row.status, 'open') as Report['status'],
      resolution: text(row.resolution),
      createdAt: iso(row.created_at),
    };
  });

  const verificationRequests: VerificationRequestRecord[] = verificationRows.map(
    (row) => ({
      id: text(row.id),
      artistId: text(row.artist_id),
      requesterId: text(row.requester_id),
      evidence: text(row.evidence),
      status: text(row.status, 'pending') as VerificationRequestRecord['status'],
      reviewerId: typeof row.reviewer_id === 'string' ? row.reviewer_id : null,
      createdAt: iso(row.created_at),
    }),
  );

  const featuredSlots: FeaturedSlotRecord[] = featuredRows.map((row) => ({
    id: text(row.id),
    slot: text(row.slot),
    entityType: text(row.entity_type, 'track') as FeaturedSlotRecord['entityType'],
    entityId: text(row.entity_id),
    rank: num(row.rank),
    startAt: typeof row.start_at === 'string' ? row.start_at : null,
    endAt: typeof row.end_at === 'string' ? row.end_at : null,
  }));

  const auditLogs = auditRows.map((row) => ({
    id: text(row.id),
    actorId: text(row.actor_id),
    actorName: displayName(text(row.actor_id)),
    action: text(row.action),
    entityType: text(row.entity_type),
    entityId: text(row.entity_id),
    createdAt: iso(row.created_at),
  }));

  const quotaLimits: QuotaLimitRecord[] = quotaRows.map((row) => ({
    ownerId: text(row.owner_id),
    dailyLimit: num(row.daily_limit, 5),
    changedBy: typeof row.changed_by === 'string' ? row.changed_by : null,
    changedAt: iso(row.changed_at),
  }));

  const uploadEvents: UploadEventRecord[] = uploadEventRows.map((row) => ({
    id: text(row.id),
    userId: text(row.user_id),
    trackId: text(row.track_id),
    countedDateUtc: text(row.counted_date_utc).slice(0, 10),
    status: text(row.status, 'counted') as UploadEventRecord['status'],
    idempotencyKey: text(row.idempotency_key),
    createdAt: iso(row.created_at),
  }));

  const playbackSessions: PlaybackSessionRecord[] = sessionRows.map((row) => ({
    id: text(row.id),
    userId: typeof row.user_id === 'string' ? row.user_id : null,
    anonymousSessionHash:
      typeof row.anonymous_session_hash === 'string' ? row.anonymous_session_hash : null,
    startedAt: iso(row.started_at),
    lastSeenAt: iso(row.last_seen_at),
  }));

  const playbackEvents: PlaybackEventRecord[] = playbackRows.map((row) => ({
    id: text(row.id),
    sessionId: text(row.session_id),
    trackId: text(row.track_id),
    eventType: text(row.event_type, 'start'),
    audibleMs: num(row.audible_ms),
    qualified: bool(row.qualified),
    occurredAt: iso(row.occurred_at),
    requestId: text(row.request_id),
  }));

  const sessionOwner = new Map(
    playbackSessions.map((session) => [session.id, session.userId]),
  );
  const history = playbackEvents
    .filter((event) => event.eventType === 'start' && sessionOwner.get(event.sessionId))
    .map((event) => ({
      userId: sessionOwner.get(event.sessionId) as string,
      trackId: event.trackId,
      playedAt: event.occurredAt,
    }));

  return {
    version: 2,
    users,
    artists,
    albums,
    tracks,
    genres,
    moods,
    playlists,
    likes,
    artistFollows,
    playlistFollows,
    comments,
    notifications,
    notificationPreferences,
    applications,
    reports,
    verificationRequests,
    featuredSlots,
    auditLogs,
    quotaLimits,
    uploadEvents,
    playbackSessions,
    playbackEvents,
    history,
  };
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

interface CollectionSpec {
  table: string;
  /** Primary-key columns, in the order used to build the row key. */
  pk: string[];
  rows: (db: DemoDb) => Array<{ id?: string } & Row>;
  toRow: (entity: Row) => Row;
  /** Collections whose links live in a join table. */
  after?: (client: SupabaseClient, changed: Row[]) => Promise<void>;
}

function rowKey(row: Row, pk: string[]): string {
  return pk.map((column) => String(row[column] ?? '')).join('|');
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/**
 * Writes the difference between two snapshots. Insert/update/delete are keyed by
 * primary key, so unrelated rows touched by the same transaction are untouched.
 */
export async function persistChanges(before: DemoDb, after: DemoDb): Promise<void> {
  const client = serviceClient();
  for (const spec of SPECS) {
    const beforeRows = new Map<string, Row>();
    for (const entity of spec.rows(before)) {
      const row = spec.toRow(entity as Row);
      beforeRows.set(rowKey(row, spec.pk), row);
    }
    const afterRows = new Map<string, Row>();
    for (const entity of spec.rows(after)) {
      const row = spec.toRow(entity as Row);
      afterRows.set(rowKey(row, spec.pk), row);
    }

    const inserts: Row[] = [];
    const updates: Row[] = [];
    for (const [key, row] of afterRows) {
      const previous = beforeRows.get(key);
      if (!previous) inserts.push(row);
      else if (json(previous) !== json(row)) updates.push(row);
    }
    const deletes: Row[] = [];
    for (const [key, row] of beforeRows) {
      if (!afterRows.has(key)) deletes.push(row);
    }

    const touched = [...inserts, ...updates];
    if (touched.length > 0) {
      const { error } = await client
        .from(spec.table)
        .upsert(touched, { onConflict: spec.pk.join(',') });
      if (error) throw new Error(`Failed to write ${spec.table}: ${error.message}`);
    }

    if (deletes.length > 0) {
      if (spec.pk.length === 1) {
        const pk0 = spec.pk[0]!;
        const ids = deletes.map((row) => row[pk0] as string);
        const { error } = await client.from(spec.table).delete().in(pk0, ids);
        if (error)
          throw new Error(`Failed to delete from ${spec.table}: ${error.message}`);
      } else {
        for (const row of deletes) {
          let query = client.from(spec.table).delete();
          for (const column of spec.pk) {
            query = query.eq(column, String(row[column]));
          }
          const { error } = await query;
          if (error)
            throw new Error(`Failed to delete from ${spec.table}: ${error.message}`);
        }
      }
    }

    if (spec.after && touched.length > 0) {
      // Hooks need the domain entities (audio, moods, social links), not flattened SQL rows.
      const touchedKeys = new Set(touched.map((row) => rowKey(row, spec.pk)));
      const entities = spec.rows(after).filter((entity) =>
        touchedKeys.has(rowKey(spec.toRow(entity as Row), spec.pk)),
      );
      await spec.after(client, entities);
    }
  }
}

const SPECS: CollectionSpec[] = [
  {
    table: 'profiles',
    pk: ['id'],
    rows: (db) => db.users as unknown as Row[],
    toRow: (user) => ({
      id: user.id,
      handle: user.handle,
      display_name: user.displayName,
      avatar_key: user.avatarUrl,
      locale: user.locale,
      country: user.country,
    }),
    after: async (client, users) => {
      for (const user of users) {
        const roles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
        await client
          .from('staff_roles')
          .delete()
          .eq('user_id', user.id as string);
        if (roles.length > 0) {
          const { error } = await client
            .from('staff_roles')
            .insert(roles.map((role) => ({ user_id: user.id, role })));
          if (error) throw new Error(`Failed to write staff_roles: ${error.message}`);
        }
      }
    },
  },
  {
    table: 'artists',
    pk: ['id'],
    rows: (db) => db.artists as unknown as Row[],
    toRow: (artist) => ({
      id: artist.id,
      owner_user_id: artist.ownerUserId,
      slug: artist.slug,
      name: artist.name,
      bio: artist.bio,
      avatar_key: artist.avatarUrl,
      cover_key: artist.coverUrl,
      accent: artist.accent,
      featured_track_id: artist.featuredTrackId,
      verification_status: artist.verificationStatus,
    }),
    after: async (client, artists) => {
      for (const artist of artists) {
        const links = Array.isArray(artist.socialLinks)
          ? (artist.socialLinks as Array<{
              platform: string;
              url: string;
              sortOrder: number;
            }>)
          : [];
        await client
          .from('artist_social_links')
          .delete()
          .eq('artist_id', artist.id as string);
        if (links.length > 0) {
          const { error } = await client.from('artist_social_links').insert(
            links.map((link) => ({
              artist_id: artist.id,
              platform: link.platform,
              url: link.url,
              sort_order: link.sortOrder,
            })),
          );
          if (error)
            throw new Error(`Failed to write artist_social_links: ${error.message}`);
        }
      }
    },
  },
  {
    table: 'albums',
    pk: ['id'],
    rows: (db) => db.albums as unknown as Row[],
    toRow: (album) => ({
      id: album.id,
      artist_id: album.artistId,
      title: album.title,
      description: album.description,
      artwork_key: album.artworkUrl,
      release_at: album.releaseAt,
      status: album.status,
      visibility: album.visibility,
    }),
  },
  {
    table: 'tracks',
    pk: ['id'],
    rows: (db) => db.tracks as unknown as Row[],
    toRow: (track) => ({
      id: track.id,
      artist_id: track.artistId,
      album_id: track.albumId,
      title: track.title,
      slug: track.slug,
      description: track.description,
      genre_id: track.genreId,
      genre_ids: Array.isArray(track.genreIds) && track.genreIds.length > 0 ? track.genreIds : [track.genreId],
      language_code: track.languageCode,
      country_code: track.countryCode,
      production_type: track.productionType,
      ai_tools: track.aiTools,
      explicit: track.explicit,
      visibility: track.visibility,
      review_status: track.reviewStatus,
      publish_status: track.publishStatus,
      release_at: track.releaseAt,
      duration_ms: track.durationMs,
      lyrics: track.lyrics,
      credits: track.credits,
      artwork_key: (track.artwork as { url?: string } | undefined)?.url ?? '',
      artwork_accent:
        (track.artwork as { accent?: string } | undefined)?.accent ?? '#9D5CFF',
      quality_label: track.qualityLabel,
      qualified_plays: track.qualifiedPlays,
      like_count: track.likeCount,
      comment_count: track.commentCount,
      updated_at: track.updatedAt,
    }),
    after: async (client, tracks) => {
      for (const track of tracks) {
        const trackId = track.id as string;
        const moodIds = Array.isArray(track.moodIds) ? (track.moodIds as string[]) : [];
        await client.from('track_moods').delete().eq('track_id', trackId);
        if (moodIds.length > 0) {
          const { error } = await client
            .from('track_moods')
            .insert(moodIds.map((moodId) => ({ track_id: trackId, mood_id: moodId })));
          if (error) throw new Error(`Failed to write track_moods: ${error.message}`);
        }

        const asset = track.audio as
          | {
              kind: 'original' | 'rendition';
              objectKey: string;
              format: string;
              bitrateKbps: number;
              sampleRate: number;
              channels: number;
              bytes: number;
              sha256: string;
              processingStatus: string;
            }
          | null
          | undefined;
        if (asset) {
          const { error } = await client.from('audio_assets').upsert(
            {
              track_id: trackId,
              kind: asset.kind,
              object_key: asset.objectKey,
              format: asset.format,
              bitrate_kbps: asset.bitrateKbps,
              sample_rate: asset.sampleRate,
              channels: asset.channels,
              bytes: asset.bytes,
              sha256: asset.sha256,
              processing_status: asset.processingStatus,
            },
            { onConflict: 'track_id,kind,sha256' },
          );
          if (error) throw new Error(`Failed to write audio_assets: ${error.message}`);
        }
      }
    },
  },
  {
    table: 'playlists',
    pk: ['id'],
    rows: (db) => db.playlists as unknown as Row[],
    toRow: (playlist) => ({
      id: playlist.id,
      owner_id: playlist.ownerId,
      title: playlist.title,
      description: playlist.description,
      visibility: playlist.visibility,
      cover_key: playlist.coverUrl,
      follower_count: playlist.followers,
    }),
    after: async (client, playlists) => {
      for (const playlist of playlists) {
        const trackIds = Array.isArray(playlist.trackIds)
          ? (playlist.trackIds as string[])
          : [];
        await client
          .from('playlist_tracks')
          .delete()
          .eq('playlist_id', playlist.id as string);
        if (trackIds.length > 0) {
          const { error } = await client.from('playlist_tracks').insert(
            trackIds.map((trackId, index) => ({
              playlist_id: playlist.id,
              track_id: trackId,
              position: index,
            })),
          );
          if (error) throw new Error(`Failed to write playlist_tracks: ${error.message}`);
        }
      }
    },
  },
  {
    table: 'likes',
    pk: ['user_id', 'track_id'],
    rows: (db) =>
      db.likes.map((like) => ({
        user_id: like.userId,
        track_id: like.trackId,
        created_at: like.createdAt,
      })),
    toRow: (like) => like,
  },
  {
    table: 'artist_follows',
    pk: ['user_id', 'artist_id'],
    rows: (db) =>
      db.artistFollows.map((follow) => ({
        user_id: follow.userId,
        artist_id: follow.artistId,
        created_at: follow.createdAt,
      })),
    toRow: (follow) => follow,
  },
  {
    table: 'playlist_follows',
    pk: ['user_id', 'playlist_id'],
    rows: (db) =>
      db.playlistFollows.map((follow) => ({
        user_id: follow.userId,
        playlist_id: follow.playlistId,
        created_at: follow.createdAt,
      })),
    toRow: (follow) => follow,
  },
  {
    table: 'comments',
    pk: ['id'],
    rows: (db) => db.comments as unknown as Row[],
    toRow: (comment) => ({
      id: comment.id,
      user_id: comment.userId,
      track_id: comment.trackId,
      body: comment.body,
      status: comment.status,
    }),
  },
  {
    table: 'notifications',
    pk: ['id'],
    rows: (db) => db.notifications as unknown as Row[],
    toRow: (notification) => ({
      id: notification.id,
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      payload: notification.payload ?? {},
      read_at: notification.readAt,
    }),
  },
  {
    table: 'notification_preferences',
    pk: ['user_id'],
    rows: (db) =>
      db.notificationPreferences.map((preference) => ({
        user_id: preference.userId,
        release_alerts: preference.releaseAlerts,
        email_opt_in: preference.emailOptIn,
        push_opt_in: preference.pushOptIn,
      })),
    toRow: (preference) => preference,
  },
  {
    table: 'artist_applications',
    pk: ['id'],
    rows: (db) => db.applications as unknown as Row[],
    toRow: (application) => ({
      id: application.id,
      applicant_id: application.applicantId,
      display_name: application.displayName,
      description: application.description,
      portfolio_url: application.portfolioUrl,
      contact_email: application.contactEmail,
      rights_declared: application.rightsDeclared,
      status: application.status,
      review_notes: application.reviewNotes,
      updated_at: application.updatedAt,
    }),
  },
  {
    table: 'reports',
    pk: ['id'],
    rows: (db) => db.reports as unknown as Row[],
    toRow: (report) => ({
      id: report.id,
      reporter_id: report.reporterId,
      target_type: report.targetType,
      target_id: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      resolution: report.resolution,
    }),
  },
  {
    table: 'verification_requests',
    pk: ['id'],
    rows: (db) => db.verificationRequests as unknown as Row[],
    toRow: (request) => ({
      id: request.id,
      artist_id: request.artistId,
      requester_id: request.requesterId,
      evidence: request.evidence,
      status: request.status,
      reviewer_id: request.reviewerId,
    }),
  },
  {
    table: 'featured_slots',
    pk: ['id'],
    rows: (db) => db.featuredSlots as unknown as Row[],
    toRow: (slot) => ({
      id: slot.id,
      slot: slot.slot,
      entity_type: slot.entityType,
      entity_id: slot.entityId,
      rank: slot.rank,
      start_at: slot.startAt ?? null,
      end_at: slot.endAt ?? null,
    }),
  },
  {
    table: 'audit_logs',
    pk: ['id'],
    rows: (db) => db.auditLogs as unknown as Row[],
    toRow: (entry) => ({
      id: entry.id,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      created_at: entry.createdAt,
    }),
  },
  {
    table: 'upload_quotas',
    pk: ['owner_id'],
    rows: (db) =>
      db.quotaLimits.map((quota) => ({
        owner_id: quota.ownerId,
        daily_limit: quota.dailyLimit,
        changed_by: quota.changedBy,
        changed_at: quota.changedAt,
      })),
    toRow: (quota) => quota,
  },
  {
    table: 'upload_events',
    pk: ['id'],
    rows: (db) =>
      db.uploadEvents.map((event) => ({
        id: event.id,
        user_id: event.userId,
        track_id: event.trackId,
        counted_date_utc: event.countedDateUtc,
        status: event.status,
        idempotency_key: event.idempotencyKey,
        created_at: event.createdAt,
      })),
    toRow: (event) => event,
  },
  {
    table: 'playback_sessions',
    pk: ['id'],
    rows: (db) =>
      db.playbackSessions.map((session) => ({
        id: session.id,
        user_id: session.userId,
        anonymous_session_hash: session.anonymousSessionHash,
        started_at: session.startedAt,
        last_seen_at: session.lastSeenAt,
      })),
    toRow: (session) => session,
  },
  {
    table: 'playback_events',
    pk: ['id'],
    rows: (db) =>
      db.playbackEvents.map((event) => ({
        id: event.id,
        session_id: event.sessionId,
        track_id: event.trackId,
        event_type: event.eventType,
        audible_ms: event.audibleMs,
        qualified: event.qualified,
        occurred_at: event.occurredAt,
        request_id: event.requestId,
      })),
    toRow: (event) => event,
  },
];
