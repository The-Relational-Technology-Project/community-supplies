import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { fallbackToOriginalImage, getOriginalImageUrl, getThumbnailPath, getThumbnailUrl } from "./imageUrl";

const original = "https://example.supabase.co/storage/v1/object/public/supply-images/owner/photo.jpg";
const expect = (actual: unknown) => ({ toBe: (expected: unknown) => assert.equal(actual, expected) });

describe("saved catalog thumbnails", () => {
  test("photos and drawings use ordinary saved files, not paid transformations", () => {
    expect(getThumbnailUrl(original)).toBe(`${original}.thumb.jpg`);
    expect(getThumbnailUrl(original.replace("photo.jpg", "illustration/drawing.png"))).toBe(
      original.replace("photo.jpg", "illustration/drawing.png.thumb.jpg")
    );
  });
  test("legacy resizing URLs are converted to ordinary file URLs", () => {
    const legacy = original.replace("/object/public/", "/render/image/public/") + "?width=400&quality=70";
    expect(getOriginalImageUrl(legacy)).toBe(original);
    expect(getThumbnailUrl(legacy)).toBe(`${original}.thumb.jpg`);
  });
  test("missing thumbnails retry the full original only once", () => {
    const image = { src: `${original}.thumb.jpg` } as HTMLImageElement;
    fallbackToOriginalImage(image, original);
    expect(image.src).toBe(original);
    fallbackToOriginalImage(image, original);
    expect(image.src).toBe(original);
  });
  test("external images, empty URLs, and existing thumbnails remain safe", () => {
    expect(getThumbnailUrl("https://example.org/photo.jpg")).toBe("https://example.org/photo.jpg");
    expect(getThumbnailUrl(null)).toBe("");
    expect(getThumbnailPath("owner/photo.jpg.thumb.jpg")).toBe("owner/photo.jpg.thumb.jpg");
  });
});