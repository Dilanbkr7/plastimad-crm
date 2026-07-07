import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Configuración general de Plastimad.
 *
 * Esta tabla evita colocar directamente en el código:
 * - nombre comercial;
 * - teléfono;
 * - número de WhatsApp;
 * - correo;
 * - logo;
 * - colores de marca;
 * - política de entrega gratuita.
 *
 * En la primera versión estos datos se podrán modificar
 * desde Supabase Table Editor.
 *
 * Posteriormente construiremos /crm/settings para que
 * el administrador pueda modificarlos desde el CRM.
 */
export const businessSettings = pgTable(
  "business_settings",
  {
    id: serial("id").primaryKey(),

    /**
     * Identificador estable de la configuración.
     *
     * Usaremos "plastimad" para encontrar la fila
     * sin depender de que tenga obligatoriamente id = 1.
     */
    code: varchar("code", {
      length: 50,
    }).notNull(),

    businessName: text("business_name").notNull(),

    legalName: text("legal_name"),

    phone: varchar("phone", {
      length: 20,
    }).notNull(),

    /**
     * Número internacional sin signos ni espacios.
     *
     * Ejemplo:
     * 593999936165
     */
    whatsappNumber: varchar("whatsapp_number", {
      length: 20,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    }),

    logoUrl: text("logo_url"),

    /**
     * Colores editables de la identidad visual.
     *
     * Son valores iniciales aproximados al logo.
     * Más adelante el cliente podrá modificarlos.
     */
    primaryColor: varchar("primary_color", {
      length: 9,
    })
      .notNull()
      .default("#12B83E"),

    secondaryColor: varchar("secondary_color", {
      length: 9,
    })
      .notNull()
      .default("#A66A21"),

    darkColor: varchar("dark_color", {
      length: 9,
    })
      .notNull()
      .default("#075E35"),

    freeDeliveryEnabled: boolean("free_delivery_enabled")
      .notNull()
      .default(true),

    freeDeliveryCity: varchar("free_delivery_city", {
      length: 100,
    })
      .notNull()
      .default("Quito"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    /**
     * Esta columna no se modifica automáticamente.
     *
     * Cuando construyamos /crm/settings, la aplicación
     * enviará updatedAt: new Date() en cada actualización.
     */
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_settings_code_unique").on(
      table.code,
    ),
  ],
);

/**
 * Tabla de clientes.
 *
 * Se conservan todas las columnas actuales para no romper
 * el pedido de prueba ni la página /crm.
 */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),

    name: text("name").notNull(),

    phone: varchar("phone", {
      length: 20,
    }).notNull(),

    /**
     * El correo será opcional en la landing.
     *
     * WhatsApp y teléfono seguirán siendo el principal
     * canal de comunicación para el MVP.
     */
    email: varchar("email", {
      length: 255,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /**
     * Todavía no hacemos el teléfono único.
     *
     * Primero actualizaremos la API para buscar o crear
     * clientes correctamente antes de agregar esa restricción.
     */
    index("customers_phone_idx").on(table.phone),
  ],
);

/**
 * Catálogo de productos de Plastimad.
 *
 * La primera fila será Eco Maceta CNC.
 */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),

    /**
     * Identificador utilizado en URL y consultas.
     *
     * Ejemplo:
     * eco-maceta-cnc
     */
    slug: varchar("slug", {
      length: 120,
    }).notNull(),

    name: text("name").notNull(),

    shortDescription: text("short_description"),

    description: text("description"),

    /**
     * Precio base de referencia en centavos.
     *
     * El precio final del pedido se tomará de offers.
     */
    basePriceCents: integer("base_price_cents").notNull(),

    active: boolean("active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_active_idx").on(table.active),
  ],
);

