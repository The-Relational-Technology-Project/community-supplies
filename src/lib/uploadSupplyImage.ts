import { supabase } from "@/integrations/supabase/client";
import { compressFile } from "@/lib/imageCompression";
import { getThumbnailPath } from "@/lib/imageUrl";

/** Originals stay available for details; card-sized copies are prepared locally. */
export async function uploadSupplyImage(storagePath: string, blob: Blob): Promise<string> {
  const bucket = supabase.storage.from("supply-images");
  const { error } = await bucket.upload(storagePath, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw error;

  // A failed thumbnail must never lose a successfully uploaded original.
  try {
    const thumbnail = await compressFile(new File([blob], "thumbnail.jpg", { type: blob.type }), 640, 0.78);
    try {
      const { error: thumbnailError } = await bucket.upload(getThumbnailPath(storagePath), thumbnail.blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (thumbnailError) throw thumbnailError;
    } finally {
      URL.revokeObjectURL(thumbnail.previewUrl);
    }
  } catch (thumbnailError) {
    console.warn("Thumbnail unavailable; the catalog will use the original photo.", thumbnailError);
  }

  return bucket.getPublicUrl(storagePath).data.publicUrl;
}