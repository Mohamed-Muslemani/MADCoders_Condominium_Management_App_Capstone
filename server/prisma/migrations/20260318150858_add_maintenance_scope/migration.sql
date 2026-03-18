/*
  Warnings:

  - You are about to drop the column `due_date` on the `UNIT_DUES` table. All the data in the column will be lost.
  - You are about to drop the column `paid_date` on the `UNIT_DUES` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MaintenanceScope" AS ENUM ('UNIT', 'BUILDING');

-- AlterTable
ALTER TABLE "MAINTENANCE_REQUESTS" ADD COLUMN     "scope" "MaintenanceScope" NOT NULL DEFAULT 'UNIT',
ALTER COLUMN "unit_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UNIT_DUES" DROP COLUMN "due_date",
DROP COLUMN "paid_date";

-- CreateIndex
CREATE INDEX "MAINTENANCE_REQUESTS_scope_idx" ON "MAINTENANCE_REQUESTS"("scope");
