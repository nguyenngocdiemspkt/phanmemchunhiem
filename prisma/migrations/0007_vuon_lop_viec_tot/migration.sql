-- CreateEnum
CREATE TYPE "GardenCycle" AS ENUM ('SEMESTER', 'YEAR');

-- CreateEnum
CREATE TYPE "GoodDeedKind" AS ENUM ('ONCE', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "GoodDeedStatus" AS ENUM ('ONGOING', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "gardenCycle" "GardenCycle" NOT NULL DEFAULT 'SEMESTER',
ADD COLUMN     "gardenDry" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN     "gardenFruitStep" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "gardenLeafStep" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "gardenMature" INTEGER NOT NULL DEFAULT 140,
ADD COLUMN     "gardenSprout" INTEGER NOT NULL DEFAULT 105,
ADD COLUMN     "gardenStart" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "gardenTwoLeaves" INTEGER NOT NULL DEFAULT 110,
ADD COLUMN     "gardenWilt" INTEGER NOT NULL DEFAULT 80;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "character" JSONB,
ADD COLUMN     "posAt" TIMESTAMP(3),
ADD COLUMN     "posX" INTEGER,
ADD COLUMN     "posY" INTEGER,
ADD COLUMN     "seedCycle" TEXT,
ADD COLUMN     "seedType" TEXT;

-- CreateTable
CREATE TABLE "GardenHarvest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "cycle" TEXT NOT NULL,
    "cycleLabel" TEXT NOT NULL,
    "seedType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "leaves" INTEGER NOT NULL,
    "fruits" INTEGER NOT NULL,
    "wilt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GardenHarvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodDeed" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "GoodDeedKind" NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "GoodDeedStatus" NOT NULL,
    "completedAt" TIMESTAMP(3),
    "authorPoints" INTEGER,
    "beneficiaryPoints" INTEGER,
    "teacherNote" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodDeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "GardenHarvest_studentId_cycle_key" ON "GardenHarvest"("studentId", "cycle");

-- CreateIndex
CREATE INDEX "GoodDeed_classId_status_idx" ON "GoodDeed"("classId", "status");

-- CreateIndex
CREATE INDEX "GoodDeed_authorId_idx" ON "GoodDeed"("authorId");

-- CreateIndex
CREATE INDEX "GoodDeed_beneficiaryId_idx" ON "GoodDeed"("beneficiaryId");

-- AddForeignKey
ALTER TABLE "GardenHarvest" ADD CONSTRAINT "GardenHarvest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenHarvest" ADD CONSTRAINT "GardenHarvest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodDeed" ADD CONSTRAINT "GoodDeed_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodDeed" ADD CONSTRAINT "GoodDeed_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodDeed" ADD CONSTRAINT "GoodDeed_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

