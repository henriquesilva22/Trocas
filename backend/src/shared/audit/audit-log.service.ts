import { Injectable } from '@nestjs/common';
import { AdminActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Ponto único de escrita da trilha de auditoria administrativa.
 * Qualquer módulo que exponha uma ação privilegiada (banir usuário,
 * resolver disputa, gerenciar Hub) grava aqui — em vez de o AdminModule
 * ter que importar cada módulo de domínio para logar por eles, cada
 * módulo importa este serviço compartilhado.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(params: {
    adminId: string;
    action: AdminActionType;
    targetId: string;
    reason?: string;
  }) {
    return this.prisma.adminAuditLog.create({ data: params });
  }
}
