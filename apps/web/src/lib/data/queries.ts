import type {
  Artist,
  ChartQuery,
  Genre,
  Mood,
  Playlist,
  SearchQuery,
  StaffRole,
  Track,
  TrackWithRelations,
  PublicUser,
} from '@ai-music/contracts';
import { qualifiedPlayThresholdMs } from '@ai-music/contracts';
import {
  buildChart,
  evaluateTrackAccess,
  filterPublicTracks,
  isReleased,
  type TrackAccess,
  type Viewer,
} from '@ai-music/db';
import type { DemoDb } from './types';
import { userIsArtistManager } from './db';

export type CatalogTrack = TrackWithRelations & {
  isLiked: boolean;
  access: TrackAccess;
};

export interface HomeData {
  hero: CatalogTrack | null;
  featured: CatalogTrack[];
  trending: CatalogTrack[];
  latest: CatalogTrack[];
  genres: Array<Genre & { count: number }>;
  moods: Array<Mood & { count: number }>;
  artists: Array<Artist & { trackCount: number; followerCount: number }>;
  playlists: Playlist[];
  stats: { tracks: number; artists: number; plays: number };
}

export interface ArtistPageData {
  artist: Artist;
  tracks: CatalogTrack[];
  albums: Array<{
    id: string;
    title: string;
    artworkUrl: string;
    accent: string;
    releaseAt: string;
    trackCount: number;
  }>;
  followerCount: number;
  isFollowing: boolean;
  featuredTrack: CatalogTrack | null;
}

export interface AlbumPageData {
  album: {
    id: string;
    title: string;
    description: string;
    artworkUrl: string;
    releaseAt: string;
    visibility: string;
  };
  artist: Artist;
  tracks: CatalogTrack[];
}

export interface PlaylistPageData {
  playlist: Playlist;
  tracks: CatalogTrack[];
  isFollowing: boolean;
  canEdit: boolean;
}

export interface TrackPageData {
  track: CatalogTrack;
  comments: DemoDb['comments'];
  related: CatalogTrack[];
}

export function ownerIdForTrack(db: DemoDb, track: Track): string | null {
  return db.artists.find((artist) => artist.id === track.artistId)?.ownerUserId ?? null;
}

export function accessForTrack(
  db: DemoDb,
  track: Track,
  viewer: Viewer,
  now = new Date(),
): TrackAccess {
  return evaluateTrackAccess(track, viewer, now, ownerIdForTrack(db, track));
}

function visibleCommentCount(db: DemoDb, trackId: string): number {
  return db.comments.filter(
    (comment) => comment.trackId === trackId && comment.status === 'visible',
  ).length;
}

export function enrichTrack(
  db: DemoDb,
  track: Track,
  viewer: Viewer = { userId: null, roles: [] },
  now = new Date(),
): CatalogTrack {
  const artist = db.artists.find((item) => item.id === track.artistId);
  const album = track.albumId
    ? (db.albums.find((item) => item.id === track.albumId) ?? null)
    : null;
  const genre = db.genres.find((item) => item.id === track.genreId);
  const moods = db.moods.filter((mood) => track.moodIds.includes(mood.id));
  return {
    ...track,
    likeCount: track.likeCount,
    commentCount: visibleCommentCount(db, track.id),
    artist,
    album,
    genre,
    moods,
    isLiked: Boolean(
      viewer.userId &&
      db.likes.some((like) => like.userId === viewer.userId && like.trackId === track.id),
    ),
    access: accessForTrack(db, track, viewer, now),
  };
}

export function listableTracks(
  db: DemoDb,
  viewer: Viewer,
  now = new Date(),
): CatalogTrack[] {
  return db.tracks
    .filter((track) => accessForTrack(db, track, viewer, now).listable)
    .map((track) => enrichTrack(db, track, viewer, now));
}

export function accessibleTracksForArtist(
  db: DemoDb,
  artistId: string,
  viewer: Viewer,
  now = new Date(),
): CatalogTrack[] {
  return db.tracks
    .filter((track) => track.artistId === artistId)
    .filter((track) => accessForTrack(db, track, viewer, now).allowed)
    .sort((a, b) => b.qualifiedPlays - a.qualifiedPlays)
    .map((track) => enrichTrack(db, track, viewer, now));
}

