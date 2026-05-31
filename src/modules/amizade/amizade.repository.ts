import { prisma } from "@/config/db";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";
import type { Prisma } from "@prisma/client";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";

const selectResumoAmigo = {
  id: true,
  nome: true,
  nickname: true,
  curso: true,
  semestre: true,
};

export class AmizadesRepository {
  async listarAmigos(
    usuario_id: string,
    query: ListarAmigosQueryDto,
    paginacao: ParametrosPaginacao,
  ) {
    const where: Prisma.AmizadeWhereInput = {
      statusAmizade: "ATIVO",
      excluidoEm: null,
      OR: [
        {
          usuarioOrigemId: usuario_id,
        },
        {
          usuarioDestinoId: usuario_id,
        },
      ],
    };

    if (query.nome) {
      where.AND = [
        {
          OR: [
            {
              usuarioOrigem: {
                nome: {
                  contains: query.nome,
                  mode: "insensitive",
                },
              },
            },
            {
              usuarioDestino: {
                nome: {
                  contains: query.nome,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.amizade.findMany({
        where,
        include: {
          usuarioOrigem: {
            select: selectResumoAmigo,
          },
          usuarioDestino: {
            select: selectResumoAmigo,
          },
        },
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: { criadoEm: "desc" },
      }),
      prisma.amizade.count({ where }),
    ]);
    return { data, total };
  }

  async buscarAmigos(usuario_id: string, nome_busca: string, paginacao: ParametrosPaginacao) {
    const where: Prisma.UsuarioWhereInput = {
      perfil: "ALUNO",
      status: "ATIVO",
      visivel: true,
      excluidoEm: null,
      id: { not: usuario_id },
      nome: {
        contains: nome_busca,
        mode: "insensitive",
      },
    };

    const [data, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where,
        select: selectResumoAmigo,
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: { criadoEm: "desc" },
      }),
      prisma.usuario.count({ where }),
    ]);
    return { data, total };
  }

  async buscarSolicitacao(usuario_id: string, usuario_destino_id: string) {
    return prisma.amizade.findUnique({
      where: {
        usuarioOrigemId_usuarioDestinoId: {
          usuarioOrigemId: usuario_id,
          usuarioDestinoId: usuario_destino_id,
        },
      },
    });
  }

  async buscarPorSolicitacaoId(solicitacao_id: string) {
    return prisma.amizade.findUnique({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
    });
  }

  async enviarSolicitacao(usuario_id: string, usuario_destino_id: string) {
    return prisma.amizade.create({
      data: {
        usuarioOrigemId: usuario_id,
        usuarioDestinoId: usuario_destino_id,
      },
    });
  }

  async listarConvites(
    usuario_id: string,
    paginacao: ParametrosPaginacao,
    seletor: "recebidos" | "enviados" = "recebidos",
  ) {
    const where: Prisma.AmizadeWhereInput = {
      statusAmizade: "PENDENTE",
      excluidoEm: null,
      ...(seletor === "recebidos"
        ? { usuarioDestinoId: usuario_id }
        : { usuarioOrigemId: usuario_id }),
    };

    const include =
      seletor === "recebidos"
        ? {
            usuarioOrigem: {
              select: selectResumoAmigo,
            },
          }
        : {
            usuarioDestino: {
              select: selectResumoAmigo,
            },
          };

    const [data, total] = await prisma.$transaction([
      prisma.amizade.findMany({
        where,
        include,
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: { criadoEm: "desc" },
      }),
      prisma.amizade.count({ where }),
    ]);
    console.log(`REPOSITORY: ${JSON.stringify(data)}`);
    return { data, total };
  }

  async listarConvitesEnviados(usuario_id: string, paginacao: ParametrosPaginacao) {
    const where: Prisma.AmizadeWhereInput = {
      statusAmizade: "PENDENTE",
      excluidoEm: null,
      usuarioOrigemId: usuario_id,
    };

    const [data, total] = await prisma.$transaction([
      prisma.amizade.findMany({
        where,
        include: {
          usuarioDestino: {
            select: selectResumoAmigo,
          },
        },
        skip: paginacao.skip,
        take: paginacao.limit,
        orderBy: { criadoEm: "desc" },
      }),
      prisma.amizade.count({ where }),
    ]);
    return { data, total };
  }

  async processarSolicitacao(solicitacao_id: string, acao: "aceitar" | "recusar") {
    return prisma.amizade.update({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
      data: {
        statusAmizade: acao === "aceitar" ? "ATIVO" : "RECUSADO",
      },
    });
  }

  async desfazerAmizade(solicitacao_id: string) {
    return prisma.amizade.update({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
      data: {
        excluidoEm: new Date(Date.now()),
      },
    });
  }

  async mudarVisibilidade(usuario_id: string, visibilidade: boolean) {
    return prisma.usuario.update({
      where: {
        id: usuario_id,
        excluidoEm: null,
      },
      data: {
        visivel: visibilidade,
      },
    });
  }
}
