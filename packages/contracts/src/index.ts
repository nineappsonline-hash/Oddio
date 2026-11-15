import { z } from 'zod';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const visibilityValues = ['public', 'unlisted', 'private'] as const;
export type Visibility = (typeof visibilityValues)[number];

export const reviewStatusValues = [
  'draft',
  'processing',
  'ready_for_review',
  'pending_review',
  'approved',
  'rejected',
  'changes_requested',
] as const;
export type ReviewStatus = (typeof reviewStatusValues)[number];

export const publishStatusValues = [
  'unpublished',
  'scheduled',
  'published',
  'available_private',
] as const;
export type PublishStatus = (typeof publishStatusValues)[number];

export const artistApplicationStatusValues = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'needs_information',
] as const;
export type ArtistApplicationStatus = (typeof artistApplicationStatusValues)[number];

export const verificationStatusValues = [
  'not_requested',
  'pending',
  'approved',
  'rejected',
] as const;
export type VerificationStatus = (typeof verificationStatusValues)[number];

export const staffRoleValues = ['super_admin', 'admin', 'moderator'] as const;
export type StaffRole = (typeof staffRoleValues)[number];

export const reportReasonValues = [
  'copyright',
  'impersonation',
  'explicit_content',
  'harassment',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof reportReasonValues)[number];

export const notificationTypeValues = [
  'artist_application_decision',
  'track_review_decision',
  'new_release',
  'verification_decision',
  'system',
] as const;
export type NotificationType = (typeof notificationTypeValues)[number];

export interface Genre {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  active: boolean;
}

export interface Mood {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  active: boolean;
}

export interface ArtistSocialLink {
  platform: string;
  url: string;
  sortOrder: number;
}

export interface Artist {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  bio: string;
  /** Artist-confirmed alternate spellings, not guessed transliterations. */
  searchAliases?: string[];
  avatarUrl: string;
  coverUrl: string;
  accent: string;
  featuredTrackId: string | null;
  verificationStatus: VerificationStatus;
  socialLinks: ArtistSocialLink[];
  createdAt: string;
}

export interface Album {
  id: string;
  artistId: string;
  title: string;
  description: string;
  artworkUrl: string;
  releaseAt: string;
  status: PublishStatus;
  visibility: Visibility;
}

export interface Artwork {
  url: string;
  accent: string;
}

export interface AudioAsset {
  kind: 'original' | 'rendition';
  objectKey: string;
  format: string;
  bitrateKbps: number;
  sampleRate: number;
  channels: number;
  bytes: number;
  sha256: string;
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
}

export interface Track {
  id: string;
  artistId: string;
  albumId: string | null;
  title: string;
  slug: string;
  description: string;
  genreId: string;
  genreIds?: string[];
  moodIds: string[];
  languageCode: string;
  countryCode: string;
  productionType: 'fully_ai' | 'ai_assisted';
  aiTools: string;
  explicit: boolean;
  visibility: Visibility;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  releaseAt: string;
  durationMs: number;
  lyrics: string;
  credits: string;
  artwork: Artwork;
  audioUrl: string;
  audio: AudioAsset | null;
  /** Advisory worker measurement; artist genre and mood remain authoritative. */
  audioFeatures?: {
    schemaVersion: number;
    tempoBpm: number | null;
    tempoConfidence: number;
    rmsDbfs: number | null;
    peakDbfs: number | null;
    analyzedSeconds: number;
  } | null;
  qualityLabel: string;
  qualifiedPlays: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackRelations {
  artist?: Artist;
  album?: Album | null;
  genre?: Genre;
  moods?: Mood[];
}

export type TrackWithRelations = Track & TrackRelations;

export interface PublicUser {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  locale: Locale;
  country: string;
  roles: StaffRole[];
  isArtistManager: boolean;
  artistIds: string[];
}

export interface SessionUser extends PublicUser {
  email: string;
}

export interface Playlist {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  visibility: Visibility;
  coverUrl: string;
  trackIds: string[];
  followers: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  trackId: string;
  body: string;
  timestampSeconds?: number | null;
  status: 'visible' | 'hidden' | 'pending';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Machine-readable context used for dedupe and deep links. */
  payload?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ArtistApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  displayName: string;
  description: string;
  portfolioUrl: string;
  contactEmail: string;
  rightsDeclared: boolean;
  status: ArtistApplicationStatus;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'track' | 'artist' | 'comment';
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  details: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface QuotaSnapshot {
  ownerId: string;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  dateUtc: string;
}

export interface PlaybackSessionInfo {
  id: string;
  trackId: string;
  startedAt: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export const artistApplicationInput = z.object({
  displayName: z.string().trim().min(2).max(80),
  description: z.string().trim().min(40).max(2000),
  portfolioUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || /^https?:\/\//.test(value), {
      message: 'Portfolio link must start with http:// or https://',
    }),
  contactEmail: z.string().trim().email(),
  rightsDeclared: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm distribution rights' }),
  }),
});
export type ArtistApplicationInput = z.infer<typeof artistApplicationInput>;

