import { AppError } from '@/lib/errors';

/**
 * Submission attestations are evidence of a creator's declaration, not
 * independent proof of licenses or performer permission.
 *
 * Never rely on the client checkbox alone as proof of actual rights.
 */
export function assertUploadAttestations(input: {
  rightsConfirmed: string;
  voiceConfirmed: string;
}): void {
  if (input.rightsConfirmed !== 'yes') {
    throw new AppError(
      'rights_declaration_required',
      'Confirm that you have permission to distribute the music, lyrics and artwork.',
      422,
    );
  }
  if (input.voiceConfirmed !== 'yes') {
    throw new AppError(
      'voice_consent_required',
      'Confirm that you have not imitated a real person without their permission.',
      422,
    );
  }
}

export const RIGHTS_AUDIT_ACTION = 'track.upload_rights_declared.v1';
