/*
  Warnings:

  - You are about to drop the column `status` on the `Car` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Car" DROP COLUMN "status",
ADD COLUMN     "carStatus" "CarStatus" NOT NULL DEFAULT 'AVAILABLE';
