import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';
}

/** Lê `req.user`, populado pelo JwtAuthGuard do UsersModule. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
