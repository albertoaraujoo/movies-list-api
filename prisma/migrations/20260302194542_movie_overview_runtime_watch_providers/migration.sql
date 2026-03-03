-- AlterTable
ALTER TABLE "movies" ADD COLUMN "overview" TEXT,
ADD COLUMN "runtime" INTEGER,
ADD COLUMN "watchProvidersBr" JSONB;
