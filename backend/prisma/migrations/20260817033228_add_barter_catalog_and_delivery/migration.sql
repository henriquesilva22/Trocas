-- CreateEnum
CREATE TYPE "ProposedBy" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('ENVIO', 'PRESENCIAL');

-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'TROCADO';

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "openingHours" TEXT;

-- AlterTable
ALTER TABLE "negotiations" ADD COLUMN     "buyerDeliveryMethod" "DeliveryMethod",
ADD COLUMN     "buyerScheduledAt" TIMESTAMP(3),
ADD COLUMN     "offeredProductId" TEXT,
ADD COLUMN     "sellerDeliveryMethod" "DeliveryMethod",
ADD COLUMN     "sellerScheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "acceptedCategories" "ProductCategory"[];

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "offeredProductId" TEXT,
ADD COLUMN     "proposedBy" "ProposedBy" NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "respondsToId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "negotiations_offeredProductId_key" ON "negotiations"("offeredProductId");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_offeredProductId_fkey" FOREIGN KEY ("offeredProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_respondsToId_fkey" FOREIGN KEY ("respondsToId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_offeredProductId_fkey" FOREIGN KEY ("offeredProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

