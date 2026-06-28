import type { NextFunction, Request, Response } from "express";

import type { RespostaPaginada } from "@/shared/types/api.types";
import type { ResumoAmigoDto, ResumoAmizadeDto } from "./dto/response/resumo_amigo_dto";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";
import type { AmizadesService } from "./amizade.service";
import type { BuscarAmigosQueryDto } from "./dto/request/buscar_amigos_query_dto";
import type { SolicitacaoDto } from "./dto/request/solicitacao_dto";

// Corpo da requisicao para alternar a visibilidade do perfil.
type MudarVisibilidadeDto = {
  visivel: boolean;
};

// Controller HTTP de amizades: cada handler le os dados da requisicao (query/body e
// o usuario autenticado), chama o service e devolve a resposta, encaminhando erros
// ao middleware central via next.
export class AmizadesController {
  constructor(private readonly amizadeService: AmizadesService) { }

  /**
   * GET lista paginada de amigos confirmados do usuario logado.
   *
   * @param request Requisicao com filtros/paginacao na query e o usuario autenticado.
   * @param response Resposta paginada com os amigos resumidos.
   * @param next Encaminha erros ao middleware central.
   */
  listarAmigos = async (
    request: Request<unknown, unknown, unknown, ListarAmigosQueryDto>,
    response: Response<RespostaPaginada<ResumoAmizadeDto>>,
    next: NextFunction,
  ) => {
    try {
      // Usa "" quando nao ha usuario para o service aplicar o guard de 401.
      const amigos = await this.amizadeService.listarAmigos(
        request.query,
        request.usuario?.id ?? "",
      );
      return response.status(200).json(amigos);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET busca de alunos para adicionar (descoberta de novas amizades).
   *
   * @param request Requisicao com filtros/paginacao na query e o usuario autenticado.
   * @param response Resposta paginada com os candidatos a amizade.
   * @param next Encaminha erros ao middleware central.
   */
  buscarAmigos = async (
    request: Request<unknown, unknown, unknown, BuscarAmigosQueryDto>,
    response: Response<RespostaPaginada<ResumoAmigoDto>>,
    next: NextFunction,
  ) => {
    try {
      const futuros_amigos = await this.amizadeService.buscarAmigos(
        request.query,
        request.usuario?.id ?? "",
      );
      return response.status(200).json(futuros_amigos);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST envia uma solicitacao de amizade para outro usuario.
   *
   * @param request Requisicao com o id do destino no body e o usuario autenticado.
   * @param response Resposta com a solicitacao criada.
   * @param next Encaminha erros ao middleware central.
   */
  enviarSolicitacao = async (
    request: Request<SolicitacaoDto>,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const solicitacao = await this.amizadeService.enviarSolicitacao(
        request.body,
        request.usuario?.id ?? "",
      );
      return response.status(200).json({
        mensagem: "Solicitação enviada com sucesso",
        solicitacao: solicitacao,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET lista convites pendentes; recebidos ou enviados conforme o path da rota.
   *
   * @param request Requisicao com paginacao na query, path da rota e usuario logado.
   * @param response Resposta paginada com os convites resumidos.
   * @param next Encaminha erros ao middleware central.
   */
  listarConvites = async (
    request: Request<unknown, unknown, unknown, ListarAmigosQueryDto>,
    response: Response<RespostaPaginada<ResumoAmizadeDto>>,
    next: NextFunction,
  ) => {
    try {
      // O service usa request.path para decidir entre recebidos e enviados.
      const amigos = await this.amizadeService.listarConvites(
        request.query,
        request.path,
        request.usuario?.id ?? "",
      );
      return response.status(200).json(amigos);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST aceita ou recusa uma solicitacao (acao definida pelo path da rota).
   *
   * @param request Requisicao com o id da solicitacao no body e o path da acao.
   * @param response Resposta de confirmacao.
   * @param next Encaminha erros ao middleware central.
   */
  processarSolicitacao = async (
    request: Request<SolicitacaoDto>,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      // request.path (/aceitar ou /recusar) define a acao no service.
      await this.amizadeService.processarSolicitacao(
        request.body,
        request.usuario?.id ?? "",
        request.path,
      );
      return response.status(200).json({
        mensagem: "Solicitação processada com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * DELETE desfaz uma amizade ativa entre o usuario e um amigo.
   *
   * @param request Requisicao com o id da amizade no body e o usuario logado.
   * @param response Resposta de confirmacao.
   * @param next Encaminha erros ao middleware central.
   */
  desfazerAmizade = async (
    request: Request<SolicitacaoDto>,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await this.amizadeService.desfazerAmizade(request.body, request.usuario?.id ?? "");
      return response.status(200).json({
        mensagem: "Amizade desfeita com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * PATCH altera a visibilidade do perfil do usuario nas buscas de amizade.
   *
   * @param request Requisicao com o novo valor de "visivel" no body.
   * @param response Resposta de confirmacao.
   * @param next Encaminha erros ao middleware central.
   */
  mudarVisibilidade = async (
    request: Request<unknown, unknown, MudarVisibilidadeDto>,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await this.amizadeService.mudarVisibilidade(
        request.usuario?.id ?? "",
        request.body.visivel,
      );
      return response.status(200).json({
        mensagem: "Visibilidade alterada com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };
}
