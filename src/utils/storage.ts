import { supabase } from '../lib/supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param bucket - The name of the storage bucket
 * @param path - The full path including filename where the file will be stored
 * @param file - The file object to upload
 */
export const uploadToSupabase = async (bucket: string, path: string, file: File): Promise<string> => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Deletes a file from Supabase Storage based on its URL or path.
 * @param bucket - The name of the storage bucket
 * @param pathOrUrl - The full path or the public URL of the file
 */
export const deleteFromSupabase = async (bucket: string, pathOrUrl: string): Promise<void> => {
  if (!pathOrUrl) return;
  
  // If it's a full URL, extract the path after the bucket name
  let path = pathOrUrl;
  if (pathOrUrl.includes(`/${bucket}/`)) {
    const parts = pathOrUrl.split(`/${bucket}/`);
    path = parts[1];
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
    
  if (error) {
    console.error(`Error deleting file from bucket ${bucket}:`, error);
  }
};
