import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const destination = new URL("../public/plastimad/optimized-v1/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const [name, source, width] of [
  ["hero", "landing/hero.png", 1600],
  ["eco-maceta-principal", "landing/eco-maceta-principal.png", 1000],
  ["eco-maceta-secundaria", "landing/eco-maceta-secundaria.png", 1000],
  ["logo", "logo.png", 480],
]) {
  const input = new URL(`../public/plastimad/${source}`, import.meta.url);
  const { fileURLToPath } = await import("node:url");
  const result = await sharp(fileURLToPath(input)).rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: name === "logo" ? 90 : 80, effort: 6 })
    .toFile(fileURLToPath(new URL(`${name}.webp`, destination)));
  console.log(`${name}: ${result.width}x${result.height}, ${result.size} bytes`);
}
