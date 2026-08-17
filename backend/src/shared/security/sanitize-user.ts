type WithPasswordHash = { passwordHash: string };

/**
 * Vários includes (Negotiation, Proposal) trazem `buyer`/`seller`/`admin`
 * completos do Prisma — nunca devem sair da API com `passwordHash` junto.
 * Use sempre que uma entidade com usuários aninhados atravessar a fronteira
 * HTTP pra alguém que não seja o próprio dono do hash (admin interno tudo bem).
 */
export function omitPasswordHash<T extends WithPasswordHash>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}
