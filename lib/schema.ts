import {
  boolean,
  index,
  integer,
  jsonb,
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
     * 593995152308
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

    /** Horario de atención humana (0=domingo, 6=sábado). */
    supportTimezone: varchar("support_timezone", {
      length: 64,
    })
      .notNull()
      .default("America/Guayaquil"),

    supportDays: varchar("support_days", {
      length: 20,
    })
      .notNull()
      .default("1,2,3,4,5,6"),

    supportOpenTime: varchar("support_open_time", {
      length: 5,
    })
      .notNull()
      .default("08:00"),

    supportCloseTime: varchar("support_close_time", {
      length: 5,
    })
      .notNull()
      .default("17:00"),

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

/**
 * Leads comerciales capturados desde el asistente web.
 *
 * Una conversación puede existir inicialmente sin datos
 * personales. El lead se crea cuando el visitante proporciona
 * nombre, teléfono o correo y acepta el tratamiento de datos.
 */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),

    /**
     * Identificador público seguro.
     * Se utilizará en URLs y APIs en lugar del id numérico.
     */
    publicId: uuid("public_id")
      .notNull()
      .defaultRandom(),

    name: varchar("name", {
      length: 150,
    }),

    phone: varchar("phone", {
      length: 20,
    }),

    email: varchar("email", {
      length: 255,
    }),

    /**
     * Fuentes previstas:
     * WEB_CHAT
     * LANDING
     * WHATSAPP
     * MANUAL
     */
    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("WEB_CHAT"),

    /**
     * Estados previstos:
     * NUEVO
     * CONTACTADO
     * INTERESADO
     * CONVERTIDO
     * DESCARTADO
     */
    status: varchar("status", {
      length: 30,
    })
      .notNull()
      .default("NUEVO"),

    /**
     * Tema o producto que interesa al visitante.
     */
    interest: text("interest"),

    /**
     * Resumen para que el equipo comercial
     * comprenda rápidamente la consulta.
     */
    summary: text("summary"),

    /**
     * Nota interna agregada desde el CRM.
     */
    notes: text("notes"),

    /**
     * Indica que la conversación debe ser atendida
     * por una persona.
     */
    requiresHuman: boolean("requires_human")
      .notNull()
      .default(false),

    /**
     * Consentimiento para almacenar los datos
     * proporcionados por el visitante.
     */
    consentAccepted: boolean("consent_accepted")
      .notNull()
      .default(false),

    consentAcceptedAt: timestamp(
      "consent_accepted_at",
      {
        withTimezone: true,
      },
    ),

    /**
     * Pedido asociado cuando el lead se convierte.
     */
    convertedOrderId: integer(
      "converted_order_id",
    ).references(() => orders.id, {
      onDelete: "set null",
    }),

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
    uniqueIndex("leads_public_id_unique").on(
      table.publicId,
    ),
    index("leads_status_idx").on(table.status),
    index("leads_phone_idx").on(table.phone),
    index("leads_created_at_idx").on(
      table.createdAt,
    ),
  ],
);

/**
 * Conversación iniciada desde el asistente de la landing.
 *
 * Puede comenzar anónimamente y asociarse después
 * con un lead cuando el visitante entregue sus datos.
 */
