import { prisma } from "@/config/db";
import type { ParametrosPaginacao } from "@/shared/utils/paginacao.util";
import type { Prisma } from "@prisma/client";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";
import type { BuscarAmigosQueryDto } from "./dto/request/buscar_amigos_query_dto";

// Repository de amizades: acesso ao banco via Prisma para o grafo social.
// Padroniza paginacao (skip/take), filtros de busca e a projecao dos dados do amigo.

// Campos do usuario expostos como "resumo do amigo" nas listagens (sem dados sensiveis).
const selectResumoAmigo = {
  id: true,
  nome: true,
  nickname: true,
  curso: true,
  semestre: true,
  visivel: true,
};

export class AmizadesRepository {
  /**
   * Lista as amizades ATIVAS do usuario (em qualquer dos dois lados), paginadas.
   *
   * Aceita filtro opcional por nome/nickname do amigo, aplicado sobre origem ou
   * destino. Retorna a pagina e o total para montar os metadados de paginacao.
   *
   * @param usuario_id Usuario dono da lista.
   * @param query Filtros opcionais (nome/nickname).
   * @param paginacao Skip/take ja resolvidos.
   * @returns Objeto com a pagina de amizades e o total de registros.
   */
  async listarAmigos(
    usuario_id: string,
    query: ListarAmigosQueryDto,
    paginacao: ParametrosPaginacao,
  ) {
    // Amizades ativas e nao excluidas em que o usuario participa (origem OU destino).
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

    // Filtro textual opcional: casa o termo contra o nome/nickname do outro lado.
    if (query.nome || query.nickname) {
      const filtroUsuario: Prisma.UsuarioWhereInput = {
        ...(query.nome && {
          nome: {
            contains: query.nome,
            mode: "insensitive",
          },
        }),
        ...(query.nickname && {
          nickname: {
            contains: query.nickname,
            mode: "insensitive",
          },
        }),
      };
      where.AND = [
        {
          OR: [{ usuarioOrigem: filtroUsuario }, { usuarioDestino: filtroUsuario }],
        },
      ];
    }

    // Busca a pagina e o total na mesma transacao para manter consistencia.
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

  /**
   * Busca alunos elegiveis para virar amigos (descoberta de pessoas).
   *
   * Retorna apenas alunos ATIVOS, visiveis, nao excluidos e diferentes do proprio
   * usuario, com filtro opcional por nome/nickname.
   *
   * @param usuario_id Usuario que faz a busca (excluido do resultado).
   * @param query Filtros opcionais (nome/nickname).
   * @param paginacao Skip/take ja resolvidos.
   * @returns Objeto com a pagina de candidatos e o total de registros.
   */
  async buscarAmigos(
    usuario_id: string,
    query: BuscarAmigosQueryDto,
    paginacao: ParametrosPaginacao,
  ) {
    // So alunos ativos e visiveis, exceto o proprio usuario.
    const where: Prisma.UsuarioWhereInput = {
      perfil: "ALUNO",
      status: "ATIVO",
      visivel: true,
      excluidoEm: null,
      id: { not: usuario_id },
    };

    if (query.nome) {
      where.nome = { contains: query.nome, mode: "insensitive" };
    }

    if (query.nickname) {
      where.nickname = { contains: query.nickname, mode: "insensitive" };
    }

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

  /**
   * Procura uma relacao existente entre dois usuarios, em qualquer direcao.
   *
   * @param usuario_id Um dos lados da relacao.
   * @param usuario_destino_id O outro lado da relacao.
   * @returns A amizade encontrada, ou null.
   */
  async buscarSolicitacao(usuario_id: string, usuario_destino_id: string) {
    return prisma.amizade.findFirst({
      where: {
        OR: [
          {
            usuarioOrigemId: usuario_id,
            usuarioDestinoId: usuario_destino_id,
          },
          {
            usuarioOrigemId: usuario_destino_id,
            usuarioDestinoId: usuario_id,
          },
        ],
      },
    });
  }

  /**
   * Busca uma amizade/solicitacao pelo id, ignorando registros excluidos.
   *
   * @param solicitacao_id Id do registro de amizade/solicitacao.
   * @returns O registro encontrado, ou null.
   */
  async buscarPorSolicitacaoId(solicitacao_id: string) {
    return prisma.amizade.findUnique({
      where: {
        id: solicitacao_id,
        excluidoEm: null,
      },
    });
  }

  /**
   * Cria uma nova solicitacao de amizade (status inicial PENDENTE, via schema).
   *
   * @param usuario_id Origem da solicitacao.
   * @param usuario_destino_id Destino da solicitacao.
   * @returns A amizade criada.
   */
  async enviarSolicitacao(usuario_id: string, usuario_destino_id: string) {
    return prisma.amizade.create({
      data: {
        usuarioOrigemId: usuario_id,
        usuarioDestinoId: usuario_destino_id,
      },
    });
  }

  /**
   * Reaproveita uma solicitacao antes excluida, voltando-a para PENDENTE.
   *
   * Atualiza origem/destino (a nova solicitacao pode inverter os papeis) e limpa
   * o excluidoEm, evitando criar um registro duplicado.
   *
   * @param solicitacao_id Id do registro a reabrir.
   * @param usuario_id Nova origem da solicitacao.
   * @param usuario_destino_id Novo destino da solicitacao.
   * @returns A amizade reaberta.
   */
  async reabrirSolicitacao(
    solicitacao_id: string,
    usuario_id: string,
    usuario_destino_id: string,
  ) {
    return prisma.amizade.update({
      where: {
        id: solicitacao_id,
      },
      data: {
        usuarioOrigemId: usuario_id,
        usuarioDestinoId: usuario_destino_id,
        statusAmizade: "PENDENTE",
        excluidoEm: null,
      },
    });
  }

  /**
   * Lista convites PENDENTES, recebidos ou enviados, de forma paginada.
   *
   * O seletor define o lado consultado (destino = recebidos, origem = enviados) e
   * tambem qual usuario relacionado e incluido na projecao.
   *
   * @param usuario_id Usuario dono dos convites.
   * @param paginacao Skip/take ja resolvidos.
   * @param seletor "recebidos" (padrao) ou "enviados".
   * @returns Objeto com a pagina de convites e o total de registros.
   */
  async listarConvites(
    usuario_id: string,
    paginacao: ParametrosPaginacao,
    seletor: "recebidos" | "enviados" = "recebidos",
  ) {
    // Convites pendentes do lado escolhido (recebidos = destino; enviados = origem).
    const where: Prisma.AmizadeWhereInput = {
      statusAmizade: "PENDENTE",
      excluidoEm: null,
      ...(seletor === "recebidos"
        ? { usuarioDestinoId: usuario_id }
        : { usuarioOrigemId: usuario_id }),
    };

    // Inclui o usuario do outro lado conforme o seletor.
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
    return { data, total };
  }

  /**
   * Variante especializada de listarConvites apenas para convites enviados.
   *
   * @param usuario_id Usuario que enviou os convites.
   * @param paginacao Skip/take ja resolvidos.
   * @returns Pagina de convites enviados e o total.
   */
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

  /**
   * Aplica a decisao do convite: aceitar vira ATIVO; recusar vira RECUSADO.
   *
   * @param solicitacao_id Id da solicitacao.
   * @param acao "aceitar" ou "recusar".
   * @returns A amizade com o status atualizado.
   */
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

  /**
   * Desfaz a amizade via soft delete (marca excluidoEm em vez de apagar a linha).
   *
   * O soft delete permite, mais tarde, reabrir a relacao em vez de criar outra.
   *
   * @param solicitacao_id Id da amizade a desfazer.
   * @returns A amizade marcada como excluida.
   */
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

  /**
   * Alterna a visibilidade do perfil do usuario (aparecer ou nao nas buscas).
   *
   * @param usuario_id Usuario alvo.
   * @param visibilidade Novo valor de visibilidade.
   * @returns O usuario com a visibilidade atualizada.
   */
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
