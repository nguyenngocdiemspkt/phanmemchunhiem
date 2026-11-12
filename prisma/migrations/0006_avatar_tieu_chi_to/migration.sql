-- CreateEnum
CREATE TYPE "GroupCriterionKind" AS ENUM ('NO_VIOLATION', 'ALL_SUBMITTED', 'ALL_GOOD', 'MANUAL');

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "starPoints" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserAvatar" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "GroupCriterion" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "GroupCriterionKind" NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAward" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "criterionId" TEXT,
    "name" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "groupNo" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupCriterion_classId_idx" ON "GroupCriterion"("classId");

-- CreateIndex
CREATE INDEX "GroupAward_classId_weekStart_idx" ON "GroupAward"("classId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAward_criterionId_groupNo_weekStart_key" ON "GroupAward"("criterionId", "groupNo", "weekStart");

-- AddForeignKey
ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCriterion" ADD CONSTRAINT "GroupCriterion_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAward" ADD CONSTRAINT "GroupAward_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAward" ADD CONSTRAINT "GroupAward_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "GroupCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

