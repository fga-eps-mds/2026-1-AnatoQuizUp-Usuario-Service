import type { NextFunction, Request, Response } from "express";

import type { RegistrarProfessorDto } from "@/modules/auth/professor/dto/registrar.professor.types";
import type { RespostaProfessorDto } from "@/modules/auth/professor/dto/resposta.professor.types";
import type { ProfessorAuthService } from "@/modules/auth/professor/professor.service";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

// Controller HTTP de cadastro de professor (entra pendente de aprovacao).
export class ProfessorAuthController {
  constructor(private readonly professorAuthService: ProfessorAuthService) {}

  /**
   * POST registra um professor (responde 201; status inicial PENDENTE).
   *
   * @param request Requisicao com os dados de cadastro do professor no body.
   * @param response Resposta com o professor criado (pendente de aprovacao).
   * @param next Encaminha erros ao middleware central.
   */
  registrar = async (
    request: Request<unknown, unknown, RegistrarProfessorDto>,
    response: Response<RespostaApiSucesso<{ usuario: RespostaProfessorDto }>>,
    next: NextFunction,
  ) => {
    try {
      const professor = await this.professorAuthService.registrar(request.body);

      return response.status(201).json({
        mensagem: MENSAGENS.professorCadastradoPendente,
        dados: {
          usuario: professor,
        },
      });
    } catch (error) {
      return next(error);
    }
  };
}