/**
 * Variantes del producto.
 *
 * Esta tabla permitirá administrar colores o acabados.
 * Por ahora quedará creada, pero no inventaremos colores
 * hasta que Plastimad entregue la lista real.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),

    productId: integer("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    colorHex: varchar("color_hex", {
      length: 9,
    }),

    imageUrl: text("image_url"),

    active: boolean("active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_product_name_unique").on(
      table.productId,
      table.name,
    ),
    index("product_variants_product_idx").on(
      table.productId,
    ),
  ],
);

/**
 * Ofertas o combos.
 *
 * Cada fila define una cantidad y su precio total.
 *
 * Ejemplos:
 * 1 unidad  = 5500 centavos
 * 2 unidades = 8500 centavos
 * 3 unidades = 10500 centavos
 */
export const offers = pgTable(
  "offers",
  {
    id: serial("id").primaryKey(),

    productId: integer("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 120,
    }).notNull(),

    quantity: integer("quantity").notNull(),

    priceCents: integer("price_cents").notNull(),

    featured: boolean("featured")
      .notNull()
      .default(false),

    active: boolean("active")
      .notNull()
      .default(true),

    sortOrder: integer("sort_order")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("offers_product_quantity_unique").on(
      table.productId,
      table.quantity,
    ),
    index("offers_product_idx").on(table.productId),
    index("offers_active_idx").on(table.active),
  ],
);

/**
 * Zonas y modalidades de entrega.
 *
 * Permitirá separar:
 * - entrega propia y gratuita en Quito;
 * - entrega mediante courier para provincias;
 * - zonas temporalmente deshabilitadas.
 */
export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: serial("id").primaryKey(),

    code: varchar("code", {
      length: 80,
    }).notNull(),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    province: varchar("province", {
      length: 100,
    }),

    city: varchar("city", {
      length: 100,
    }),

    sector: varchar("sector", {
      length: 150,
    }),

    /**
     * Valores previstos:
     * LOCAL
     * COURIER
     */
    deliveryType: varchar("delivery_type", {
      length: 30,
    })
      .notNull()
      .default("LOCAL"),

    deliveryFeeCents: integer("delivery_fee_cents")
      .notNull()
      .default(0),

    freeDelivery: boolean("free_delivery")
      .notNull()
      .default(false),

    /**
     * Cuando todavía no exista una tarifa automática,
     * el formulario mostrará "tarifa por confirmar".
     */
    requiresQuote: boolean("requires_quote")
      .notNull()
      .default(false),

    /**
     * Indica si en esta zona se puede cobrar al entregar.
     */
    cashOnDeliveryAvailable: boolean(
      "cash_on_delivery_available",
    )
      .notNull()
      .default(true),

    active: boolean("active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("delivery_zones_code_unique").on(
      table.code,
    ),
    index("delivery_zones_active_idx").on(table.active),
    index("delivery_zones_city_idx").on(table.city),
  ],
);