export function getHomeData(db: DemoDb, viewer: Viewer): HomeData {
  const now = new Date();
  const listable = listableTracks(db, viewer, now);
  const heroSlot = db.featuredSlots.find(
    (slot) => slot.slot === 'hero' && slot.entityType === 'track',
  );
  const hero = heroSlot
    ? (listable.find((track) => track.id === heroSlot.entityId) ?? null)
    : null;
  const editorialIds = new Set(
    db.featuredSlots
      .filter((slot) => slot.slot === 'editorial' && slot.entityType === 'track')
      .sort((a, b) => a.rank - b.rank)
      .map((slot) => slot.entityId),
  );
  const featured = listable.filter((track) => editorialIds.has(track.id));

  const trending = [...listable]
    .sort((a, b) => b.qualifiedPlays - a.qualifiedPlays)
    .slice(0, 6);
  const latest = [...listable]
    .sort((a, b) => new Date(b.releaseAt).getTime() - new Date(a.releaseAt).getTime())
    .slice(0, 8);

  const genres = db.genres
    .filter((genre) => genre.active)
    .map((genre) => ({
      ...genre,
      count: listable.filter((track) => track.genreId === genre.id).length,
    }));

  const moods = db.moods
    .filter((mood) => mood.active)
    .map((mood) => ({
      ...mood,
      count: listable.filter((track) => track.moodIds.includes(mood.id)).length,
    }));

  const artists = db.artists
    .map((artist) => {
      const artistTracks = listable.filter((track) => track.artistId === artist.id);
      return {
        ...artist,
        trackCount: artistTracks.length,
        followerCount: db.artistFollows.filter((follow) => follow.artistId === artist.id)
          .length,
      };
    })
    .filter((artist) => artist.trackCount > 0)
    .sort((a, b) => b.trackCount - a.trackCount)
    .slice(0, 6);

  const playlists = db.playlists
    .filter((playlist) => playlist.visibility === 'public')
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 4);

  return {
    hero: hero ?? listable[0] ?? null,
    featured,
    trending,
    latest,
    genres,
    moods,
    artists,
    playlists,
    stats: {
      tracks: listable.length,
      artists: new Set(listable.map((track) => track.artistId)).size,
      plays: listable.reduce((sum, track) => sum + track.qualifiedPlays, 0),
    },
  };
}

export interface SearchResults {
  tracks: CatalogTrack[];
  artists: Array<Artist & { trackCount: number }>;
  albums: Array<{ id: string; title: string; artistName: string; releaseAt: string }>;
  playlists: Playlist[];
  total: number;
  nextCursor: string | null;
}

