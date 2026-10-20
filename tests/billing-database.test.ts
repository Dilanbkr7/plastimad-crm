import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import postgres from "postgres";

test("billing persists per order with leading zeros and keeps legacy orders compatible", {
  skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 30_000,
}, async () => {
  dotenv.config({ path: ".env.local", quiet: true });
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
  const rollback = new Error("rollback-billing-test");
  try {
    await assert.rejects(sql.begin(async (tx) => {
      const [customer] = await tx`INSERT INTO customers (name, phone)
        VALUES ('Prueba transaccional', ${`test-${randomUUID().slice(0, 15)}`}) RETURNING id`;
      for (const [type, number] of [[null, null], ["CEDULA", "0123456789"], ["RUC", "0123456789001"]]) {
        const [order] = await tx`INSERT INTO orders
          (customer_id, product, quantity, address, total, billing_document_type, billing_document_number)
          VALUES (${customer.id}, 'Prueba transaccional', 1, 'Dirección de prueba', 100, ${type}, ${number})
          RETURNING billing_document_type, billing_document_number, payment_method`;
        assert.equal(order.billing_document_type, type);
        assert.equal(order.billing_document_number, number);
        assert.equal(order.payment_method, "CONTRAENTREGA");
      }
      throw rollback;
    }), (error) => error === rollback);
  } finally {
    await sql.end();
  }
});
