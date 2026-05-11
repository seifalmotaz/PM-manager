DROP INDEX "audit_logs_entity_idx";--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type","entity_id");