export function searchCatalog(
  db: DemoDb,
  viewer: Viewer,
  query: SearchQuery,
): SearchResults {
  const now = new Date();
  const term = query.q.toLowerCase().trim();
  const tokens = term.split(/\s+/).filter(Boolean);
  const listable = listableTracks(db, viewer, now);
  const artistById = new Map(db.artists.map((artist) => [artist.id, artist]));

  const matches = (haystack: string): boolean => {
    if (tokens.length === 0) return true;
    const value = haystack.toLowerCase();
    return tokens.every((token) => value.includes(token));
  };

  let tracks = listable.filter((track) => {
    const genre = track.genre;
    const album = track.album;
    const haystack = [
      track.title,
      track.description,
      track.artist?.name ?? '',
      album?.title ?? '',
      genre?.labelEn ?? '',
      genre?.labelAr ?? '',
      ...(track.moods?.flatMap((mood) => [mood.labelEn, mood.labelAr]) ?? []),
    ].join(' ');
    if (!matches(haystack)) return false;
    if (query.genre) {
      const genreRecord = db.genres.find((item) => item.slug === query.genre);
      if (!genreRecord || track.genreId !== genreRecord.id) return false;
    }
    if (query.mood) {
      const moodRecord = db.moods.find((item) => item.slug === query.mood);
      if (!moodRecord || !track.moodIds.includes(moodRecord.id)) return false;
    }
    if (query.language && track.languageCode !== query.language) return false;
    if (query.country && track.countryCode !== query.country) return false;
    return true;
  });

  if (query.sort === 'newest') {
    tracks = [...tracks].sort(
      (a, b) => new Date(b.releaseAt).getTime() - new Date(a.releaseAt).getTime(),
    );
  } else if (query.sort === 'popular') {
    tracks = [...tracks].sort((a, b) => b.qualifiedPlays - a.qualifiedPlays);
  } else {
    tracks = [...tracks].sort((a, b) => {
      const aExact = a.title.toLowerCase() === term ? 1 : 0;
      const bExact = b.title.toLowerCase() === term ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.qualifiedPlays - a.qualifiedPlays;
    });
  }

  const offset = query.cursor ? Math.max(0, Number.parseInt(query.cursor, 10) || 0) : 0;
  const limit = query.limit ?? 20;
  const page = tracks.slice(offset, offset + limit);
  const nextCursor = offset + limit < tracks.length ? String(offset + limit) : null;

  const artists = db.artists
    .filter((artist) => matches(`${artist.name} ${artist.bio}`))
    .map((artist) => ({
      ...artist,
      trackCount: listable.filter((track) => track.artistId === artist.id).length,
    }))
    .filter((artist) => artist.trackCount > 0)
    .slice(0, 8);

  const albums = db.albums
    .filter((album) => album.status === 'published' && album.visibility === 'public')
    .filter((album) => isReleased(album, now))
    .filter((album) =>
      matches(`${album.title} ${artistById.get(album.artistId)?.name ?? ''}`),
    )
    .map((album) => ({
      id: album.id,
      title: album.title,
      artistName: artistById.get(album.artistId)?.name ?? '',
      releaseAt: album.releaseAt,
    }))
    .slice(0, 8);

  const playlists = db.playlists
    .filter((playlist) => playlist.visibility === 'public')
    .filter((playlist) => matches(`${playlist.title} ${playlist.description}`))
    .slice(0, 8);

  return {
    tracks: page,
    artists,
    albums,
    playlists,
    total: tracks.length,
    nextCursor,
  };
}

export interface ChartPageData {
  entries: Array<{
    rank: number;
    score: number;
    qualifiedPlays: number;
    track: CatalogTrack;
  }>;
  period: 'daily' | 'weekly' | 'monthly';
}

export function getCharts(db: DemoDb, viewer: Viewer, query: ChartQuery): ChartPageData {
  const now = new Date();
  const listable = listableTracks(db, viewer, now);
  const genreId = query.genre
    ? db.genres.find((genre) => genre.slug === query.genre)?.id
    : null;
  const filtered = listable.filter((track) => {
    if (query.country && track.countryCode !== query.country) return false;
    if (genreId && track.genreId !== genreId) return false;
    return true;
  });
  const periodFactor =
    query.period === 'daily' ? 0.045 : query.period === 'weekly' ? 0.24 : 0.92;
  const points = filtered.map((track) => {
    const jitter = 0.85 + (track.qualifiedPlays % 100) / 400;
    return {
      trackId: track.id,
      qualifiedPlays: Math.max(
        1,
        Math.round(track.qualifiedPlays * periodFactor * jitter),
      ),
      uniqueListeners: Math.max(
        1,
        Math.round(track.qualifiedPlays * periodFactor * 0.55),
      ),
      completedRate: 0.6,
    };
  });
  const chart = buildChart(points).slice(0, query.limit ?? 50);
  const trackById = new Map(listable.map((track) => [track.id, track]));
  return {
    period: query.period,
    entries: chart.flatMap((entry) => {
      const track = trackById.get(entry.trackId);
      return track
        ? [
            {
              rank: entry.rank,
              score: entry.score,
              qualifiedPlays: entry.qualifiedPlays,
              track,
            },
          ]
        : [];
    }),
  };
}

