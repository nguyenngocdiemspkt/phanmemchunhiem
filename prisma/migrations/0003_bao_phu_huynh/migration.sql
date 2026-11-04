-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "parentNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "parentToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_parentToken_key" ON "Student"("parentToken");
