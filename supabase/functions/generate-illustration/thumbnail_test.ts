import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
import { createImageThumbnail, decodeImage } from "../_shared/imageThumbnail.ts";

Deno.test("drawing thumbnails preserve portrait proportions without cropping", async () => {
  const source = new Image(900, 1200).fill(0xffffffff);
  const output = await decodeImage(await createImageThumbnail(await source.encode()));
  if (output.width !== 480 || output.height !== 640) throw new Error(`Unexpected size: ${output.width}x${output.height}`);
});

Deno.test("small drawings are not enlarged", async () => {
  const source = new Image(100, 200).fill(0xffffffff);
  const output = await decodeImage(await createImageThumbnail(await source.encode()));
  if (output.width !== 100 || output.height !== 200) throw new Error("Small drawing was enlarged");
});