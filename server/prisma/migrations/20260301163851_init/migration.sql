/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DueStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "ReserveTransactionType" AS ENUM ('EXPENSE', 'PROJECTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReserveTransactionStatus" AS ENUM ('POSTED', 'PLANNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONDO_DOC', 'RULES_GENERAL', 'RULES_BOARD', 'MEETING_MINUTES');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PUBLIC', 'OWNERS_ONLY', 'BOARD_ONLY');

-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileRelatedType" AS ENUM ('RESERVE_TRANSACTION', 'MAINTENANCE_REQUEST', 'UNIT_DUE', 'DUES_IMPORT_BATCH', 'DOCUMENT_VERSION');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "USERS" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "USERS_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "UNITS" (
    "unit_id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "unit_type" TEXT,
    "floor" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(10,2),
    "square_feet" INTEGER,
    "parking_spots" INTEGER,
    "monthly_fee" DECIMAL(10,2) NOT NULL,
    "status" "UnitStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "UNITS_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "UNIT_OWNERS" (
    "unit_owner_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "UNIT_OWNERS_pkey" PRIMARY KEY ("unit_owner_id")
);

-- CreateTable
CREATE TABLE "DUES_IMPORT_BATCHES" (
    "import_batch_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "imported_by_user_id" TEXT NOT NULL,
    "period_month" DATE NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DUES_IMPORT_BATCHES_pkey" PRIMARY KEY ("import_batch_id")
);

-- CreateTable
CREATE TABLE "DUES_IMPORT_LINES" (
    "import_line_id" TEXT NOT NULL,
    "import_batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "unit_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DueStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DUES_IMPORT_LINES_pkey" PRIMARY KEY ("import_line_id")
);

-- CreateTable
CREATE TABLE "UNIT_DUES" (
    "due_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "period_month" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DueStatus" NOT NULL,
    "updated_by_user_id" TEXT,
    "updated_at" TIMESTAMP(3),
    "note" TEXT,
    "email_notified_at" TIMESTAMP(3),
    "import_batch_id" TEXT,
    "import_line_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UNIT_DUES_pkey" PRIMARY KEY ("due_id")
);

-- CreateTable
CREATE TABLE "EXPENSE_CATEGORIES" (
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EXPENSE_CATEGORIES_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "RESERVE_TRANSACTIONS" (
    "transaction_id" TEXT NOT NULL,
    "category_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "type" "ReserveTransactionType" NOT NULL,
    "status" "ReserveTransactionStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" DATE,
    "expected_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "RESERVE_TRANSACTIONS_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "MAINTENANCE_REQUESTS" (
    "request_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "MAINTENANCE_REQUESTS_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "ANNOUNCEMENTS" (
    "announcement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "AnnouncementStatus" NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ANNOUNCEMENTS_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "FILES" (
    "file_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256_hash" TEXT,
    "uploaded_by_user_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FILES_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "FILE_LINKS" (
    "file_link_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "related_type" "FileRelatedType" NOT NULL,
    "related_id" TEXT NOT NULL,
    "linked_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FILE_LINKS_pkey" PRIMARY KEY ("file_link_id")
);

-- CreateTable
CREATE TABLE "DOCUMENTS" (
    "document_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "DOCUMENTS_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "DOCUMENT_VERSIONS" (
    "version_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "index_status" "IndexStatus" NOT NULL DEFAULT 'PENDING',
    "indexed_at" TIMESTAMP(3),
    "index_error" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOCUMENT_VERSIONS_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "DOCUMENT_CHUNKS" (
    "chunk_id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "page_start" INTEGER,
    "page_end" INTEGER,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOCUMENT_CHUNKS_pkey" PRIMARY KEY ("chunk_id")
);

-- CreateTable
CREATE TABLE "DOCUMENT_EMBEDDINGS" (
    "embedding_id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOCUMENT_EMBEDDINGS_pkey" PRIMARY KEY ("embedding_id")
);

-- CreateTable
CREATE TABLE "MEETINGS" (
    "meeting_id" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MEETINGS_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "MEETING_MINUTES" (
    "meeting_minutes_id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MEETING_MINUTES_pkey" PRIMARY KEY ("meeting_minutes_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USERS_email_key" ON "USERS"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UNITS_unit_number_key" ON "UNITS"("unit_number");

-- CreateIndex
CREATE INDEX "UNIT_OWNERS_unit_id_idx" ON "UNIT_OWNERS"("unit_id");

-- CreateIndex
CREATE INDEX "UNIT_OWNERS_user_id_idx" ON "UNIT_OWNERS"("user_id");

-- CreateIndex
CREATE INDEX "DUES_IMPORT_BATCHES_file_id_idx" ON "DUES_IMPORT_BATCHES"("file_id");

-- CreateIndex
CREATE INDEX "DUES_IMPORT_BATCHES_imported_by_user_id_idx" ON "DUES_IMPORT_BATCHES"("imported_by_user_id");

-- CreateIndex
CREATE INDEX "DUES_IMPORT_BATCHES_period_month_idx" ON "DUES_IMPORT_BATCHES"("period_month");

-- CreateIndex
CREATE INDEX "DUES_IMPORT_LINES_import_batch_id_idx" ON "DUES_IMPORT_LINES"("import_batch_id");

-- CreateIndex
CREATE INDEX "DUES_IMPORT_LINES_unit_id_idx" ON "DUES_IMPORT_LINES"("unit_id");

-- CreateIndex
CREATE INDEX "UNIT_DUES_period_month_idx" ON "UNIT_DUES"("period_month");

-- CreateIndex
CREATE INDEX "UNIT_DUES_status_idx" ON "UNIT_DUES"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UNIT_DUES_unit_id_period_month_key" ON "UNIT_DUES"("unit_id", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "EXPENSE_CATEGORIES_name_key" ON "EXPENSE_CATEGORIES"("name");

-- CreateIndex
CREATE INDEX "RESERVE_TRANSACTIONS_category_id_idx" ON "RESERVE_TRANSACTIONS"("category_id");

-- CreateIndex
CREATE INDEX "RESERVE_TRANSACTIONS_created_by_user_id_idx" ON "RESERVE_TRANSACTIONS"("created_by_user_id");

-- CreateIndex
CREATE INDEX "RESERVE_TRANSACTIONS_type_idx" ON "RESERVE_TRANSACTIONS"("type");

-- CreateIndex
CREATE INDEX "RESERVE_TRANSACTIONS_status_idx" ON "RESERVE_TRANSACTIONS"("status");

-- CreateIndex
CREATE INDEX "MAINTENANCE_REQUESTS_unit_id_idx" ON "MAINTENANCE_REQUESTS"("unit_id");

-- CreateIndex
CREATE INDEX "MAINTENANCE_REQUESTS_submitted_by_user_id_idx" ON "MAINTENANCE_REQUESTS"("submitted_by_user_id");

-- CreateIndex
CREATE INDEX "MAINTENANCE_REQUESTS_status_idx" ON "MAINTENANCE_REQUESTS"("status");

-- CreateIndex
CREATE INDEX "MAINTENANCE_REQUESTS_priority_idx" ON "MAINTENANCE_REQUESTS"("priority");

-- CreateIndex
CREATE INDEX "ANNOUNCEMENTS_status_idx" ON "ANNOUNCEMENTS"("status");

-- CreateIndex
CREATE INDEX "ANNOUNCEMENTS_published_at_idx" ON "ANNOUNCEMENTS"("published_at");

-- CreateIndex
CREATE INDEX "FILES_uploaded_by_user_id_idx" ON "FILES"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "FILE_LINKS_file_id_idx" ON "FILE_LINKS"("file_id");

-- CreateIndex
CREATE INDEX "FILE_LINKS_related_type_related_id_idx" ON "FILE_LINKS"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "FILE_LINKS_linked_by_user_id_idx" ON "FILE_LINKS"("linked_by_user_id");

-- CreateIndex
CREATE INDEX "DOCUMENTS_doc_type_idx" ON "DOCUMENTS"("doc_type");

-- CreateIndex
CREATE INDEX "DOCUMENTS_visibility_idx" ON "DOCUMENTS"("visibility");

-- CreateIndex
CREATE INDEX "DOCUMENT_VERSIONS_document_id_idx" ON "DOCUMENT_VERSIONS"("document_id");

-- CreateIndex
CREATE INDEX "DOCUMENT_VERSIONS_file_id_idx" ON "DOCUMENT_VERSIONS"("file_id");

-- CreateIndex
CREATE INDEX "DOCUMENT_VERSIONS_index_status_idx" ON "DOCUMENT_VERSIONS"("index_status");

-- CreateIndex
CREATE UNIQUE INDEX "DOCUMENT_VERSIONS_document_id_version_number_key" ON "DOCUMENT_VERSIONS"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "DOCUMENT_CHUNKS_document_version_id_idx" ON "DOCUMENT_CHUNKS"("document_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "DOCUMENT_CHUNKS_document_version_id_chunk_index_key" ON "DOCUMENT_CHUNKS"("document_version_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "DOCUMENT_EMBEDDINGS_chunk_id_key" ON "DOCUMENT_EMBEDDINGS"("chunk_id");

-- CreateIndex
CREATE INDEX "MEETINGS_meeting_date_idx" ON "MEETINGS"("meeting_date");

-- CreateIndex
CREATE INDEX "MEETING_MINUTES_meeting_id_idx" ON "MEETING_MINUTES"("meeting_id");

-- CreateIndex
CREATE INDEX "MEETING_MINUTES_document_id_idx" ON "MEETING_MINUTES"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "MEETING_MINUTES_meeting_id_document_id_key" ON "MEETING_MINUTES"("meeting_id", "document_id");

-- AddForeignKey
ALTER TABLE "UNIT_OWNERS" ADD CONSTRAINT "UNIT_OWNERS_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "UNITS"("unit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIT_OWNERS" ADD CONSTRAINT "UNIT_OWNERS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USERS"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DUES_IMPORT_BATCHES" ADD CONSTRAINT "DUES_IMPORT_BATCHES_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "FILES"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DUES_IMPORT_BATCHES" ADD CONSTRAINT "DUES_IMPORT_BATCHES_imported_by_user_id_fkey" FOREIGN KEY ("imported_by_user_id") REFERENCES "USERS"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DUES_IMPORT_LINES" ADD CONSTRAINT "DUES_IMPORT_LINES_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "DUES_IMPORT_BATCHES"("import_batch_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DUES_IMPORT_LINES" ADD CONSTRAINT "DUES_IMPORT_LINES_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "UNITS"("unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIT_DUES" ADD CONSTRAINT "UNIT_DUES_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "UNITS"("unit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIT_DUES" ADD CONSTRAINT "UNIT_DUES_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "USERS"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIT_DUES" ADD CONSTRAINT "UNIT_DUES_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "DUES_IMPORT_BATCHES"("import_batch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIT_DUES" ADD CONSTRAINT "UNIT_DUES_import_line_id_fkey" FOREIGN KEY ("import_line_id") REFERENCES "DUES_IMPORT_LINES"("import_line_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESERVE_TRANSACTIONS" ADD CONSTRAINT "RESERVE_TRANSACTIONS_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "EXPENSE_CATEGORIES"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RESERVE_TRANSACTIONS" ADD CONSTRAINT "RESERVE_TRANSACTIONS_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "USERS"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MAINTENANCE_REQUESTS" ADD CONSTRAINT "MAINTENANCE_REQUESTS_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "UNITS"("unit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MAINTENANCE_REQUESTS" ADD CONSTRAINT "MAINTENANCE_REQUESTS_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "USERS"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ANNOUNCEMENTS" ADD CONSTRAINT "ANNOUNCEMENTS_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "USERS"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FILES" ADD CONSTRAINT "FILES_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "USERS"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FILE_LINKS" ADD CONSTRAINT "FILE_LINKS_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "FILES"("file_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FILE_LINKS" ADD CONSTRAINT "FILE_LINKS_linked_by_user_id_fkey" FOREIGN KEY ("linked_by_user_id") REFERENCES "USERS"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENT_VERSIONS" ADD CONSTRAINT "DOCUMENT_VERSIONS_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "DOCUMENTS"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENT_VERSIONS" ADD CONSTRAINT "DOCUMENT_VERSIONS_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "FILES"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENT_VERSIONS" ADD CONSTRAINT "DOCUMENT_VERSIONS_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "USERS"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENT_CHUNKS" ADD CONSTRAINT "DOCUMENT_CHUNKS_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "DOCUMENT_VERSIONS"("version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOCUMENT_EMBEDDINGS" ADD CONSTRAINT "DOCUMENT_EMBEDDINGS_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "DOCUMENT_CHUNKS"("chunk_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MEETING_MINUTES" ADD CONSTRAINT "MEETING_MINUTES_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "MEETINGS"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MEETING_MINUTES" ADD CONSTRAINT "MEETING_MINUTES_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "DOCUMENTS"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;
