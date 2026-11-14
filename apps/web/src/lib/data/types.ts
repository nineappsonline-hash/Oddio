import type {
  Album,
  Artist,
  ArtistApplication,
  ArtistApplicationStatus,
  AuditEntry,
  Comment,
  Genre,
  Mood,
  Notification,
  Playlist,
  Report,
  StaffRole,
  Track,
  VerificationStatus,
} from '@ai-music/contracts';

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  locale: 'en' | 'ar';
  country: string;
  roles: StaffRole[];
  createdAt: string;
}

export interface LikeRecord {
  userId: string;
  trackId: string;
  createdAt: string;
}

export interface FollowRecord {
  userId: string;
  artistId: string;
  createdAt: string;
}

export interface PlaylistFollowRecord {
  userId: string;
  playlistId: string;
  createdAt: string;
}

export interface VerificationRequestRecord {
  id: string;
  artistId: string;
  requesterId: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerId: string | null;
  createdAt: string;
}

export interface FeaturedSlotRecord {
  id: string;
  slot: string;
  entityType: 'track' | 'artist' | 'playlist';
  entityId: string;
  rank: number;
  startAt?: string | null;
  endAt?: string | null;
}

export interface QuotaLimitRecord {
  ownerId: string;
  dailyLimit: number;
  changedBy: string | null;
  changedAt: string;
}

export interface UploadEventRecord {
  id: string;
  userId: string;
  trackId: string;
  countedDateUtc: string;
  status: 'counted' | 'failed' | 'reverted';
  idempotencyKey: string;
  createdAt: string;
}

export interface PlaybackSessionRecord {
  id: string;
  userId: string | null;
  anonymousSessionHash: string | null;
  startedAt: string;
  lastSeenAt: string;
}

export interface PlaybackEventRecord {
  id: string;
  sessionId: string;
  trackId: string;
  eventType: string;
  audibleMs: number;
  qualified: boolean;
  occurredAt: string;
  requestId: string;
}

export interface NotificationPreferenceRecord {
  userId: string;
  releaseAlerts: boolean;
  emailOptIn: boolean;
  pushOptIn: boolean;
}

export interface DemoDb {
  version: number;
  users: DemoUser[];
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  genres: Genre[];
  moods: Mood[];
  playlists: Playlist[];
  likes: LikeRecord[];
  artistFollows: FollowRecord[];
  playlistFollows: PlaylistFollowRecord[];
  comments: Comment[];
  notifications: Notification[];
  notificationPreferences: NotificationPreferenceRecord[];
  applications: ArtistApplication[];
  reports: Report[];
  verificationRequests: VerificationRequestRecord[];
  featuredSlots: FeaturedSlotRecord[];
  auditLogs: AuditEntry[];
  quotaLimits: QuotaLimitRecord[];
  uploadEvents: UploadEventRecord[];
  playbackSessions: PlaybackSessionRecord[];
  playbackEvents: PlaybackEventRecord[];
  history: { userId: string; trackId: string; playedAt: string }[];
}

export type {
  Artist,
  Album,
  Track,
  Playlist,
  Comment,
  ArtistApplication,
  ArtistApplicationStatus,
  Report,
  VerificationStatus,
};
