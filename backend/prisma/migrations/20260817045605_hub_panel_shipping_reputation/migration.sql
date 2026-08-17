-- CreateEnum
CREATE TYPE "ReceiveMethod" AS ENUM ('RETIRADA_HUB', 'ENVIO');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminActionType" ADD VALUE 'CONFIRM_SHIPPING';
ALTER TYPE "AdminActionType" ADD VALUE 'SET_USER_ROLE';

-- AlterTable
ALTER TABLE "negotiations" ADD COLUMN     "buyerReceiveMethod" "ReceiveMethod",
ADD COLUMN     "buyerReceivedAt" TIMESTAMP(3),
ADD COLUMN     "sellerReceiveMethod" "ReceiveMethod",
ADD COLUMN     "sellerReceivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pixKeyType" "PixKeyType";

-- CreateTable
CREATE TABLE "shipping_charges" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "payerRole" "PlatformFeePayerRole" NOT NULL,
    "payerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "trackingCode" TEXT,
    "receiptUrl" TEXT,
    "receiptSubmittedAt" TIMESTAMP(3),
    "status" "PlatformFeeStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "shipping_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_charges_negotiationId_payerRole_key" ON "shipping_charges"("negotiationId", "payerRole");

-- AddForeignKey
ALTER TABLE "shipping_charges" ADD CONSTRAINT "shipping_charges_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_charges" ADD CONSTRAINT "shipping_charges_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

