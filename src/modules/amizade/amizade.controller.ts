import type { NextFunction, Request, Response } from "express";

import type { RespostaPaginada } from "@/shared/types/api.types";
import type { ResumoAmigoDto, ResumoAmizadeDto } from "./dto/response/resumo_amigo_dto";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";
import type { AmizadesService } from "./amizade.service";
import type { BuscarAmigosQueryDto } from "./dto/request/buscar_amigos_query_dto";
import type { SolicitacaoDto } from "./dto/request/solicitacao_dto";

export class AmizadesController {
  constructor(private readonly amizadeService: AmizadesService) {}

  listarAmigos = async (
    request: Request<unknown, unknown, unknown, ListarAmigosQueryDto>,
    response: Response<RespostaPaginada<ResumoAmizadeDto>>,
    next: NextFunction,
  ) => {
    try {
      const amigos = await this.amizadeService.listarAmigos(
        request.query,
        request.usuario?.id ?? "",
      );
      return response.status(200).json(amigos);
    } catch (error) {
      return next(error);
    }
  };

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
        solcitacao: solicitacao,
      });
    } catch (error) {
      return next(error);
    }
  };

  listarConvites = async (
    request: Request<unknown, unknown, unknown, ListarAmigosQueryDto>,
    response: Response<RespostaPaginada<ResumoAmizadeDto>>,
    next: NextFunction,
  ) => {
    try {
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

  processarSolicitacao = async (
    request: Request<SolicitacaoDto>,
    response: Response,
    next: NextFunction,
  ) => {
    try {
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

  mudarVisibilidade = async (request: Request, response: Response, next: NextFunction) => {
    try {
      await this.amizadeService.mudarVisibilidade(request.usuario?.id ?? "");
      return response.status(200).json({
        mensagem: "Visibilidade desfeita com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };
}