export function getArtistPage(
  db: DemoDb,
  viewer: Viewer,
  slug: string,
): ArtistPageData | null {
  const artist = db.artists.find((item) => item.slug === slug);
  if (!artist) return null;
  const now = new Date();
  const tracks = accessibleTracksForArtist(db, artist.id, viewer, now);
  const albums = db.albums
    .filter((album) => album.artistId === artist.id)
    .filter((album) => album.status === 'published' && album.visibility === 'public')
    .filter((album) => isReleased(album, now))
    .map((album) => ({
      id: album.id,
      title: album.title,
      artworkUrl: album.artworkUrl,
      accent: artist.accent,
      releaseAt: album.releaseAt,
      trackCount: tracks.filter((track) => track.albumId === album.id).length,
    }));
  const followerCount = db.artistFollows.filter(
    (follow) => follow.artistId === artist.id,
  ).length;
  const isFollowing = Boolean(
    viewer.userId &&
    db.artistFollows.some(
      (follow) => follow.userId === viewer.userId && follow.artistId === artist.id,
    ),
  );
  const featuredTrack = artist.featuredTrackId
    ? (tracks.find((track) => track.id === artist.featuredTrackId) ?? tracks[0] ?? null)
    : (tracks[0] ?? null);
  return { artist, tracks, albums, followerCount, isFollowing, featuredTrack };
}

