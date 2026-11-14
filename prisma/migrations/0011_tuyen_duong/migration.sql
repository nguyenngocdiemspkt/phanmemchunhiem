-- CreateTable
CREATE TABLE "CommendationVote" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "voterId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommendationVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommendationVote_classId_weekStart_idx" ON "CommendationVote"("classId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CommendationVote_voterId_weekStart_key" ON "CommendationVote"("voterId", "weekStart");

-- AddForeignKey
ALTER TABLE "CommendationVote" ADD CONSTRAINT "CommendationVote_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommendationVote" ADD CONSTRAINT "CommendationVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommendationVote" ADD CONSTRAINT "CommendationVote_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

