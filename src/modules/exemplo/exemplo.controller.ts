import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { ExemploService } from "@/modules/exemplo/exemplo.service";
import type { CriarExemploDto } from "@/modules/exemplo/dto/criar.exemplo.types";
import type { ListarExemplosDto } from "@/modules/exemplo/dto/listar.exemplos.types";
import type { RespostaExemploDto } from "@/modules/exemplo/dto/resposta.exemplo.types";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

// Controller HTTP do modulo de exemplo (CRUD de referencia).
export class ExemploController {
  constructor(private readonly exemploService: ExemploService) {}

  /**
   * POST cria um exemplo (responde 201 com o registro criado).
   *
   * @param request Requisicao com os dados do exemplo no body.
   * @param response Resposta com o exemplo criado.
   * @param next Encaminha erros ao middleware central.
   */
  criar = async (
    request: Request<unknown, unknown, CriarExemploDto>,
    response: Response<RespostaApiSucesso<RespostaExemploDto>>,
    next: NextFunction,
  ) => {
    try {
      const exemplo = await this.exemploService.criar(request.body);

      return response.status(201).json({
        mensagem: MENSAGENS.exemploCriado,
        dados: exemplo,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET lista paginada de exemplos.
   *
   * @param request Requisicao com parametros de paginacao na query.
   * @param response Resposta paginada de exemplos.
   * @param next Encaminha erros ao middleware central.
   */
  listar = async (
    request: Request<unknown, unknown, unknown, ListarExemplosDto>,
    response: Response<RespostaPaginada<RespostaExemploDto>>,
    next: NextFunction,
  ) => {
    try {
      const exemplos = await this.exemploService.listar(request.query);

      return response.status(200).json(exemplos);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET busca um exemplo por id (404 se nao existir).
   *
   * @param request Requisicao com o id do exemplo nos params.
   * @param response Resposta com o exemplo encontrado.
   * @param next Encaminha erros ao middleware central.
   */
  buscarPorId = async (
    request: Request<{ id: string }>,
    response: Response<RespostaApiSucesso<RespostaExemploDto>>,
    next: NextFunction,
  ) => {
    try {
      const exemplo = await this.exemploService.buscarPorId(request.params.id);

      return response.status(200).json({
        mensagem: MENSAGENS.exemploEncontrado,
        dados: exemplo,
      });
    } catch (error) {
      return next(error);
    }
  };
}
