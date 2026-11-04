-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "groupCount" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "groupNo" INTEGER,
ADD COLUMN     "isMonitor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmulationCategory" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmulationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmulationRecord" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "groupNo" INTEGER NOT NULL,
    "studentId" TEXT,
    "content" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmulationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmulationCategory_classId_idx" ON "EmulationCategory"("classId");

-- CreateIndex
CREATE INDEX "EmulationRecord_classId_date_idx" ON "EmulationRecord"("classId", "date");

-- AddForeignKey
ALTER TABLE "EmulationCategory" ADD CONSTRAINT "EmulationCategory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmulationRecord" ADD CONSTRAINT "EmulationRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmulationRecord" ADD CONSTRAINT "EmulationRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmulationRecord" ADD CONSTRAINT "EmulationRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