/**
 * Tabla principal de pedidos.
 *
 * Las columnas originales se mantienen intactas.
 * Las columnas nuevas son nullable o tienen un valor
 * por defecto seguro para conservar los registros actuales.
 */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),

    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, {
        onDelete: "restrict",
      }),

    /**
     * Se mantiene porque /crm todavía utiliza directamente
     * orders.product para mostrar el nombre.
     */
    product: text("product").notNull(),

    /**
     * Nuevas referencias estructuradas.
     *
     * Son opcionales para que el pedido de prueba existente
     * continúe siendo válido.
     */
    productId: integer("product_id").references(
      () => products.id,
      {
        onDelete: "set null",
      },
    ),

    variantId: integer("variant_id").references(
      () => productVariants.id,
      {
        onDelete: "set null",
      },
    ),

    offerId: integer("offer_id").references(
      () => offers.id,
      {
        onDelete: "set null",
      },
    ),

    zoneId: integer("zone_id").references(
      () => deliveryZones.id,
      {
        onDelete: "set null",
      },
    ),

    quantity: integer("quantity").notNull(),

    /**
     * Dirección completa.
     *
     * Se conserva para compatibilidad con el CRM.
     */
    address: text("address").notNull(),

    province: varchar("province", {
      length: 100,
    }),

    city: varchar("city", {
      length: 100,
    }),

    sector: varchar("sector", {
      length: 150,
    }),

    reference: text("reference"),

    notes: text("notes"),

    /**
     * Estados del proceso:
     * RECIBIDO
     * CONFIRMADO
     * PROGRAMADO
     * EN_RUTA
     * ENTREGADO_COBRADO
     * REPROGRAMAR
     * NOVEDAD
     * CANCELADO
     */
    status: varchar("status", {
      length: 30,
    })
      .notNull()
      .default("RECIBIDO"),

    /**
     * Tipo de entrega:
     * LOCAL o COURIER.
     */
    deliveryType: varchar("delivery_type", {
      length: 30,
    })
      .notNull()
      .default("LOCAL"),

    /**
     * Precio del producto antes del envío.
     *
     * Se deja nullable porque el pedido antiguo solo tiene total.
     */
    subtotalCents: integer("subtotal_cents"),

    deliveryFeeCents: integer("delivery_fee_cents")
      .notNull()
      .default(0),

    /**
     * Total final almacenado en centavos.
     *
     * Se conserva el nombre actual para no romper /crm.
     */
    total: integer("total").notNull(),

    /**
     * Métodos previstos:
     * CONTRAENTREGA
     * TRANSFERENCIA
     * DEUNA
     * PAYPHONE
     */
    paymentMethod: varchar("payment_method", {
      length: 30,
    })
      .notNull()
      .default("CONTRAENTREGA"),

    /**
     * Estados previstos:
     * PENDIENTE
     * EN_REVISION
     * PAGADO
     * RECHAZADO
     * REEMBOLSADO
     */
    paymentStatus: varchar("payment_status", {
      length: 30,
    })
      .notNull()
      .default("PENDIENTE"),

    /**
     * Origen comercial del pedido.
     *
     * Ejemplos:
     * DIRECTO
     * TIKTOK
     * META
     * WHATSAPP
     */
    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("DIRECTO"),

    utmSource: varchar("utm_source", {
      length: 120,
    }),

    utmMedium: varchar("utm_medium", {
      length: 120,
    }),

    utmCampaign: varchar("utm_campaign", {
      length: 180,
    }),

    utmContent: varchar("utm_content", {
      length: 180,
    }),

    /**
     * Número de intentos de entrega.
     */
    attemptCount: integer("attempt_count")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("orders_customer_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_product_idx").on(table.productId),
    index("orders_zone_idx").on(table.zoneId),
    index("orders_payment_status_idx").on(
      table.paymentStatus,
    ),
  ],
);

/**
 * Historial inmutable de cambios de estado.
 *
 * Cada vez que un administrador modifica un pedido,
 * se crea una nueva fila. Las filas anteriores no se
 * reemplazan ni se eliminan.
 */
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),

    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, {
        onDelete: "cascade",
      }),

    /**
     * Puede ser null cuando se registra el estado
     * inicial de un pedido antiguo.
     */
    previousStatus: varchar("previous_status", {
      length: 30,
    }),

    newStatus: varchar("new_status", {
      length: 30,
    }).notNull(),

    /**
     * Observación administrativa opcional.
     *
     * Ejemplo:
     * "Cliente confirmó la dirección por WhatsApp".
     */
    note: text("note"),

    /**
     * UUID del usuario autenticado en Supabase Auth.
     *
     * No se declara una FK hacia auth.users para evitar
     * acoplar las migraciones al esquema interno de Supabase.
     */
    changedByUserId: uuid("changed_by_user_id"),

    /**
     * Se conserva también el correo utilizado en el momento
     * del cambio. Así la auditoría sigue siendo entendible
     * aunque posteriormente se modifique o elimine el usuario.
     */
    changedByEmail: varchar("changed_by_email", {
      length: 255,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("order_status_history_order_idx").on(
      table.orderId,
    ),

    index("order_status_history_created_at_idx").on(
      table.createdAt,
    ),

    index("order_status_history_new_status_idx").on(
      table.newStatus,
    ),
  ],
);