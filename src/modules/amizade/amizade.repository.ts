import { prisma } from "@/config/db";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";
import type { Prisma } from "@prisma/client";

export class AmizadesRepository {
  async listarAmigos(usuario_id: string, paginacao: ParametrosPaginacao) {
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

    const [data, total] = await prisma.$transaction([
      prisma.amizade.findMany({
        where,
        include: {
          usuarioOrigem: {
            select: {
              id: true,
              nome: true,
              nickname: true,
              curso: true,
              semestre: true,
            },
          },
          usuarioDestino: {
            select: {
              id: true,
              nome: true,
              nickname: true,
              curso: true,
              semestre: true,
            },
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
        select: {
          id: true,
          nome: true,
          nickname: true,
          curso: true,
          semestre: true,
        },
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
    })
  }

  
  async buscarPorSolicitacaoId(solicitacao_id: string) {
    return prisma.amizade.findUnique({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
    })
  }

  async enviarSolicitacao(usuario_id: string, usuario_destino_id: string) {
    return prisma.amizade.create({
      data: {
        usuarioOrigemId: usuario_id,
        usuarioDestinoId: usuario_destino_id,
      }
    })
  }

  
  async listarConvitesRecebidos(usuario_id: string, paginacao: ParametrosPaginacao) {
    const where: Prisma.AmizadeWhereInput = {
      statusAmizade: "PENDENTE",
      excluidoEm: null,
      usuarioDestinoId: usuario_id,
    };

    const [data, total] = await prisma.$transaction([
      prisma.amizade.findMany({
        where,
        include: {
          usuarioOrigem: {
            select: {
              id: true,
              nome: true,
              nickname: true,
              curso: true,
              semestre: true,
            },
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
            select: {
              id: true,
              nome: true,
              nickname: true,
              curso: true,
              semestre: true,
            },
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

  
  async aceitarSolicitacao(solicitacao_id: string) {
    return prisma.amizade.update({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
      data: {
        statusAmizade: "ATIVO",
      }
    });
  }

  async recusarSolicitacao(solicitacao_id: string) {
    return prisma.amizade.update({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
      data: {
        statusAmizade: "RECUSADO",
      }
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
      }
    });
  }

  async mudarVisibilidade(usuario_id: string, visibilidade: boolean) {

    return prisma.usuario.update({
      where: {
        id: usuario_id,
        excluidoEm: null,
      },
      data: {
        visivel:visibilidade,
      }
    })
  }
}
