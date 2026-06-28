import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  resolverParametrosPaginacao,
  montarMetadadosPaginacao,
} from "@/shared/utils/paginacao.util";
import type { AmizadesRepository } from "./amizade.repository";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";
import type { ResumoAmigoDto, ResumoAmizadeDto } from "./dto/response/resumo_amigo_dto";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { BuscarAmigosQueryDto } from "./dto/request/buscar_amigos_query_dto";
import type { SolicitacaoDto } from "./dto/request/solicitacao_dto";
import type { Amizade } from "@prisma/client";
import type { UsuariosRepository } from "../usuarios/usuarios.repository";

// Linha de amizade ja com os usuarios relacionados (origem/destino) carregados.
type AmizadeRow = Awaited<ReturnType<AmizadesRepository["listarAmigos"]>>["data"][number];

// Linha de convite (mesma estrutura), usada nas listagens de convites.
type ConviteRow = Awaited<ReturnType<AmizadesRepository["listarConvites"]>>["data"][number];

/**
 * Service de amizades.
 *
 * Concentra as regras do grafo social: listar amigos/convites, enviar e processar
 * solicitacoes, desfazer amizade e alternar visibilidade do perfil. Valida a
 * autenticacao e as regras de negocio antes de delegar a persistencia ao repository.
 */
export class AmizadesService {
  constructor(
    private readonly amizadesRepository: AmizadesRepository,
    private readonly usuariosRepository: UsuariosRepository,
  ) { }