export const crmUsers = pgTable(
  "crm_users",
  {
    id: serial("id").primaryKey(),

    supabaseUserId: uuid("supabase_user_id")
      .notNull()
      .unique(),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    }).notNull(),

    role: varchar("role", {
      length: 30,
    })
      .notNull()
      .default("ASESOR"),

    rotationOrder: integer("rotation_order"),

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
    uniqueIndex("crm_users_email_unique").on(
      table.email,
    ),
    index("crm_users_role_active_idx").on(table.role, table.active),

    index("crm_users_rotation_idx").on(
      table.rotationOrder,
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),

    publicId: uuid("public_id")
      .notNull()
      .defaultRandom(),

    leadId: integer("lead_id").references(
      () => leads.id,
      {
        onDelete: "set null",
      },
    ),
    assignedUserId: uuid("assigned_user_id").references(
      () => crmUsers.supabaseUserId,
      {
        onDelete: "set null",
      },
    ),

    /**
     * Canales previstos:
     * WEB
     * WHATSAPP
     * MANUAL
     */
    channel: varchar("channel", {
      length: 30,
    })
      .notNull()
      .default("WEB"),

    /**
     * Estados previstos:
     * ABIERTA
     * ESCALADA
     * CERRADA
     */
    status: varchar("status", {
      length: 30,
    })
      .notNull()
      .default("ABIERTA"),

    /**
     * Última intención reconocida:
     * HORARIO, PRECIOS, ENTREGA, PAGO, PRODUCTO,
     * ASESOR o DESCONOCIDA.
     */
    lastIntent: varchar("last_intent", {
      length: 80,
    }),

    requiresHuman: boolean("requires_human")
      .notNull()
      .default(false),

    contactName: varchar("contact_name", {
      length: 150,
    }),

    whatsappWaId: varchar("whatsapp_wa_id", {
      length: 32,
    }),

    whatsappPhoneNumberId: varchar(
      "whatsapp_phone_number_id",
      {
        length: 64,
      },
    ),

    whatsappMode: varchar("whatsapp_mode", {
      length: 20,
    })
      .notNull()
      .default("AUTOMATICO"),

    lastInboundAt: timestamp("last_inbound_at", {
      withTimezone: true,
    }),

    lastOutboundAt: timestamp("last_outbound_at", {
      withTimezone: true,
    }),

    customerServiceWindowExpiresAt: timestamp(
      "customer_service_window_expires_at",
      {
        withTimezone: true,
      },
    ),

    humanSince: timestamp("human_since", {
      withTimezone: true,
    }),

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
    uniqueIndex(
      "conversations_public_id_unique",
    ).on(table.publicId),
    index("conversations_lead_idx").on(
      table.leadId,
    ),
    index("conversations_status_idx").on(
      table.status,
    ),
    index("conversations_created_at_idx").on(
      table.createdAt,
    ),
    uniqueIndex("conversations_whatsapp_wa_id_unique").on(
      table.whatsappWaId,
    ),
    index("conversations_channel_mode_idx").on(
      table.channel,
      table.whatsappMode,
    ),
    index("conversations_last_inbound_idx").on(
      table.lastInboundAt,
    ),
    index("conversations_assigned_user_idx").on(
      table.assignedUserId,
    ),
  ],
);

/**
 * Historial de mensajes.
 *
 * Los roles iniciales serán:
 * USER
 * ASSISTANT
 * SYSTEM
 */
export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: serial("id").primaryKey(),

    conversationId: integer(
      "conversation_id",
    )
      .notNull()
      .references(() => conversations.id, {
        onDelete: "cascade",
      }),

    role: varchar("role", {
      length: 20,
    }).notNull(),

    content: text("content").notNull(),

    /**
     * Multimedia enviada desde WhatsApp.
     *
     * Ejemplos:
     * IMAGE
     * VIDEO
     * DOCUMENT
     * AUDIO
     */

    mediaId: varchar("media_id", {
      length: 255,
    }),

    mediaUrl: text("media_url"),

    mediaType: varchar("media_type", {
      length: 50,
    }),

    intent: varchar("intent", {
      length: 80,
    }),

    metaMessageId: varchar("meta_message_id", {
      length: 255,
    }),

    direction: varchar("direction", {
      length: 20,
    }),

    messageType: varchar("message_type", {
      length: 40,
    }),

    deliveryStatus: varchar("delivery_status", {
      length: 30,
    }),

    origin: varchar("origin", {
      length: 30,
    }),

    replyToMetaMessageId: varchar(
      "reply_to_meta_message_id",
      {
        length: 255,
      },
    ),

    errorCode: varchar("error_code", {
      length: 50,
    }),

    errorMessage: text("error_message"),

    rawPayload: jsonb("raw_payload"),

    sentAt: timestamp("sent_at", {
      withTimezone: true,
    }),

    deliveredAt: timestamp("delivered_at", {
      withTimezone: true,
    }),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    failedAt: timestamp("failed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index(
      "conversation_messages_conversation_idx",
    ).on(table.conversationId),
    index(
      "conversation_messages_created_at_idx",
    ).on(table.createdAt),
    uniqueIndex(
      "conversation_messages_meta_message_id_unique",
    ).on(table.metaMessageId),
    index(
      "conversation_messages_delivery_status_idx",
    ).on(table.deliveryStatus),
  ],
);
/**
 * Estado de rotación de asesores.
 *
 * Controla cuál fue el último asesor asignado.
 */
export const crmAssignmentState = pgTable(
  "crm_assignment_state",
  {
    id: serial("id").primaryKey(),

    lastRotationOrder: integer(
      "last_rotation_order",
    ),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
);