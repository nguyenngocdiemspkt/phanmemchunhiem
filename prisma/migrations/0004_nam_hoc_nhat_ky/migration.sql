-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'LEFT');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "semester2Start" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTransfer" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClassId" TEXT,
    "toClassId" TEXT,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "classId" TEXT,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_name_key" ON "SchoolYear"("name");

-- CreateIndex
CREATE INDEX "ClassTransfer_studentId_idx" ON "ClassTransfer"("studentId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_classId_createdAt_idx" ON "AuditLog"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- Điền năm học từ các lớp đã có. Tên dạng "2026-2027" -> 05/09/2026, HK II 12/01/2027, kết thúc 31/05/2027
-- (quản trị chỉnh lại sau). Tên không đúng dạng thì lấy theo năm hiện tại.
INSERT INTO "SchoolYear" ("id", "name", "startDate", "semester2Start", "endDate")
SELECT 'sy_' || md5(y.name), y.name,
       make_timestamp(y.y1, 9, 5, 0, 0, 0) - interval '7 hours',
       make_timestamp(y.y1 + 1, 1, 12, 0, 0, 0) - interval '7 hours',
       make_timestamp(y.y1 + 1, 5, 31, 0, 0, 0) - interval '7 hours'
FROM (
  SELECT DISTINCT "schoolYear" AS name,
         COALESCE(substring("schoolYear" from '^\s*(\d{4})')::int,
                  EXTRACT(YEAR FROM now())::int - CASE WHEN EXTRACT(MONTH FROM now()) < 8 THEN 1 ELSE 0 END) AS y1
  FROM "Classroom"
) y;

-- Năm học hiện tại: năm mới nhất đã bắt đầu
UPDATE "SchoolYear" SET "isCurrent" = true
WHERE "id" = (SELECT "id" FROM "SchoolYear" WHERE "startDate" <= now() ORDER BY "startDate" DESC LIMIT 1);

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_schoolYear_fkey" FOREIGN KEY ("schoolYear") REFERENCES "SchoolYear"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTransfer" ADD CONSTRAINT "ClassTransfer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTransfer" ADD CONSTRAINT "ClassTransfer_fromClassId_fkey" FOREIGN KEY ("fromClassId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTransfer" ADD CONSTRAINT "ClassTransfer_toClassId_fkey" FOREIGN KEY ("toClassId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTransfer" ADD CONSTRAINT "ClassTransfer_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

