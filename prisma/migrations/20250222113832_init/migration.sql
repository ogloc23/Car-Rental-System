/*
  Warnings:

  - A unique constraint covering the columns `[carId,startDate,endDate]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Booking_carId_startDate_endDate_key" ON "Booking"("carId", "startDate", "endDate");
