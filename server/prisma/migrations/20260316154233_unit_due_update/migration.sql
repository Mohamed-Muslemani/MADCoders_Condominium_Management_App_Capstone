/*
  Warnings:

  - Added the required column `due_date` to the `UNIT_DUES` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UNIT_DUES" ADD COLUMN     "due_date" DATE NOT NULL,
ADD COLUMN     "paid_date" DATE;
