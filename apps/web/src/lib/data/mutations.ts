import crypto from 'node:crypto';
import type {
  ArtistApplication,
  ArtistApplicationStatus,
  Comment,
  Notification,
  PlaybackEventInput,
  Playlist,
  Report,
  ReviewStatus,
  SessionUser,
  StaffRole,
  Track,
  Visibility,
} from '@ai-music/contracts';
import { qualifiedPlayThresholdMs } from '@ai-music/contracts';
import { evaluateUploadQuota, uniqueSlug, utcDateKey } from '@ai-music/db';
import { AppError, Errors } from '@/lib/errors';
import { signPlaybackToken } from '@/lib/auth/token';
import { audit, userIsArtistManager } from './db';
import { notifyFollowersOfRelease } from './release-notifications';
import type {
  DemoDb,
  PlaybackEventRecord,
  PlaybackSessionRecord,
  UploadEventRecord,
} from './types';
import { accessForTrack, getQuotaSnapshot, ownerIdForTrack } from './queries';

function notify(
  db: DemoDb,
  userId: string,
  type: Notification['type'],
  title: string,
  body: string,
): void {
  if (!userId) return;
  db.notifications.unshift({
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    body,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

function staffActor(actor: SessionUser, roles: StaffRole[]): void {
  if (!actor.roles.some((role) => roles.includes(role))) {
    throw Errors.forbidden();
  }
}

function ownedArtist(db: DemoDb, actor: SessionUser, artistId: string) {
  const artist = db.artists.find((item) => item.id === artistId);
  if (!artist) throw Errors.notFound('Artist not found');
  if (artist.ownerUserId !== actor.id) throw Errors.forbidden();
  return artist;
}

export function toggleLike(db: DemoDb, actor: SessionUser, trackId: string): boolean {
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  const access = accessForTrack(db, track, { userId: actor.id, roles: actor.roles });
  if (!access.allowed) throw Errors.notFound('Track not found');
  const index = db.likes.findIndex(
    (like) => like.userId === actor.id && like.trackId === trackId,
  );
  if (index >= 0) {
    db.likes.splice(index, 1);
    track.likeCount = Math.max(0, track.likeCount - 1);
    return false;
  }
  db.likes.push({ userId: actor.id, trackId, createdAt: new Date().toISOString() });
  track.likeCount += 1;
  return true;
}

export function toggleArtistFollow(
  db: DemoDb,
  actor: SessionUser,
  artistId: string,
): boolean {
  const artist = db.artists.find((item) => item.id === artistId);
  if (!artist) throw Errors.notFound('Artist not found');
  const index = db.artistFollows.findIndex(
    (follow) => follow.userId === actor.id && follow.artistId === artistId,
  );
  if (index >= 0) {
    db.artistFollows.splice(index, 1);
    return false;
  }
  db.artistFollows.push({
    userId: actor.id,
    artistId,
    createdAt: new Date().toISOString(),
  });
  return true;
}

export function togglePlaylistFollow(
  db: DemoDb,
  actor: SessionUser,
  playlistId: string,
): boolean {
  const playlist = db.playlists.find((item) => item.id === playlistId);
  if (!playlist) throw Errors.notFound('Playlist not found');
  if (playlist.visibility !== 'public') throw Errors.forbidden();
  const index = db.playlistFollows.findIndex(
    (follow) => follow.userId === actor.id && follow.playlistId === playlistId,
  );
  if (index >= 0) {
    db.playlistFollows.splice(index, 1);
    playlist.followers = Math.max(0, playlist.followers - 1);
    return false;
  }
  db.playlistFollows.push({
    userId: actor.id,
    playlistId,
    createdAt: new Date().toISOString(),
  });
  playlist.followers += 1;
  return true;
}

export function createComment(
  db: DemoDb,
  actor: SessionUser,
  trackId: string,
  body: string,
  timestampSeconds?: number | null,
): Comment {
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  const access = accessForTrack(db, track, { userId: actor.id, roles: actor.roles });
  if (!access.allowed) throw Errors.notFound('Track not found');
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) {
    throw Errors.invalid('Comment must be between 1 and 2000 characters');
  }
  const comment: Comment = {
    id: crypto.randomUUID(),
    userId: actor.id,
    userName: actor.displayName,
    trackId,
    body: trimmed,
    timestampSeconds: timestampSeconds ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.comments.unshift(comment);
  return comment;
}

export function createReport(
  db: DemoDb,
  actor: SessionUser,
  input: {
    targetType: Report['targetType'];
    targetId: string;
    reason: Report['reason'];
    details: string;
  },
): Report {
  let label = '';
  if (input.targetType === 'track') {
    const track = db.tracks.find((item) => item.id === input.targetId);
    if (
      !track ||
      !accessForTrack(db, track, { userId: actor.id, roles: actor.roles }).allowed
    ) {
      throw Errors.notFound('Track not found');
    }
    label = track.title;
  } else if (input.targetType === 'artist') {
    const artist = db.artists.find((item) => item.id === input.targetId);
    if (!artist) throw Errors.notFound('Artist not found');
    label = artist.name;
  } else {
    const comment = db.comments.find((item) => item.id === input.targetId);
    if (!comment || comment.status === 'hidden')
      throw Errors.notFound('Comment not found');
    const track = db.tracks.find((item) => item.id === comment.trackId);
    if (
      !track ||
      !accessForTrack(db, track, { userId: actor.id, roles: actor.roles }).allowed
    ) {
      throw Errors.notFound('Comment not found');
    }
    label = comment.body.slice(0, 60);
  }
  // A second open report from the same user on the same content adds noise
  // and makes the moderation queue less usable.
  const pending = db.reports.some(
    (report) =>
      report.reporterId === actor.id &&
      report.targetType === input.targetType &&
      report.targetId === input.targetId &&
      (report.status === 'open' || report.status === 'investigating'),
  );
  if (pending)
    throw Errors.conflict('You already have a pending report for this content.');
  const report: Report = {
    id: crypto.randomUUID(),
    reporterId: actor.id,
    reporterName: actor.displayName,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: label,
    reason: input.reason,
    details: input.details.trim(),
    status: 'open',
    resolution: '',
    createdAt: new Date().toISOString(),
  };
  db.reports.unshift(report);
  audit(db, actor, 'report.created', 'report', report.id);
  return report;
}

export function createPlaylist(
  db: DemoDb,
  actor: SessionUser,
  input: { title: string; description: string; visibility: 'public' | 'private' },
): Playlist {
  const playlist: Playlist = {
    id: crypto.randomUUID(),
    ownerId: actor.id,
    ownerName: actor.displayName,
    title: input.title.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
    coverUrl: '',
    trackIds: [],
    followers: 0,
    createdAt: new Date().toISOString(),
  };
  db.playlists.push(playlist);
  return playlist;
}

export function updatePlaylist(
  db: DemoDb,
  actor: SessionUser,
  playlistId: string,
  input: { title?: string; description?: string; visibility?: 'public' | 'private' },
): Playlist {
  const playlist = db.playlists.find((item) => item.id === playlistId);
  if (!playlist) throw Errors.notFound('Playlist not found');
  if (playlist.ownerId !== actor.id) throw Errors.forbidden();
  if (input.title !== undefined) playlist.title = input.title.trim();
  if (input.description !== undefined) playlist.description = input.description.trim();
  if (input.visibility !== undefined) playlist.visibility = input.visibility;
  return playlist;
}

export function deletePlaylist(db: DemoDb, actor: SessionUser, playlistId: string): void {
  const playlist = db.playlists.find((item) => item.id === playlistId);
  if (!playlist) throw Errors.notFound('Playlist not found');
  if (playlist.ownerId !== actor.id) throw Errors.forbidden();
  db.playlists = db.playlists.filter((item) => item.id !== playlistId);
  db.playlistFollows = db.playlistFollows.filter(
    (follow) => follow.playlistId !== playlistId,
  );
}

export function addTrackToPlaylist(
  db: DemoDb,
  actor: SessionUser,
  playlistId: string,
  trackId: string,
): Playlist {
  const playlist = db.playlists.find((item) => item.id === playlistId);
  if (!playlist) throw Errors.notFound('Playlist not found');
  if (playlist.ownerId !== actor.id) throw Errors.forbidden();
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  const access = accessForTrack(db, track, { userId: actor.id, roles: actor.roles });
  if (!access.allowed) throw Errors.notFound('Track not found');
  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
  }
  return playlist;
}

export function removeTrackFromPlaylist(
  db: DemoDb,
  actor: SessionUser,
  playlistId: string,
  trackId: string,
): Playlist {
  const playlist = db.playlists.find((item) => item.id === playlistId);
  if (!playlist) throw Errors.notFound('Playlist not found');
  if (playlist.ownerId !== actor.id) throw Errors.forbidden();
  playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  return playlist;
}

export function submitArtistApplication(
  db: DemoDb,
  actor: SessionUser,
  input: {
    displayName: string;
    description: string;
    portfolioUrl: string;
    contactEmail: string;
    rightsDeclared: boolean;
  },
): ArtistApplication {
  if (!input.rightsDeclared) {
    throw Errors.invalid('You must confirm distribution rights');
  }
  const existing = db.applications.find(
    (application) =>
      application.applicantId === actor.id &&
      ['submitted', 'under_review', 'approved'].includes(application.status),
  );
  if (existing) {
    throw Errors.conflict('You already have an application in progress');
  }
  const now = new Date().toISOString();
  const previous = db.applications
    .filter((application) => application.applicantId === actor.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (previous) {
    previous.displayName = input.displayName;
    previous.description = input.description;
    previous.portfolioUrl = input.portfolioUrl;
    previous.contactEmail = input.contactEmail;
    previous.rightsDeclared = true;
    previous.status = 'submitted';
    previous.reviewNotes = '';
    previous.updatedAt = now;
    return previous;
  }
  const application: ArtistApplication = {
    id: crypto.randomUUID(),
    applicantId: actor.id,
    applicantName: actor.displayName,
    displayName: input.displayName,
    description: input.description,
    portfolioUrl: input.portfolioUrl,
    contactEmail: input.contactEmail,
    rightsDeclared: true,
    status: 'submitted',
    reviewNotes: '',
    createdAt: now,
    updatedAt: now,
  };
  db.applications.unshift(application);
  return application;
}

export function decideApplication(
  db: DemoDb,
  actor: SessionUser,
  applicationId: string,
  decision: 'approve' | 'reject' | 'request_information',
  notes: string,
): ArtistApplication {
  staffActor(actor, ['admin', 'super_admin']);
  const application = db.applications.find((item) => item.id === applicationId);
  if (!application) throw Errors.notFound('Application not found');
  if (application.applicantId === actor.id) {
    throw Errors.forbidden();
  }
  const statusMap: Record<typeof decision, ArtistApplicationStatus> = {
    approve: 'approved',
    reject: 'rejected',
    request_information: 'needs_information',
  };
  application.status = statusMap[decision];
  application.reviewNotes = notes;
  application.updatedAt = new Date().toISOString();
  audit(
    db,
    actor,
    `artist_application.${application.status}`,
    'artist_application',
    application.id,
  );
  notify(
    db,
    application.applicantId,
    'artist_application_decision',
    `Artist application ${statusMap[decision].replace(/_/g, ' ')}`,
    notes || 'Your artist application has been reviewed.',
  );
  return application;
}

export function createArtist(
  db: DemoDb,
  actor: SessionUser,
  input: {
    name: string;
    slug: string;
    bio: string;
    accent: string;
    socialLinks: Array<{ platform: string; url: string }>;
  },
) {
  if (!userIsArtistManager(db, actor.id)) {
    throw new AppError(
      'artist_application_required',
      'An approved artist application is required.',
      403,
    );
  }
  const taken = db.artists.map((artist) => artist.slug);
  const slug = uniqueSlug(input.slug || input.name, taken);
  const artist = {
    id: crypto.randomUUID(),
    ownerUserId: actor.id,
    slug,
    name: input.name.trim(),
    bio: input.bio.trim(),
    avatarUrl: '',
    coverUrl: '',
    accent: input.accent,
    featuredTrackId: null,
    verificationStatus: 'not_requested' as const,
    socialLinks: input.socialLinks.map((link, index) => ({ ...link, sortOrder: index })),
    createdAt: new Date().toISOString(),
  };
  db.artists.push(artist);
  audit(db, actor, 'artist.created', 'artist', artist.id);
  return artist;
}

export function updateArtist(
  db: DemoDb,
  actor: SessionUser,
  artistId: string,
  input: {
    name: string;
    slug: string;
    bio: string;
    accent: string;
    socialLinks: Array<{ platform: string; url: string }>;
  },
) {
  const artist = ownedArtist(db, actor, artistId);
  const taken = db.artists
    .filter((item) => item.id !== artistId)
    .map((item) => item.slug);
  artist.name = input.name.trim();
  artist.slug = uniqueSlug(input.slug || input.name, taken);
  artist.bio = input.bio.trim();
  artist.accent = input.accent;
  artist.socialLinks = input.socialLinks.map((link, index) => ({
    ...link,
    sortOrder: index,
  }));
  audit(db, actor, 'artist.updated', 'artist', artist.id);
  return artist;
}

export function createAlbum(
  db: DemoDb,
  actor: SessionUser,
  input: { artistId: string; title: string; description: string; releaseAt?: string },
) {
  const artist = ownedArtist(db, actor, input.artistId);
  const album = {
    id: crypto.randomUUID(),
    artistId: artist.id,
    title: input.title.trim(),
    description: input.description.trim(),
    artworkUrl: '',
    releaseAt: input.releaseAt ?? new Date().toISOString(),
    status: 'unpublished' as const,
    visibility: 'public' as const,
  };
  db.albums.push(album);
  audit(db, actor, 'album.created', 'album', album.id);
  return album;
}

export interface NewTrackInput {
  artistId: string;
  albumId: string | null;
  title: string;
  description: string;
  genreId: string;
  genreIds?: string[];
  moodIds: string[];
  languageCode: string;
  countryCode: string;
  productionType: 'fully_ai' | 'ai_assisted';
  aiTools: string;
  lyrics: string;
  credits: string;
  visibility: Visibility;
  releaseAt: string | null;
  durationMs: number;
  qualityLabel: string;
  artworkUrl: string;
  artworkAccent: string;
  audio: {
    kind: 'original' | 'rendition';
    objectKey: string;
    format: string;
    bitrateKbps: number;
    sampleRate: number;
    channels: number;
    bytes: number;
    sha256: string;
    processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
  };
  idempotencyKey: string;
  dailyLimit: number;
}

export function createTrackFromUpload(
  db: DemoDb,
  actor: SessionUser,
  input: NewTrackInput,
): Track {
  const artist = ownedArtist(db, actor, input.artistId);
  const genreIds = input.genreIds?.length ? input.genreIds : [input.genreId];
  if (new Set(genreIds).size !== genreIds.length || !genreIds.includes(input.genreId) || genreIds.length > 5 || genreIds.some((id) => !db.genres.some((genre) => genre.id === id && genre.active))) {
    throw Errors.invalid('Select 1 to 5 valid genres, including the primary genre.');
  }
  if (!userIsArtistManager(db, actor.id)) {
    throw new AppError(
      'artist_application_required',
      'An approved artist application is required.',
      403,
    );
  }
  const existingEvent = db.uploadEvents.find(
    (event) =>
      event.idempotencyKey === input.idempotencyKey && event.status === 'counted',
  );
  if (existingEvent) {
    const existingTrack = db.tracks.find((track) => track.id === existingEvent.trackId);
    if (existingTrack) return existingTrack;
  }
  if (
    input.audio.sha256 &&
    db.tracks.some((existing) => existing.audio?.sha256 === input.audio.sha256)
  ) {
    throw Errors.conflict('This exact audio file has already been submitted.');
  }
  const quota = evaluateUploadQuota(
    db.uploadEvents.map((event) => ({
      userId: event.userId,
      countedDateUtc: event.countedDateUtc,
      status: event.status,
      idempotencyKey: event.idempotencyKey,
    })),
    actor.id,
    input.dailyLimit,
  );
  if (!quota.allowed) {
    throw Errors.quota(quota.reason);
  }
  const now = new Date();
  const slug = uniqueSlug(
    input.title,
    db.tracks.filter((track) => track.artistId === artist.id).map((track) => track.slug),
  );
  const track: Track = {
    id: crypto.randomUUID(),
    artistId: artist.id,
    albumId: input.albumId,
    title: input.title.trim(),
    slug,
    description: input.description.trim(),
    genreId: input.genreId,
    genreIds,
    moodIds: input.moodIds,
    languageCode: input.languageCode,
    countryCode: input.countryCode,
    productionType: input.productionType,
    aiTools: input.aiTools.trim(),
    explicit: false,
    visibility: input.visibility,
    reviewStatus: 'pending_review',
    publishStatus: 'unpublished',
    releaseAt: input.releaseAt ?? now.toISOString(),
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    credits: input.credits,
    artwork: { url: input.artworkUrl, accent: input.artworkAccent },
    audioUrl: '',
    audio: {
      kind: input.audio.kind,
      objectKey: input.audio.objectKey,
      format: input.audio.format,
      bitrateKbps: input.audio.bitrateKbps,
      sampleRate: input.audio.sampleRate,
      channels: input.audio.channels,
      bytes: input.audio.bytes,
      sha256: input.audio.sha256,
      processingStatus: input.audio.processingStatus,
    },
    qualityLabel: input.qualityLabel,
    qualifiedPlays: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.tracks.push(track);
  const event: UploadEventRecord = {
    id: crypto.randomUUID(),
    userId: actor.id,
    trackId: track.id,
    countedDateUtc: utcDateKey(now),
    status: 'counted',
    idempotencyKey: input.idempotencyKey,
    createdAt: now.toISOString(),
  };
  db.uploadEvents.push(event);
  if (artist.featuredTrackId === null) artist.featuredTrackId = track.id;
  audit(db, actor, 'track.submitted', 'track', track.id);
  return track;
}

export function submitTrackForReview(
  db: DemoDb,
  actor: SessionUser,
  trackId: string,
): Track {
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  ownedArtist(db, actor, track.artistId);
  if (!['draft', 'changes_requested', 'ready_for_review'].includes(track.reviewStatus)) {
    throw Errors.conflict('Track is not in a submittable state');
  }
  track.reviewStatus = 'pending_review';
  track.updatedAt = new Date().toISOString();
  audit(db, actor, 'track.resubmitted', 'track', track.id);
  return track;
}

export function reviewTrack(
  db: DemoDb,
  actor: SessionUser,
  trackId: string,
  decision: 'approve' | 'reject' | 'request_changes',
  reason: string,
): Track {
  staffActor(actor, ['admin', 'super_admin']);
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  if (decision !== 'approve' && reason.trim().length < 10) {
    throw Errors.invalid('Provide a clear review reason of at least 10 characters.');
  }
  if (
    !['pending_review', 'ready_for_review', 'changes_requested'].includes(
      track.reviewStatus,
    )
  ) {
    throw Errors.conflict('Track is not awaiting review');
  }
  const now = new Date();
  const ownerId = ownerIdForTrack(db, track);
  if (decision === 'approve') {
    if (
      !track.audio ||
      !track.audio.objectKey ||
      track.audio.processingStatus !== 'ready'
    ) {
      throw Errors.conflict('Audio must be uploaded and ready before approval');
    }
    track.reviewStatus = 'approved';
    if (track.visibility === 'private') {
      track.publishStatus = 'available_private';
    } else if (new Date(track.releaseAt).getTime() > now.getTime()) {
      track.publishStatus = 'scheduled';
    } else {
      track.publishStatus = 'published';
    }
    if (track.albumId) {
      const album = db.albums.find((item) => item.id === track.albumId);
      if (album) {
        album.status = 'published';
        album.visibility = track.visibility === 'private' ? 'private' : album.visibility;
      }
    }
  } else if (decision === 'reject') {
    track.reviewStatus = 'rejected';
    track.publishStatus = 'unpublished';
  } else {
    track.reviewStatus = 'changes_requested';
    track.publishStatus = 'unpublished';
  }
  track.updatedAt = now.toISOString();
  if (track.publishStatus === 'published') {
    notifyFollowersOfRelease(db, track, now);
  }
  audit(db, actor, `track.review.${decision}`, 'track', track.id);
  if (ownerId) {
    notify(
      db,
      ownerId,
      'track_review_decision',
      `“${track.title}” ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs changes'}`,
      reason || 'A reviewer has recorded a decision on your track.',
    );
  }
  return track;
}

export function updateCommentStatus(
  db: DemoDb,
  actor: SessionUser,
  commentId: string,
  status: 'visible' | 'hidden',
): Comment {
  staffActor(actor, ['admin', 'super_admin']);
  const comment = db.comments.find((item) => item.id === commentId);
  if (!comment) throw Errors.notFound('Comment not found');
  comment.status = status;
  audit(db, actor, `comment.${status}`, 'comment', comment.id);
  return comment;
}

export function resolveReport(
  db: DemoDb,
  actor: SessionUser,
  reportId: string,
  resolution: 'resolve' | 'dismiss',
  notes: string,
): Report {
  staffActor(actor, ['moderator', 'admin', 'super_admin']);
  const report = db.reports.find((item) => item.id === reportId);
  if (!report) throw Errors.notFound('Report not found');
  if (report.status === 'resolved' || report.status === 'dismissed') {
    throw Errors.conflict('This report has already been closed.');
  }
  if (notes.trim().length < 10) {
    throw Errors.invalid(
      'Record at least 10 characters explaining the moderation decision.',
    );
  }
  report.status = resolution === 'resolve' ? 'resolved' : 'dismissed';
  report.resolution = notes.trim();
  audit(db, actor, `report.${report.status}`, 'report', report.id);
  return report;
}

export function requestVerification(db: DemoDb, actor: SessionUser, artistId: string) {
  const artist = ownedArtist(db, actor, artistId);
  const pending = db.verificationRequests.find(
    (request) => request.artistId === artistId && request.status === 'pending',
  );
  if (pending) throw Errors.conflict('A verification request is already pending');
  const request = {
    id: crypto.randomUUID(),
    artistId,
    requesterId: actor.id,
    evidence: 'Requested through the Studio. Evidence collected securely.',
    status: 'pending' as const,
    reviewerId: null,
    createdAt: new Date().toISOString(),
  };
  db.verificationRequests.push(request);
  artist.verificationStatus = 'pending';
  audit(db, actor, 'verification.requested', 'artist', artistId);
  return request;
}

export function decideVerification(
  db: DemoDb,
  actor: SessionUser,
  requestId: string,
  decision: 'approve' | 'reject',
  notes: string,
) {
  staffActor(actor, ['admin', 'super_admin']);
  const request = db.verificationRequests.find((item) => item.id === requestId);
  if (!request) throw Errors.notFound('Verification request not found');
  request.status = decision === 'approve' ? 'approved' : 'rejected';
  request.reviewerId = actor.id;
  const artist = db.artists.find((item) => item.id === request.artistId);
  if (artist) artist.verificationStatus = request.status;
  audit(db, actor, `verification.${request.status}`, 'artist', request.artistId);
  notify(
    db,
    request.requesterId,
    'verification_decision',
    `Verification ${request.status}`,
    notes || 'Your verification request has been reviewed.',
  );
  return request;
}

export function setFeatured(
  db: DemoDb,
  actor: SessionUser,
  input: {
    slot: string;
    entityType: 'track' | 'artist' | 'playlist';
    entityId: string;
    action: 'add' | 'remove';
  },
): void {
  staffActor(actor, ['admin', 'super_admin']);
  if (input.action === 'remove') {
    db.featuredSlots = db.featuredSlots.filter(
      (slot) =>
        !(
          slot.slot === input.slot &&
          slot.entityType === input.entityType &&
          slot.entityId === input.entityId
        ),
    );
    audit(db, actor, 'featured.removed', input.entityType, input.entityId);
    return;
  }
  const exists = db.featuredSlots.some(
    (slot) =>
      slot.slot === input.slot &&
      slot.entityType === input.entityType &&
      slot.entityId === input.entityId,
  );
  if (!exists) {
    db.featuredSlots.push({
      id: crypto.randomUUID(),
      slot: input.slot,
      entityType: input.entityType,
      entityId: input.entityId,
      rank: db.featuredSlots.filter((slot) => slot.slot === input.slot).length,
    });
    audit(db, actor, 'featured.added', input.entityType, input.entityId);
  }
}

export function updateQuota(
  db: DemoDb,
  actor: SessionUser,
  userId: string,
  dailyLimit: number,
): void {
  staffActor(actor, ['super_admin', 'admin']);
  if (dailyLimit < 1 || dailyLimit > 100) throw Errors.invalid('Limit must be 1–100');
  const existing = db.quotaLimits.find((quota) => quota.ownerId === userId);
  if (existing) {
    existing.dailyLimit = dailyLimit;
    existing.changedBy = actor.id;
    existing.changedAt = new Date().toISOString();
  } else {
    db.quotaLimits.push({
      ownerId: userId,
      dailyLimit,
      changedBy: actor.id,
      changedAt: new Date().toISOString(),
    });
  }
  audit(db, actor, 'quota.updated', 'user', userId);
}

export function setUserRole(
  db: DemoDb,
  actor: SessionUser,
  userId: string,
  role: StaffRole | null,
): void {
  staffActor(actor, ['super_admin']);
  if (userId === actor.id) throw Errors.forbidden();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw Errors.notFound('User not found');
  user.roles = role ? [role] : [];
  audit(db, actor, 'user.role.updated', 'user', userId);
}

export function markNotificationsRead(db: DemoDb, userId: string, ids?: string[]): void {
  const now = new Date().toISOString();
  for (const notification of db.notifications) {
    if (notification.userId !== userId) continue;
    if (ids && !ids.includes(notification.id)) continue;
    notification.readAt = now;
  }
}

export function updateNotificationPreferences(
  db: DemoDb,
  userId: string,
  input: { releaseAlerts?: boolean; emailOptIn?: boolean; pushOptIn?: boolean },
): void {
  let prefs = db.notificationPreferences.find((item) => item.userId === userId);
  if (!prefs) {
    prefs = { userId, releaseAlerts: true, emailOptIn: false, pushOptIn: false };
    db.notificationPreferences.push(prefs);
  }
  if (input.releaseAlerts !== undefined) prefs.releaseAlerts = input.releaseAlerts;
  if (input.emailOptIn !== undefined) prefs.emailOptIn = input.emailOptIn;
  if (input.pushOptIn !== undefined) prefs.pushOptIn = input.pushOptIn;
}

export function updateProfile(
  db: DemoDb,
  actor: SessionUser,
  input: { displayName?: string; locale?: 'en' | 'ar'; country?: string },
): void {
  const user = db.users.find((item) => item.id === actor.id);
  if (!user) throw Errors.notFound('User not found');
  if (input.displayName !== undefined) user.displayName = input.displayName.trim();
  if (input.locale !== undefined) user.locale = input.locale;
  if (input.country !== undefined) user.country = input.country.toUpperCase().slice(0, 2);
}

export interface PlaybackAuthorization {
  sessionId: string;
  streamUrl: string;
  durationMs: number;
  trackId: string;
}

export interface PlaybackActor {
  id: string;
  roles: StaffRole[];
}

export function authorizePlayback(
  db: DemoDb,
  actor: PlaybackActor | null,
  trackId: string,
  anonymousHash: string | null,
): PlaybackAuthorization {
  const track = db.tracks.find((item) => item.id === trackId);
  if (!track) throw Errors.notFound('Track not found');
  const viewer = { userId: actor?.id ?? null, roles: actor?.roles ?? [] };
  const access = accessForTrack(db, track, viewer);
  if (!access.allowed)
    throw new AppError('playback_denied', 'Playback is not authorized.', 403);
  if (!track.audio)
    throw new AppError('audio_unavailable', 'Audio is not available.', 404);
  const existing = db.playbackSessions.find(
    (session) =>
      (actor
        ? session.userId === actor.id
        : session.anonymousSessionHash === anonymousHash) &&
      new Date(session.lastSeenAt).getTime() > Date.now() - 15 * 60_000,
  );
  const now = new Date().toISOString();
  let session: PlaybackSessionRecord;
  if (existing) {
    existing.lastSeenAt = now;
    session = existing;
  } else {
    session = {
      id: crypto.randomUUID(),
      userId: actor?.id ?? null,
      anonymousSessionHash: actor ? null : anonymousHash,
      startedAt: now,
      lastSeenAt: now,
    };
    db.playbackSessions.push(session);
  }
  const token = signPlaybackToken(track.id);
  return {
    sessionId: session.id,
    streamUrl: `/api/stream/${track.id}?token=${encodeURIComponent(token)}`,
    durationMs: track.durationMs,
    trackId: track.id,
  };
}

export function recordPlaybackEvent(
  db: DemoDb,
  actor: PlaybackActor | null,
  input: PlaybackEventInput,
): { qualified: boolean; qualifiedPlays: number; threshold: number; audibleMs: number } {
  const track = db.tracks.find((item) => item.id === input.trackId);
  if (!track) throw Errors.notFound('Track not found');
  const viewer = { userId: actor?.id ?? null, roles: actor?.roles ?? [] };
  const access = accessForTrack(db, track, viewer);
  if (!access.allowed)
    throw new AppError('playback_denied', 'Playback is not authorized.', 403);
  const session = db.playbackSessions.find((item) => item.id === input.sessionId);
  if (!session) throw Errors.notFound('Playback session not found');
  if (session.userId && actor && session.userId !== actor.id) throw Errors.forbidden();
  const previous = db.playbackEvents.filter(
    (event) => event.sessionId === input.sessionId && event.trackId === input.trackId,
  );
  const maxAudible = Math.max(
    input.audibleMs,
    ...previous.map((event) => event.audibleMs),
    0,
  );
  const threshold = qualifiedPlayThresholdMs(track.durationMs);
  const alreadyQualified = previous.some((event) => event.qualified);
  const shouldQualify = !alreadyQualified && threshold > 0 && maxAudible >= threshold;
  const event: PlaybackEventRecord = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    trackId: input.trackId,
    eventType: input.eventType,
    audibleMs: maxAudible,
    qualified: shouldQualify,
    occurredAt: new Date().toISOString(),
    requestId: input.requestId,
  };
  db.playbackEvents.push(event);
  if (shouldQualify) {
    track.qualifiedPlays += 1;
    if (actor) {
      const alreadyInHistory = db.history.some(
        (entry) => entry.userId === actor.id && entry.trackId === input.trackId,
      );
      if (!alreadyInHistory) {
        db.history.unshift({
          userId: actor.id,
          trackId: input.trackId,
          playedAt: new Date().toISOString(),
        });
      }
    }
  }
  return {
    qualified: shouldQualify,
    qualifiedPlays: track.qualifiedPlays,
    threshold,
    audibleMs: maxAudible,
  };
}

export function getPlaybackSessionOwner(
  db: DemoDb,
  sessionId: string,
): PlaybackSessionRecord | undefined {
  return db.playbackSessions.find((session) => session.id === sessionId);
}

export function quotaFor(db: DemoDb, userId: string, fallback: number) {
  return getQuotaSnapshot(db, userId, fallback);
}

export function trackReviewStatusLabel(status: ReviewStatus): string {
  return status.replace(/_/g, ' ');
}
