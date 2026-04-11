-- AlterTable
ALTER TABLE "features" ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
