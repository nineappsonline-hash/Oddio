/** Direct-to-R2 single PUT with honest browser upload progress.
 * This is NOT multipart/resumable. Never proxy audio through the app server.
 */
export function uploadAudioWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
  onRequest?: (request: XMLHttpRequest | null) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    onRequest?.(request);
    request.open('PUT', url);
    Object.entries(headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value),
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        // 100% is only shown after R2 acknowledges the full upload.
        onProgress(Math.min(99, Math.floor((event.loaded / event.total) * 100)));
      }
    };
    request.onload = () => {
      onRequest?.(null);
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else
        reject(new Error(`Audio storage rejected the upload (HTTP ${request.status}).`));
    };
    request.onerror = () => {
      onRequest?.(null);
      reject(
        new Error('Audio storage connection failed. Check Cloudflare R2 CORS and retry.'),
      );
    };
    request.onabort = () => {
      onRequest?.(null);
      reject(
        new Error('Upload cancelled. The original audio file remains on your device.'),
      );
    };
    try {
      request.send(file);
    } catch (error) {
      onRequest?.(null);
      reject(error);
    }
  });
}
