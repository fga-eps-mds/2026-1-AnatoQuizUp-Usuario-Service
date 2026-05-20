import type { Prisma } from "@prisma/client";

import { prisma } from "@/config/db";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";

const selecionarResumoUsuario = {
  id: true,
  nome: true,
  nickname: true,
  email: true,
  perfil: true,
  status: true,
  instituicao: true,
  curso: true,
  semestre: true,
} satisfies Prisma.UsuarioSelect;

export class UsuariosRepository {
  async buscarAlunos(busca: string | undefined, paginacao: ParametrosPaginacao) {
    const where: Prisma.UsuarioWhereInput = {
      perfil: "ALUNO",
      status: "ATIVO",
      excluidoEm: null,
      OR: busca
        ? [
            { nome: { contains: busca, mode: "insensitive" } },
            { email: { contains: busca, mode: "insensitive" } },
            { nickname: { contains: busca, mode: "insensitive" } },
          ]
        : undefined,
    };

    const [data, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where,
        select: selecionarResumoUsuario,
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: { nome: "asc" },
      }),
      prisma.usuario.count({ where }),
    ]);

    return { data, total };
  }

  async buscarAlunosPorIds(ids: string[]) {
    return prisma.usuario.findMany({
      where: {
        id: { in: ids },
        perfil: "ALUNO",
        excluidoEm: null,
      },
      select: selecionarResumoUsuario,
      orderBy: { nome: "asc" },
    });
  }

  async buscarPorIdPublico(id: string) {
    return prisma.usuario.findFirst({
      where: {
        id,
        excluidoEm: null,
      },
      select: {
        id: true,
        nome: true,
        perfil: true,
      },
    });
  }
}
