-- AlterTable
ALTER TABLE "users" ADD COLUMN "usernameUpdatedAt" TIMESTAMP(3),
ADD COLUMN "nameEditedAt" TIMESTAMP(3);

-- Usuários que já tinham username: considerar data de criação para cooldown
UPDATE "users"
SET "usernameUpdatedAt" = "createdAt"
WHERE "username" IS NOT NULL AND "usernameUpdatedAt" IS NULL;
