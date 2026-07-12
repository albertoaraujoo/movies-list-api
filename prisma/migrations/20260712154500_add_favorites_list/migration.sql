-- AlterTable
ALTER TABLE "movie_lists" ADD COLUMN "isFavorites" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "movie_lists_userId_isFavorites_idx" ON "movie_lists"("userId", "isFavorites");

-- Backfill: lista Favoritos para usuários existentes
INSERT INTO "movie_lists" ("id", "name", "description", "isDefault", "isFavorites", "isNumbered", "isRanked", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Favoritos', 'Filmes favoritos', false, true, false, false, u."id", NOW(), NOW()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "movie_lists" ml WHERE ml."userId" = u."id" AND ml."isFavorites" = true
);
