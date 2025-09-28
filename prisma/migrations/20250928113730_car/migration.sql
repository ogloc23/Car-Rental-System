/*
  Warnings:

  - You are about to drop the column `availability` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `make` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Car` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Car` table. All the data in the column will be lost.
  - Added the required column `groupId` to the `Car` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Car_make_model_idx";

-- AlterTable
ALTER TABLE "Car" DROP COLUMN "availability",
DROP COLUMN "make",
DROP COLUMN "model",
DROP COLUMN "price",
DROP COLUMN "type",
DROP COLUMN "year",
ADD COLUMN     "groupId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CarGroup" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarGroup_make_model_year_type_idx" ON "CarGroup"("make", "model", "year", "type");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CarGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
