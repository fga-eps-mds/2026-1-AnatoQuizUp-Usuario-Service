import type { Prisma } from "@prisma/client";

import { prisma } from "@/config/db";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";

// Repository de consultas de usuarios (alunos), usado por buscas, ranking e amizade.

// Campos do usuario expostos como "resumo" (sem dados sensiveis como senha).
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
  /**
   * Busca alunos ATIVOS de forma paginada, com filtro textual opcional.
   *
   * O termo de busca casa contra nome, email ou nickname (case-insensitive).
   *
   * @param busca Termo opcional de pesquisa.
   * @param paginacao Skip/take ja resolvidos.
   * @returns Pagina de alunos e total de registros.
   */
  async buscarAlunos(busca: string | undefined, paginacao: ParametrosPaginacao) {
    const where: Prisma.UsuarioWhereInput = {
      perfil: "ALUNO",
      status: "ATIVO",
      excluidoEm: null,
      // Sem termo, nao aplica filtro textual (OR fica indefinido).
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

  /**
   * Lista alunos ATIVOS para o ranking geral.
   *
   * Por padrao retorna so os visiveis; com incluirPrivados (gestao) traz todos.
   *
   * @param incluirPrivados Se true, ignora o filtro de visibilidade.
   * @returns Lista de alunos com dados basicos, ordenada por nome.
   */
  async buscarAlunosVisiveis(incluirPrivados = false) {
    return prisma.usuario.findMany({
      where: {
        perfil: "ALUNO",
        status: "ATIVO",
        // Professor/Admin (incluirPrivados) enxergam tambem os perfis privados.
        ...(incluirPrivados ? {} : { visivel: true }),
        excluidoEm: null,
      },
      select: {
        id: true,
        nome: true,
        nickname: true,
        curso: true,
        semestre: true,
      },
      orderBy: { nome: "asc" },
    });
  }

  /**
   * Busca em lote varios alunos por id (usado pelo ranking para resolver nomes).
   *
   * @param ids Lista de ids de alunos.
   * @returns Resumo dos alunos encontrados, ordenado por nome.
   */
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

  /**
   * Busca um aluno especifico pelo id, incluindo a flag de visibilidade.
   *
   * @param id Id do aluno.
   * @returns O aluno (com visivel), ou null se nao encontrado.
   */
  async buscarAlunoPorId(id: string) {
    return prisma.usuario.findUnique({
      where: {
        id: id,
        perfil: "ALUNO",
        excluidoEm: null,
      },
      select: {
        ...selecionarResumoUsuario,
        visivel: true
      },
    });
  }

  /**
   * Projecao publica minima (id/nome/perfil) de qualquer usuario, por id.
   *
   * @param id Id do usuario.
   * @returns Dados publicos do usuario, ou null se nao encontrado.
   */
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
