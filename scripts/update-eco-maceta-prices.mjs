import dotenv from "dotenv";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

dotenv.config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
const prices = new Map([[1, 4000], [2, 7000], [3, 10000]]);
try {
  const result = await sql.begin(async (tx) => {
    await tx`SET LOCAL lock_timeout = '5s'`;
    await tx`SET LOCAL statement_timeout = '15s'`;
    const [product] = await tx`SELECT id, slug, base_price_cents FROM products
      WHERE slug = 'eco-maceta-cnc' AND active = true FOR UPDATE`;
    if (!product) throw new Error("No existe la Eco Maceta activa. No se cambió ningún precio.");
    const offers = await tx`SELECT id, quantity, price_cents FROM offers
      WHERE product_id = ${product.id} AND active = true ORDER BY quantity FOR UPDATE`;
    if (offers.length !== 3 || offers.some((offer, i) => offer.quantity !== i + 1)) {
      throw new Error("El catálogo no contiene exactamente los tres combos esperados. Operación cancelada.");
    }
    await mkdir(".backups", { recursive: true });
    const backupPath = `.backups/eco-maceta-prices-${Date.now()}.json`;
    await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), product, offers }), { flag: "wx" });
    await tx`UPDATE products SET base_price_cents = ${prices.get(1)}, updated_at = now() WHERE id = ${product.id}`;
    for (const offer of offers) {
      await tx`UPDATE offers SET price_cents = ${prices.get(offer.quantity)}, updated_at = now() WHERE id = ${offer.id}`;
    }
    const updated = await tx`SELECT quantity, price_cents FROM offers
      WHERE product_id = ${product.id} AND active = true ORDER BY quantity`;
    if (updated.some((offer) => offer.price_cents !== prices.get(offer.quantity))) throw new Error("Verificación de precios fallida.");
    return { backupPath, offers: updated };
  });
  console.log(JSON.stringify(result));
} finally {
  await sql.end();
}
