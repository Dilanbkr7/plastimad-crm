CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"business_name" text NOT NULL,
	"legal_name" text,
	"phone" varchar(20) NOT NULL,
	"whatsapp_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"logo_url" text,
	"primary_color" varchar(9) DEFAULT '#12B83E' NOT NULL,
	"secondary_color" varchar(9) DEFAULT '#A66A21' NOT NULL,
	"dark_color" varchar(9) DEFAULT '#075E35' NOT NULL,
	"free_delivery_enabled" boolean DEFAULT true NOT NULL,
	"free_delivery_city" varchar(100) DEFAULT 'Quito' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(150) NOT NULL,
	"province" varchar(100),
	"city" varchar(100),
	"sector" varchar(150),
	"delivery_type" varchar(30) DEFAULT 'LOCAL' NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"free_delivery" boolean DEFAULT false NOT NULL,
	"requires_quote" boolean DEFAULT false NOT NULL,
	"cash_on_delivery_available" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"quantity" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"color_hex" varchar(9),
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"description" text,
	"base_price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "product_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variant_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "offer_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "zone_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "province" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sector" varchar(150);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_type" varchar(30) DEFAULT 'LOCAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" varchar(30) DEFAULT 'CONTRAENTREGA' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" varchar(30) DEFAULT 'PENDIENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" varchar(50) DEFAULT 'DIRECTO' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_source" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_medium" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_campaign" varchar(180);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_content" varchar(180);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_settings_code_unique" ON "business_settings" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_zones_code_unique" ON "delivery_zones" USING btree ("code");--> statement-breakpoint
CREATE INDEX "delivery_zones_active_idx" ON "delivery_zones" USING btree ("active");--> statement-breakpoint
CREATE INDEX "delivery_zones_city_idx" ON "delivery_zones" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_product_quantity_unique" ON "offers" USING btree ("product_id","quantity");--> statement-breakpoint
CREATE INDEX "offers_product_idx" ON "offers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "offers_active_idx" ON "offers" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_name_unique" ON "product_variants" USING btree ("product_id","name");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("active");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_delivery_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_product_idx" ON "orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_zone_idx" ON "orders" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");