import { randomUUID } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Uploads a base64-encoded image to Supabase Storage
 */
export async function uploadImageToStorage(
  base64Data: string,
  mimeType: string,
  bucket: string = 'symbols'
): Promise<UploadResult | null> {
  if (!supabaseAdmin) {
    console.warn(JSON.stringify({ type: 'warning', message: 'Supabase not configured, skipping upload' }));
    return null;
  }

  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `${randomUUID()}.${ext}`;
    const path = `generated/${filename}`;

    // Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (error) {
      console.error(JSON.stringify({ type: 'storage_error', error: error.message }));
      return null;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      path
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(JSON.stringify({ type: 'storage_error', error: message }));
    return null;
  }
}
