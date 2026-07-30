-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'TECHNICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('CELULAR', 'NOTEBOOK', 'MOUSE', 'TECLADO', 'FONE', 'PECA_PC', 'MONITOR', 'ACESSORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NOVO', 'SEMINOVO', 'USADO_BOM_ESTADO', 'USADO_COM_MARCAS', 'PARA_PECAS');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DISPONIVEL', 'EM_NEGOCIACAO', 'RESERVADO', 'VENDIDO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDENTE', 'ACEITA', 'REJEITADA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('AGUARDANDO_PAGAMENTO_TAXA', 'AGUARDANDO_DROPOFF', 'EM_CUSTODIA_FISICA', 'EM_INSPECAO', 'INSPECIONADO_REPROVADO', 'INSPECIONADO_E_APROVADO', 'PAGAMENTO_PENDENTE', 'COMPROVANTE_ENVIADO', 'PAGAMENTO_CONFIRMADO', 'PIN_GERADO', 'FINALIZADO', 'CANCELADO', 'EM_ANALISE');

-- CreateEnum
CREATE TYPE "PlatformFeePayerRole" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "PlatformFeeStatus" AS ENUM ('PENDENTE', 'COMPROVANTE_ENVIADO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDENTE', 'COMPROVANTE_ENVIADO', 'CONFIRMADO', 'CONTESTADO');

-- CreateEnum
CREATE TYPE "MessageContext" AS ENUM ('PROPOSAL', 'NEGOTIATION');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('RESOLVE_DISPUTE_APPROVE', 'RESOLVE_DISPUTE_CANCEL', 'BAN_USER', 'UNBAN_USER', 'CREATE_HUB', 'UPDATE_HUB', 'DEACTIVATE_HUB', 'CONFIRM_PLATFORM_FEE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "pixKey" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "priceAsking" DECIMAL(10,2) NOT NULL,
    "photoUrls" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiations" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "hubId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO_TAXA',
    "droppedOffAt" TIMESTAMP(3),
    "pickupPin" TEXT,
    "pickupPinExpiresAt" TIMESTAMP(3),
    "pickupConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "photoUrls" TEXT[],
    "videoUrl" TEXT,
    "reportUrl" TEXT,
    "approved" BOOLEAN,
    "shelfLocation" TEXT,
    "sealCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sellerPixKey" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "receiptSubmittedAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fee_charges" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "payerRole" "PlatformFeePayerRole" NOT NULL,
    "payerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "receiptUrl" TEXT,
    "receiptSubmittedAt" TIMESTAMP(3),
    "status" "PlatformFeeStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "platform_fee_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "context" "MessageContext" NOT NULL,
    "negotiationId" TEXT,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE INDEX "products_status_category_idx" ON "products"("status", "category");

-- CreateIndex
CREATE INDEX "proposals_productId_status_idx" ON "proposals"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "negotiations_proposalId_key" ON "negotiations"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "negotiations_productId_key" ON "negotiations"("productId");

-- CreateIndex
CREATE INDEX "negotiations_status_idx" ON "negotiations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_negotiationId_key" ON "inspections"("negotiationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_negotiationId_key" ON "payments"("negotiationId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_fee_charges_negotiationId_payerRole_key" ON "platform_fee_charges"("negotiationId", "payerRole");

-- CreateIndex
CREATE INDEX "messages_negotiationId_idx" ON "messages"("negotiationId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_negotiationId_reviewerId_key" ON "reviews"("negotiationId", "reviewerId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetId_idx" ON "admin_audit_logs"("targetId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_charges" ADD CONSTRAINT "platform_fee_charges_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_charges" ADD CONSTRAINT "platform_fee_charges_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
