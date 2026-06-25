import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Tabla de clientes.
 *
 * El cliente se registra automáticamente cuando
 * realiza un pedido. No necesita crear una cuenta.
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),

  phone: varchar("phone", {
    length: 20,
  }).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

/**
 * Tabla principal de pedidos.
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),

  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, {
      onDelete: "restrict",
    }),

  product: text("product").notNull(),

  quantity: integer("quantity").notNull(),

  address: text("address").notNull(),

  status: varchar("status", {
    length: 30,
  })
    .notNull()
    .default("RECIBIDO"),

  /**
   * Total almacenado en centavos.
   * Ejemplo: 2000 representa USD 20,00.
   */
  total: integer("total").notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});