export const artistProfileInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes'),
  bio: z.string().trim().max(2000),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Accent must be a hex colour')
    .default('#9D5CFF'),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(40),
        url: z.string().url().max(500),
      }),
    )
    .max(8)
    .default([]),
});
export type ArtistProfileInput = z.infer<typeof artistProfileInput>;

export const trackDraftInput = z.object({
  artistId: z.string().uuid(),
  albumId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(160),
  genreId: z.string().uuid(),
  genreIds: z.array(z.string().uuid()).min(1).max(5).optional(),
  moodIds: z.array(z.string().uuid()).max(5).default([]),
  languageCode: z.string().trim().min(2).max(8),
  countryCode: z.string().trim().max(2).default(''),
  productionType: z.enum(['fully_ai', 'ai_assisted']),
  aiTools: z.string().trim().max(300),
  lyrics: z.string().trim().max(20000).default(''),
  credits: z.string().trim().max(5000).default(''),
  visibility: z.enum(visibilityValues),
  releaseAt: z.string().datetime({ offset: true }).nullable().optional(),
  description: z.string().trim().max(2000).default(''),
});
export type TrackDraftInput = z.infer<typeof trackDraftInput>;

export const commentInput = z.object({
  body: z.string().trim().min(1).max(2000),
  timestampSeconds: z.number().int().min(0).max(86400).nullable().optional(),
});
export type CommentInput = z.infer<typeof commentInput>;

export const playlistInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(''),
  visibility: z.enum(['public', 'private']),
});
export type PlaylistInput = z.infer<typeof playlistInput>;

export const reportInput = z.object({
  targetType: z.enum(['track', 'artist', 'comment']),
  targetId: z.string().min(1),
  reason: z.enum(reportReasonValues),
  details: z.string().trim().max(2000).default(''),
});
export type ReportInput = z.infer<typeof reportInput>;

export const playbackEventInput = z.object({
  sessionId: z.string().min(1),
  trackId: z.string().min(1),
  eventType: z.enum([
    'start',
    'progress',
    'qualified',
    'pause',
    'seek',
    'complete',
    'error',
  ]),
  audibleMs: z.number().int().min(0).max(86_400_000),
  requestId: z.string().min(1).max(120),
});
export type PlaybackEventInput = z.infer<typeof playbackEventInput>;

export const searchQuery = z.object({
  q: z.string().trim().max(120).default(''),
  genre: z.string().trim().max(80).optional(),
  mood: z.string().trim().max(80).optional(),
  language: z.string().trim().max(8).optional(),
  country: z.string().trim().max(2).optional(),
  sort: z.enum(['relevant', 'newest', 'popular']).default('relevant'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type SearchQuery = z.infer<typeof searchQuery>;

export const reviewDecisionInput = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reason: z.string().trim().max(2000).default(''),
});
export type ReviewDecisionInput = z.infer<typeof reviewDecisionInput>;

export const applicationDecisionInput = z.object({
  decision: z.enum(['approve', 'reject', 'request_information']),
  notes: z.string().trim().max(2000).default(''),
});
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionInput>;

export const chartQuery = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  country: z.string().trim().max(2).optional(),
  genre: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ChartQuery = z.infer<typeof chartQuery>;

export const QUALIFIED_PLAY_MS = 30_000;

export function qualifiedPlayThresholdMs(durationMs: number): number {
  return Math.min(QUALIFIED_PLAY_MS, Math.max(0, durationMs));
}
