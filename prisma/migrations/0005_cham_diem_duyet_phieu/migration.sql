-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('SUBMITTED', 'REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "baseScore" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "groupNames" JSONB,
ADD COLUMN     "ratingFair" INTEGER NOT NULL DEFAULT 95,
ADD COLUMN     "ratingGood" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "ratingPass" INTEGER NOT NULL DEFAULT 85;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "points" INTEGER,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "selfCounts" JSONB,
ADD COLUMN     "status" "ResponseStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "teacherCounts" JSONB;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "isGroupLeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "baseScore" INTEGER,
ADD COLUMN     "criteria" JSONB;

-- CreateTable
CREATE TABLE "ScoreReport" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterName" TEXT NOT NULL,
    "criterionId" TEXT,
    "criterionName" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "times" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreReport_surveyId_studentId_idx" ON "ScoreReport"("surveyId", "studentId");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_schoolYear_key" ON "Enrollment"("studentId", "schoolYear");

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Xếp lớp theo năm học: mỗi học sinh hiện có một dòng cho lớp và năm học hiện tại
INSERT INTO "Enrollment" ("id", "studentId", "classId", "schoolYear")
SELECT 'en_' || md5(s."id" || c."schoolYear"), s."id", s."classId", c."schoolYear"
FROM "Student" s JOIN "Classroom" c ON c."id" = s."classId";

-- Phiếu cũ đã được GV gửi nhận xét coi như đã duyệt (khóa + công bố)
UPDATE "Response" SET "status" = 'APPROVED', "reviewedAt" = f."publishedAt"
FROM "Feedback" f
WHERE f."responseId" = "Response"."id" AND f."published" = true;

-- Mẫu phiếu dùng chung: 3 câu tự nhận xét tuần (kèm phần chấm điểm theo tiêu chí của lớp khi tạo đợt)
INSERT INTO "FormTemplate" ("id", "name", "description", "questions", "isShared", "createdAt", "updatedAt")
SELECT 'tpl_tu_nhan_xet_tuan', 'Tự nhận xét tuần (3 câu)',
       'Dùng kèm phần chấm điểm theo tiêu chí thi đua của lớp',
       '[{"id":"lam-tot","type":"text","required":true,"text":"Tuần qua em đã làm tốt những việc gì?"},
         {"id":"han-che","type":"text","required":true,"text":"Em còn hạn chế hoặc chưa thực hiện tốt điều gì?"},
         {"id":"tuan-toi","type":"text","required":true,"text":"Tuần tới em sẽ làm gì để khắc phục và tiến bộ?"},
         {"id":"viec-tot","type":"text","required":false,"text":"Thành tích, việc tốt trong tuần hoặc điều em mong thầy/cô hỗ trợ"}]'::jsonb,
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "FormTemplate" WHERE "id" = 'tpl_tu_nhan_xet_tuan');
