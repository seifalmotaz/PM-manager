ALTER TABLE "users" ADD COLUMN "workos_user_id" text;
CREATE UNIQUE INDEX "users_workos_user_id_unique" ON "users" USING btree ("workos_user_id");