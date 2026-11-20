/** Device-local choice: personalized recommendations are opt-out for signed-in listeners.
 * This does not disable playback history collection or clear server-side history.
 */
export const homePersonalizationKey = (userId: string) =>
  'oddio-home-personalization-v1:' + userId;

export function parseHomePersonalizationPreference(raw: string | null): boolean {
  // Missing/invalid preference retains the product default, on.
  return raw !== 'off';
}