  /**
   * Lista, de forma paginada, os amigos confirmados do usuario.
   *
   * Para cada amizade, identifica qual dos dois lados e o "amigo" (o que nao e o
   * proprio usuario) e monta o resumo correspondente.
   *
   * @param query Filtros e parametros de paginacao.
   * @param usuario_id Id do usuario autenticado.
   * @returns Pagina de amizades resumidas com metadados de paginacao.
   * @throws ErroAplicacao 401 quando nao ha usuario autenticado.
   */
  async listarAmigos(
    query: ListarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmizadeDto>> {
    // Guard de autenticacao: sem usuario valido nao ha lista a retornar.
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.listarAmigos(
      usuario_id,
      query,
      paginacao,
    );

    // O "amigo" e sempre o lado oposto ao usuario logado na relacao.
    const amigos = data.map((amizade) => {
      const amigo =
        amizade.usuarioOrigemId === usuario_id ? amizade.usuarioDestino : amizade.usuarioOrigem;

      return this.montarResumoAmizade(amizade, amigo);
    });

    return {
      dados: amigos,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  /**
   * Busca alunos para adicionar como amigos (descoberta de pessoas).
   *
   * Diferente de listarAmigos, aqui o repository ja devolve o DTO pronto, entao so
   * paginamos e repassamos.
   *
   * @param query Termo de busca e parametros de paginacao.
   * @param usuario_id Id do usuario autenticado.
   * @returns Pagina de candidatos a amizade com metadados de paginacao.
   * @throws ErroAplicacao 401 quando nao ha usuario autenticado.
   */
  async buscarAmigos(
    query: BuscarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmigoDto>> {
    // Guard de autenticacao: so usuario logado pode buscar amigos.
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    // Resolve a paginacao e consulta os candidatos no repository.
    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.buscarAmigos(
      usuario_id,
      query,
      paginacao,
    );

    // O repository ja devolve o DTO pronto; apenas anexa os metadados de paginacao.
    return {
      dados: data,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  /**
   * Envia uma solicitacao de amizade para outro usuario.
   *
   * Aplica varias regras antes de persistir: nao permite solicitar a si mesmo, nem
   * duplicar solicitacao/amizade existente, e exige que o destino exista, esteja
   * ATIVO e visivel. Se houver uma solicitacao anterior excluida, ela e reaberta
   * em vez de criar uma nova.
   *
   * @param data DTO contendo o id do usuario de destino.
   * @param usuario_id Id do usuario autenticado (origem da solicitacao).
   * @returns A amizade criada ou reaberta.
   * @throws ErroAplicacao 400/401/404 conforme a regra violada.
   */
  async enviarSolicitacao(data: SolicitacaoDto, usuario_id: string | undefined): Promise<Amizade> {
    // Guard de autenticacao: a origem da solicitacao precisa estar logada.
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    // Exige o id do destinatario na requisicao.
    const id_destino = data.id;
    if (id_destino === "" || id_destino === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmNomeDeUsuario,
      });
    }

    // Nao faz sentido pedir amizade para si mesmo.
    if (id_destino === usuario_id) {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_PARA_SI_MESMO,
        mensagem: MENSAGENS.solicitacaoParaSiMesmo,
      });
    }

    // Verifica se ja existe alguma relacao previa entre os dois usuarios.
    const solicitacao_ja_existe = await this.amizadesRepository.buscarSolicitacao(
      usuario_id,
      id_destino,
    );

    // Existe relacao ativa (nao excluida): decide o erro conforme o status atual.
    if (solicitacao_ja_existe && !solicitacao_ja_existe.excluidoEm) {
      if (
        solicitacao_ja_existe.statusAmizade === "PENDENTE" ||
        solicitacao_ja_existe.statusAmizade === "RECUSADO"
      ) {
        throw new ErroAplicacao({
          codigoStatus: 400,
          codigo: CodigoDeErro.SOLICITACAO_JA_ENVIADA,
          mensagem: MENSAGENS.solicitacaoDeAmizadeJaEnviada,
        });
      } else {
        throw new ErroAplicacao({
          codigoStatus: 400,
          codigo: CodigoDeErro.JA_SAO_AMIGOS,
          mensagem: MENSAGENS.jaSaoAmigos,
        });
      }
    }

    // Confere se o usuario de destino realmente existe.
    const usuario_destino = await this.usuariosRepository.buscarAlunoPorId(id_destino);

    if (!usuario_destino) {
      throw new ErroAplicacao({
        codigoStatus: 404,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        mensagem: MENSAGENS.usuarioDestinoIndisponivel,
      });
    }

    // Destino precisa estar ATIVO para receber solicitacoes.
    if (usuario_destino.status !== "ATIVO") {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        mensagem: MENSAGENS.usuarioDestinoInativo,
      });
    }

    // Destino com perfil oculto nao pode ser adicionado (regra de privacidade).
    if (!usuario_destino.visivel) {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        mensagem: MENSAGENS.usuarioDestinoIndisponivel,
      });
    }

    // Reabre uma solicitacao antes excluida (reaproveita o registro) ou cria uma nova.
    const envio = solicitacao_ja_existe?.excluidoEm
      ? await this.amizadesRepository.reabrirSolicitacao(
        solicitacao_ja_existe.id,
        usuario_id,
        id_destino,
      )
      : await this.amizadesRepository.enviarSolicitacao(usuario_id, id_destino);

    return envio;
  }

  /**
   * Lista os convites de amizade pendentes, recebidos ou enviados.
   *
   * O lado consultado vem do path da rota; ele tambem define qual usuario da relacao
   * e o "amigo" exibido (em recebidos, a origem; em enviados, o destino).
   *
   * @param query Parametros de paginacao.
   * @param path Caminho da rota, que seleciona recebidos vs enviados.
   * @param usuario_id Id do usuario autenticado.
   * @returns Pagina de convites resumidos com metadados de paginacao.
   * @throws ErroAplicacao 401 quando nao ha usuario autenticado.
   */
  async listarConvites(
    query: ListarAmigosQueryDto,
    path: string,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmizadeDto>> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    // O path decide se buscamos convites recebidos ou enviados.
    const seletor = path === "/convites/recebidos" ? "recebidos" : "enviados";
    const { data, total } = await this.amizadesRepository.listarConvites(
      usuario_id,
      paginacao,
      seletor,
    );

    // Em recebidos o "amigo" e quem enviou; em enviados, quem recebeu.
    const convites = data.map((convite) => {
      const amigo = seletor === "recebidos" ? convite.usuarioOrigem : convite.usuarioDestino;

      return this.montarResumoAmizade(convite, amigo);
    });

    return {
      dados: convites,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  /**
   * Aceita ou recusa uma solicitacao de amizade pendente.
   *
   * A acao (aceitar/recusar) vem do path da rota. So o destinatario da solicitacao
   * pode processa-la, e apenas enquanto ela estiver PENDENTE.
   *
   * @param data DTO com o id da solicitacao.
   * @param usuario_id Id do usuario autenticado (deve ser o destinatario).
   * @param path Caminho da rota, que define aceitar vs recusar.
   * @returns A amizade atualizada apos a acao.
   * @throws ErroAplicacao 400/401 conforme a regra violada.
   */
  async processarSolicitacao(
    data: SolicitacaoDto,
    usuario_id: string | undefined,
    path: string,
  ): Promise<Amizade> {
    if (!usuario_id) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    // Exige o id da solicitacao a ser processada.
    const solicitacao_id = data.id;

    if (!solicitacao_id) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmaSolicitacao,
      });
    }

    const solicitacao = await this.amizadesRepository.buscarPorSolicitacaoId(solicitacao_id);

    // Solicitacao inexistente nao pode ser processada.
    if (!solicitacao) {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });
    }

    // So solicitacoes ainda pendentes podem ser aceitas/recusadas.
    if (solicitacao.statusAmizade !== "PENDENTE") {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });
    }

    // Apenas o destinatario da solicitacao tem permissao para responde-la.
    if (solicitacao.usuarioDestinoId !== usuario_id) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.processarSolicitacaoRecusado,
      });
    }

    // Traduz o path em acao concreta e delega a atualizacao ao repository.
    const acao = path === "/aceitar" ? "aceitar" : "recusar";
    return this.amizadesRepository.processarSolicitacao(solicitacao_id, acao);
  }

  /**
   * Desfaz uma amizade ja existente (ativa).
   *
   * So pode ser desfeita por um dos dois envolvidos e apenas quando estiver ATIVA.
   *
   * @param data DTO com o id da amizade.
   * @param usuario_id Id do usuario autenticado (origem ou destino da amizade).
   * @returns A amizade desfeita.
   * @throws ErroAplicacao 400/401 conforme a regra violada.
   */
  async desfazerAmizade(data: SolicitacaoDto, usuario_id: string | undefined): Promise<Amizade> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    // Exige o id da amizade a desfazer.
    const amizade_id = data.id;
    if (amizade_id === "" || amizade_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmaSolicitacao,
      });
    }

    const amizade = await this.amizadesRepository.buscarPorSolicitacaoId(amizade_id);

    // So amizades ATIVAS podem ser desfeitas; senao trata como inexistente.
    if (amizade?.statusAmizade !== "ATIVO") {
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });
      // Apenas quem participa da amizade (origem ou destino) pode desfaze-la.
    } else if (amizade.usuarioDestinoId !== usuario_id && amizade.usuarioOrigemId !== usuario_id) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.desfazerAmizadeRecusado,
      });
    }

    const amizade_desfeita = await this.amizadesRepository.desfazerAmizade(amizade_id);

    return amizade_desfeita;
  }

  /**
   * Altera a visibilidade do perfil do usuario (aparecer ou nao para outros).
   *
   * @param usuario_id Id do usuario autenticado.
   * @param visivel Novo estado de visibilidade desejado.
   * @returns O registro de usuario com a visibilidade atualizada.
   * @throws ErroAplicacao 401 quando o usuario nao existe ou nao esta autenticado.
   */
  async mudarVisibilidade(usuario_id: string | undefined, visivel: boolean) {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }
    // Confirma que o usuario realmente existe antes de alterar o perfil.
    const usuario = await this.usuariosRepository.buscarAlunoPorId(usuario_id);

    if (!usuario) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }
    const visibilidade_alterada = await this.amizadesRepository.mudarVisibilidade(
      usuario_id,
      visivel,
    );

    return visibilidade_alterada;
  }

  /**
   * Monta o DTO de resumo de uma amizade/convite a partir da linha e do amigo.
   *
   * @param amizade Linha de amizade ou convite vinda do repository.
   * @param amigo Usuario considerado o "amigo" naquela relacao.
   * @returns Resumo padronizado da amizade para a resposta da API.
   */
  private montarResumoAmizade(
    amizade: AmizadeRow | ConviteRow,
    amigo: AmizadeRow["usuarioOrigem"] | AmizadeRow["usuarioDestino"],
  ): ResumoAmizadeDto {
    return {
      id: amizade.id,
      criadoEm: amizade.criadoEm,
      atualizadoEm: amizade.atualizadoEm,
      excluidoEm: amizade.excluidoEm,
      usuarioOrigemId: amizade.usuarioOrigemId,
      usuarioDestinoId: amizade.usuarioDestinoId,
      statusAmizade: amizade.statusAmizade,
      amigo,
    };
  }
}
