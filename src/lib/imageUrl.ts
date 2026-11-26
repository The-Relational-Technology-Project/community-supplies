/** Normalize legacy transformed URLs without making another resizing request. */
export function getOriginalImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.includes("/storage/v1/render/image/public/")) return url;
  return url.replace("/storage/v1/render/image/public/", "/storage/v1/object/public/").split("?")[0];
}

/** Immutable thumbnails are generated once, never on a catalog visit. */
export function getThumbnailPath(path: string): string {
  return path.endsWith(".thumb.jpg") ? path : `${path}.thumb.jpg`;
}

export function getThumbnailUrl(url: string | null | undefined): string {
  const original = getOriginalImageUrl(url);
  if (!original.includes("/storage/v1/object/public/supply-images/")) return original;
  const parsed = new URL(original);
  parsed.pathname = getThumbnailPath(parsed.pathname);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

/** Missing legacy thumbnails fall back to ordinary originals, never transforms. */
export function fallbackToOriginalImage(image: HTMLImageElement, url: string | null | undefined): void {
  const original = getOriginalImageUrl(url);
  if (original && image.src !== original) image.src = original;
}
