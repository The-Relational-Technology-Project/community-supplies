// The Deno distribution uses WebAssembly codecs. The npm distribution loads
// native FFI modules, which are unavailable in Supabase's hosted runtime.
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

// Upstream's v1.2 declarations mistakenly name the static decoder `encode`.
export function decodeImage(bytes: Uint8Array): Promise<Image> {
  const decoder = Image as unknown as { decode: (data: Uint8Array) => Promise<Image> };
  return decoder.decode(bytes);
}

/** Preserve the complete frame, including white margins around line drawings. */
export async function createImageThumbnail(bytes: Uint8Array): Promise<Uint8Array> {
  const image = await decodeImage(bytes);
  const scale = Math.min(1, 640 / Math.max(image.width, image.height));
  if (scale < 1) {
    image.resize(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
  }
  return image.encodeJPEG(78);
}