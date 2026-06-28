import { prisma } from "@/config/db";
import type { StatusUsuario } from "@prisma/client";
import type { ListarUsersDto } from "@/modules/admin/dto/listar.users.types";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";

// Repository do painel admin: consultas e atualizacao de usuarios via Prisma.
// Sempre omite o campo "senha" das projecoes retornadas.
export class UserRepository {
  // Lista usuarios paginados (mais recentes primeiro) + total, na mesma transacao.
  async listar(paginacao: ParametrosPaginacao) {
    const [data, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        omit: { senha: true },
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: {
          criadoEm: "desc",
        },
      }),
      prisma.usuario.count(),
    ]);

    return {
      data: data as ListarUsersDto[],
      total,
    };
  }

  // Busca um usuario por id (sem a senha).
  async buscarPorId(id: string) {
    return prisma.usuario.findUnique({
      where: { id },
      omit: { senha: true },
    });
  }

  /**
   * Atualiza o status de um usuario; quando informado o aprovador, registra
   * tambem quem aprovou e quando (usado no fluxo de aprovacao de professor).
   *
   * @param id Id do usuario.
   * @param status Novo status.
   * @param aprovadoPorId Id do admin aprovador (opcional).
   * @returns Usuario atualizado (sem a senha).
   */
  async atualizarStatus(id: string, status: StatusUsuario, aprovadoPorId?: string) {
    return prisma.usuario.update({
      where: { id },
      data: {
        status,
        // So preenche os campos de aprovacao quando ha um aprovador.
        ...(aprovadoPorId
          ? {
              aprovadoPorId,
              aprovadoEm: new Date(),
            }
          : {}),
      },
      omit: { senha: true },
    });
  }
}