export function getTrackPage(
  db: DemoDb,
  viewer: Viewer,
  idOrSlug: string,
): TrackPageData | null {
  const track = db.tracks.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
  if (!track) return null;
  const enriched = enrichTrack(db, track, viewer);
  if (!enriched.access.allowed) return null;
  const comments = db.comments
    .filter(
      (comment) =>
        comment.trackId === track.id &&
        (comment.status === 'visible' ||
          comment.userId === viewer.userId ||
          viewer.roles.length > 0),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const related = listableTracks(db, viewer)
    .filter((item) => item.id !== track.id && item.genreId === track.genreId)
    .slice(0, 4);
  return { track: enriched, comments, related };
}

export function getAlbumPage(
  db: DemoDb,
  viewer: Viewer,
  idOrSlug: string,
): AlbumPageData | null {
  const album = db.albums.find(
    (item) =>
      item.id === idOrSlug || item.title.toLowerCase().replace(/\s+/g, '-') === idOrSlug,
  );
  if (!album) return null;
  const artist = db.artists.find((item) => item.id === album.artistId);
  if (!artist) return null;
  const now = new Date();
  const owner = viewer.userId === artist.ownerUserId || viewer.roles.length > 0;
  if (album.visibility !== 'public' && !owner) return null;
  if (album.status !== 'published' && !owner) return null;
  const tracks = db.tracks
    .filter((track) => track.albumId === album.id)
    .filter((track) => accessForTrack(db, track, viewer, now).allowed)
    .sort((a, b) => new Date(a.releaseAt).getTime() - new Date(b.releaseAt).getTime())
    .map((track) => enrichTrack(db, track, viewer, now));
  return {
    album: {
      id: album.id,
      title: album.title,
      description: album.description,
      artworkUrl: album.artworkUrl,
      releaseAt: album.releaseAt,
      visibility: album.visibility,
    },
    artist,
    tracks,
  };
}

export function getPlaylistPage(
  db: DemoDb,
  viewer: Viewer,
  idOrSlug: string,
): PlaylistPageData | null {
  const playlist = db.playlists.find(
    (item) =>
      item.id === idOrSlug || item.title.toLowerCase().replace(/\s+/g, '-') === idOrSlug,
  );
  if (!playlist) return null;
  const canEdit = Boolean(viewer.userId && playlist.ownerId === viewer.userId);
  if (playlist.visibility === 'private' && !canEdit && viewer.roles.length === 0)
    return null;
  const now = new Date();
  const tracks = playlist.trackIds.flatMap((trackId) => {
    const track = db.tracks.find((item) => item.id === trackId);
    if (!track) return [];
    const access = accessForTrack(db, track, viewer, now);
    if (!access.allowed) return [];
    if (playlist.visibility === 'public' && !access.listable && !canEdit) return [];
    return [enrichTrack(db, track, viewer, now)];
  });
  const isFollowing = Boolean(
    viewer.userId &&
    db.playlistFollows.some(
      (follow) => follow.userId === viewer.userId && follow.playlistId === playlist.id,
    ),
  );
  return { playlist, tracks, isFollowing, canEdit };
}

export function getGenrePage(db: DemoDb, viewer: Viewer, slug: string) {
  const genre = db.genres.find((item) => item.slug === slug && item.active);
  if (!genre) return null;
  const tracks = listableTracks(db, viewer).filter((track) => track.genreId === genre.id);
  return { genre, tracks };
}

export function getMoodPage(db: DemoDb, viewer: Viewer, slug: string) {
  const mood = db.moods.find((item) => item.slug === slug && item.active);
  if (!mood) return null;
  const tracks = listableTracks(db, viewer).filter((track) =>
    track.moodIds.includes(mood.id),
  );
  return { mood, tracks };
}

export function getLibraryData(db: DemoDb, viewer: Viewer) {
  const now = new Date();
  const likedTracks = db.likes
    .filter((like) => like.userId === viewer.userId)
    .flatMap((like) => {
      const track = db.tracks.find((item) => item.id === like.trackId);
      if (!track) return [];
      if (!accessForTrack(db, track, viewer, now).allowed) return [];
      return [enrichTrack(db, track, viewer, now)];
    });
  const playlists = db.playlists.filter((playlist) => playlist.ownerId === viewer.userId);
  const followedPlaylists = db.playlists.filter(
    (playlist) =>
      db.playlistFollows.some(
        (follow) => follow.userId === viewer.userId && follow.playlistId === playlist.id,
      ) && playlist.visibility === 'public',
  );
  const follows = db.artistFollows
    .filter((follow) => follow.userId === viewer.userId)
    .flatMap((follow) => {
      const artist = db.artists.find((item) => item.id === follow.artistId);
      return artist ? [artist] : [];
    });
  return { likedTracks, playlists, followedPlaylists, follows };
}

export function getHistoryData(db: DemoDb, viewer: Viewer) {
  const now = new Date();
  return db.history
    .filter((entry) => entry.userId === viewer.userId)
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .flatMap((entry) => {
      const track = db.tracks.find((item) => item.id === entry.trackId);
      if (!track || !accessForTrack(db, track, viewer, now).allowed) return [];
      return [{ ...enrichTrack(db, track, viewer, now), playedAt: entry.playedAt }];
    });
}

export function getNotificationsData(db: DemoDb, userId: string) {
  return {
    notifications: db.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    preferences: db.notificationPreferences.find((pref) => pref.userId === userId) ?? {
      userId,
      releaseAlerts: true,
      emailOptIn: false,
      pushOptIn: false,
    },
  };
}

export function getApplicationForUser(db: DemoDb, userId: string) {
  return (
    db.applications
      .filter((application) => application.applicantId === userId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
  );
}

export function getQuotaSnapshot(db: DemoDb, userId: string, fallbackLimit: number) {
  const limit =
    db.quotaLimits.find((quota) => quota.ownerId === userId)?.dailyLimit ?? fallbackLimit;
  const today = new Date().toISOString().slice(0, 10);
  const used = new Set(
    db.uploadEvents
      .filter(
        (event) =>
          event.userId === userId &&
          event.countedDateUtc === today &&
          event.status === 'counted',
      )
      .map((event) => event.idempotencyKey),
  ).size;
  return {
    ownerId: userId,
    dailyLimit: limit,
    usedToday: used,
    remaining: Math.max(0, limit - used),
    dateUtc: today,
  };
}

export function getStudioData(
  db: DemoDb,
  user: PublicUser,
  options: { demoDailyLimit: number },
) {
  const ownedArtists = db.artists.filter((artist) => artist.ownerUserId === user.id);
  const artistIds = ownedArtists.map((artist) => artist.id);
  const tracks = db.tracks
    .filter((track) => artistIds.includes(track.artistId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const albums = db.albums.filter((album) => artistIds.includes(album.artistId));
  const application = getApplicationForUser(db, user.id);
  const quota = getQuotaSnapshot(db, user.id, options.demoDailyLimit);
  const analytics = {
    qualifiedPlays: tracks.reduce((sum, track) => sum + track.qualifiedPlays, 0),
    likes: tracks.reduce((sum, track) => sum + track.likeCount, 0),
    followers: db.artistFollows.filter((follow) => artistIds.includes(follow.artistId))
      .length,
    releases: tracks.filter((track) => track.publishStatus === 'published').length,
  };
  const verificationRequests = db.verificationRequests.filter((request) =>
    artistIds.includes(request.artistId),
  );
  return {
    artists: ownedArtists,
    tracks: tracks.map((track) =>
      enrichTrack(db, track, { userId: user.id, roles: user.roles }),
    ),
    albums,
    application,
    quota,
    analytics,
    verificationRequests,
    genres: db.genres,
    moods: db.moods,
    isArtistManager: user.isArtistManager || userIsArtistManager(db, user.id),
  };
}

export function getAdminData(db: DemoDb, role: StaffRole) {
  const now = new Date();
  const pendingTracks = db.tracks
    .filter((track) =>
      ['pending_review', 'ready_for_review', 'processing'].includes(track.reviewStatus),
    )
    .map((track) => enrichTrack(db, track, { userId: null, roles: [role] }, now));
  const pendingApplications = db.applications.filter((application) =>
    ['submitted', 'under_review', 'needs_information'].includes(application.status),
  );
  const openReports = db.reports.filter((report) =>
    ['open', 'investigating'].includes(report.status),
  );
  const pendingVerification = db.verificationRequests.filter(
    (request) => request.status === 'pending',
  );
  const publishedTracks = db.tracks.filter(
    (track) => track.publishStatus === 'published',
  );
  const stats = {
    users: db.users.length,
    activeListeners: new Set(db.history.map((entry) => entry.userId)).size,
    qualifiedPlays: db.tracks.reduce((sum, track) => sum + track.qualifiedPlays, 0),
    publishedTracks: publishedTracks.length,
    pendingReviews: pendingTracks.length,
    openReports: openReports.length,
    pendingApplications: pendingApplications.length,
    storageBytes: 0,
  };
  const genreCounts = db.genres
    .map((genre) => ({
      label: genre.labelEn,
      count: publishedTracks.filter((track) => track.genreId === genre.id).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const countryCounts = Object.entries(
    publishedTracks.reduce<Record<string, number>>((acc, track) => {
      acc[track.countryCode || '—'] = (acc[track.countryCode || '—'] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return {
    pendingTracks,
    pendingApplications,
    openReports,
    pendingVerification,
    comments: [...db.comments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    users: db.users,
    artists: db.artists,
    featuredSlots: db.featuredSlots,
    auditLogs: [...db.auditLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    reports: db.reports,
    stats,
    genreCounts,
    countryCounts,
  };
}

export function allPublicTracks(db: DemoDb): Track[] {
  return filterPublicTracks(db.tracks);
}

export function qualifiedProgressRatio(
  events: Array<{ audibleMs: number }>,
  durationMs: number,
): number {
  const threshold = qualifiedPlayThresholdMs(durationMs);
  if (threshold === 0) return 0;
  const maxAudible = events.reduce((max, event) => Math.max(max, event.audibleMs), 0);
  return Math.min(1, maxAudible / threshold);
}

export function getSitemapEntries(db: DemoDb) {
  const listable = listableTracks(db, { userId: null, roles: [] });
  return {
    tracks: listable,
    artists: db.artists.filter((artist) =>
      listable.some((track) => track.artistId === artist.id),
    ),
    albums: db.albums.filter(
      (album) =>
        album.status === 'published' &&
        album.visibility === 'public' &&
        listable.some((track) => track.albumId === album.id),
    ),
    playlists: db.playlists.filter((playlist) => playlist.visibility === 'public'),
    genres: db.genres.filter((genre) => genre.active),
    moods: db.moods.filter((mood) => mood.active),
  };
}
