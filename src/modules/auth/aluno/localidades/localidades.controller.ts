import type { NextFunction, Request, Response } from "express";

import type {
  RespostaCidadeDto,
  RespostaEstadoDto,
} from "@/modules/auth/aluno/localidades/dto/resposta.localidade.types";
import type { BuscarCidadesPorUfDto } from "@/modules/auth/aluno/localidades/localidades.schemas";
import type { AlunoLocalidadesService } from "@/modules/auth/aluno/localidades/localidades.service";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

// Controller HTTP das localidades de apoio ao cadastro (estados e cidades por UF).
export class AlunoLocalidadesController {
  constructor(private readonly localidadesService: AlunoLocalidadesService) {}

  /**
   * GET lista todos os estados (UFs) brasileiros.
   *
   * @param _request Requisicao Express (sem parametros).
   * @param response Resposta com a lista de estados.
   * @param next Encaminha erros ao middleware central.
   */
  listarEstados = async (
    _request: Request,
    response: Response<RespostaApiSucesso<RespostaEstadoDto[]>>,
    next: NextFunction,
  ) => {
    try {
      return response.status(200).json({
        mensagem: MENSAGENS.estadosListados,
        dados: this.localidadesService.listarEstados(),
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET lista as cidades de uma UF informada na rota.
   *
   * @param request Requisicao com a UF nos params.
   * @param response Resposta com as cidades da UF.
   * @param next Encaminha erros ao middleware central.
   */
  listarCidadesPorUf = async (
    request: Request<BuscarCidadesPorUfDto>,
    response: Response<RespostaApiSucesso<RespostaCidadeDto[]>>,
    next: NextFunction,
  ) => {
    try {
      return response.status(200).json({
        mensagem: MENSAGENS.cidadesListadas,
        dados: this.localidadesService.listarCidadesPorUf(request.params.uf),
      });
    } catch (error) {
      return next(error);
    }
  };
}
