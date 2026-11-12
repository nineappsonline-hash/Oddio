import type { Playlist, StaffRole, Track, Visibility } from '@ai-music/contracts';

export interface Viewer {
  userId: string | null;
  roles: StaffRole[];
}

export const anonymousViewer: Viewer = { userId: null, roles: [] };

export function isStaff(viewer: Viewer): boolean {
  return viewer.roles.length > 0;
}

export function isAdmin(viewer: Viewer): boolean {
  return viewer.roles.includes('admin') || viewer.roles.includes('super_admin');
}

export function isModerator(viewer: Viewer): boolean {
  return viewer.roles.includes('moderator') || isAdmin(viewer);
}

export function isReleased(track: Pick<Track, 'releaseAt'>, now = new Date()): boolean {
  return new Date(track.releaseAt).getTime() <= now.getTime();
}

export type TrackAccessReason =
  | 'public'
  | 'unlisted'
  | 'owner'
  | 'staff'
  | 'not_approved'
  | 'not_published'
  | 'scheduled'
  | 'private'
  | 'blocked';

export interface TrackAccess {
  allowed: boolean;
  listable: boolean;
  chartEligible: boolean;
  indexable: boolean;
  reason: TrackAccessReason;
}

export type TrackAccessFields = Pick<
  Track,
  'visibility' | 'reviewStatus' | 'publishStatus' | 'releaseAt' | 'explicit'
>;

/**
 * Central authorization gate for track metadata + playback.
 * `artistOwnerId` is resolved from the artist record, never from client input.
 * Mirrors the SQL policies in supabase/migrations and is unit-tested.
 */
export function evaluateTrackAccess(
  track: TrackAccessFields,
  viewer: Viewer = anonymousViewer,
  now = new Date(),
  artistOwnerId: string | null = null,
): TrackAccess {
  const owner = Boolean(
    viewer.userId && artistOwnerId && viewer.userId === artistOwnerId,
  );
  const staff = isStaff(viewer);
  const released = isReleased(track, now);
  const approved = track.reviewStatus === 'approved';
  const published = track.publishStatus === 'published';
  const blocked = track.reviewStatus === 'rejected';

  if (staff) {
    return {
      allowed: true,
      listable: approved && published && released && track.visibility === 'public',
      chartEligible: approved && published && released && track.visibility === 'public',
      indexable: approved && published && released && track.visibility === 'public',
      reason: 'staff',
    };
  }

  if (!approved) {
    return {
      allowed: owner && !blocked,
      listable: false,
      chartEligible: false,
      indexable: false,
      reason: blocked ? 'blocked' : 'not_approved',
    };
  }

  if (track.visibility === 'private' || track.publishStatus === 'available_private') {
    return {
      allowed: owner,
      listable: false,
      chartEligible: false,
      indexable: false,
      reason: owner ? 'owner' : 'private',
    };
  }

  if (!published || !released) {
    return {
      allowed: owner && released,
      listable: false,
      chartEligible: false,
      indexable: false,
      reason: published ? 'scheduled' : 'not_published',
    };
  }

  if (track.visibility === 'unlisted') {
    return {
      allowed: true,
      listable: false,
      chartEligible: false,
      indexable: false,
      reason: 'unlisted',
    };
  }

  return {
    allowed: true,
    listable: true,
    chartEligible: true,
    indexable: true,
    reason: 'public',
  };
}

export function canViewPlaylist(
  playlist: Pick<Playlist, 'visibility' | 'ownerId'>,
  viewer: Viewer = anonymousViewer,
): boolean {
  if (playlist.visibility === 'public') return true;
  if (viewer.userId && playlist.ownerId === viewer.userId) return true;
  return isStaff(viewer);
}

export function canEditOwnedResource(
  ownerUserId: string,
  viewer: Viewer,
  options: { staffCanEdit?: boolean } = {},
): boolean {
  if (viewer.userId && viewer.userId === ownerUserId) return true;
  return options.staffCanEdit === true && isStaff(viewer);
}

export function filterPublicTracks(tracks: Track[], now = new Date()): Track[] {
  return tracks.filter(
    (track) => evaluateTrackAccess(track, anonymousViewer, now).listable,
  );
}

export function isVisibilityAllowedForPlaylist(visibility: Visibility): boolean {
  return visibility === 'public' || visibility === 'private';
}
