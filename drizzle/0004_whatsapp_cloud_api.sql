ALTER TABLE "business_settings" ADD COLUMN "support_timezone" varchar(64) DEFAULT 'America/Guayaquil' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "support_days" varchar(20) DEFAULT '1,2,3,4,5,6' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "support_open_time" varchar(5) DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "support_close_time" varchar(5) DEFAULT '17:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "contact_name" varchar(150);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "whatsapp_wa_id" varchar(32);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "whatsapp_phone_number_id" varchar(64);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "whatsapp_mode" varchar(20) DEFAULT 'AUTOMATICO' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_inbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_outbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "customer_service_window_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "human_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "meta_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "direction" varchar(20);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "message_type" varchar(40);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "delivery_status" varchar(30);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "origin" varchar(30);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "reply_to_meta_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "error_code" varchar(50);--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "raw_payload" jsonb;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "business_settings" SET "support_timezone" = 'America/Guayaquil', "support_days" = '1,2,3,4,5,6', "support_open_time" = '08:00', "support_close_time" = '17:00', "updated_at" = now() WHERE "code" = 'plastimad';--> statement-breakpoint
UPDATE "conversation_messages" SET "direction" = CASE WHEN "role" = 'USER' THEN 'INBOUND' WHEN "role" = 'ASSISTANT' THEN 'OUTBOUND' ELSE 'SYSTEM' END WHERE "direction" IS NULL;--> statement-breakpoint
UPDATE "conversation_messages" SET "message_type" = COALESCE("message_type", 'text'), "delivery_status" = COALESCE("delivery_status", 'REGISTERED'), "origin" = COALESCE("origin", CASE WHEN "role" = 'USER' THEN 'WEB_CUSTOMER' WHEN "role" = 'ASSISTANT' THEN 'WEB_ASSISTANT' ELSE 'SYSTEM' END) WHERE "message_type" IS NULL OR "delivery_status" IS NULL OR "origin" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_whatsapp_wa_id_unique" ON "conversations" USING btree ("whatsapp_wa_id");--> statement-breakpoint
CREATE INDEX "conversations_channel_mode_idx" ON "conversations" USING btree ("channel","whatsapp_mode");--> statement-breakpoint
CREATE INDEX "conversations_last_inbound_idx" ON "conversations" USING btree ("last_inbound_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_messages_meta_message_id_unique" ON "conversation_messages" USING btree ("meta_message_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_delivery_status_idx" ON "conversation_messages" USING btree ("delivery_status");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_whatsapp_mode_check" CHECK ("whatsapp_mode" IN ('AUTOMATICO', 'HUMANO', 'CERRADO'));
