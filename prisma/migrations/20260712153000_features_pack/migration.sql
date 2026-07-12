-- CreateEnum
CREATE TYPE "ProfilePrivacy" AS ENUM ('public', 'private', 'friends');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('movie_watched', 'list_created');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT,
ADD COLUMN "privacy" "ProfilePrivacy" NOT NULL DEFAULT 'public';

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AlterTable
ALTER TABLE "movies" ADD COLUMN "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "user_follows" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3),
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isNumbered" BOOLEAN NOT NULL DEFAULT false,
    "isRanked" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "movie_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_movieId_key" ON "reviews"("movieId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "movie_lists_userId_idx" ON "movie_lists"("userId");

-- CreateIndex
CREATE INDEX "movie_lists_userId_isDefault_idx" ON "movie_lists"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "movie_list_items_listId_movieId_key" ON "movie_list_items"("listId", "movieId");

-- CreateIndex
CREATE INDEX "movie_list_items_listId_order_idx" ON "movie_list_items"("listId", "order");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_idx" ON "activity_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_lists" ADD CONSTRAINT "movie_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_list_items" ADD CONSTRAINT "movie_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "movie_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_list_items" ADD CONSTRAINT "movie_list_items_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default lists and link existing movies
INSERT INTO "movie_lists" ("id", "name", "description", "isDefault", "isNumbered", "isRanked", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Minha Lista', 'Lista principal de filmes', true, false, false, u."id", NOW(), NOW()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "movie_lists" ml WHERE ml."userId" = u."id" AND ml."isDefault" = true
);

INSERT INTO "movie_list_items" ("id", "listId", "movieId", "order")
SELECT gen_random_uuid(), ml."id", m."id", ROW_NUMBER() OVER (PARTITION BY ml."id" ORDER BY m."createdAt") - 1
FROM "movies" m
JOIN "movie_lists" ml ON ml."userId" = m."userId" AND ml."isDefault" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "movie_list_items" mli WHERE mli."listId" = ml."id" AND mli."movieId" = m."id"
);
