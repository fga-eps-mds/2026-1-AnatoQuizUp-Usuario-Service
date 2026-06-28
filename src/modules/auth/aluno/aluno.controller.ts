import type { NextFunction, Request, Response } from "express";

import type {
  AlunoAuthService,
  RespostaDisponibilidadeEmailDto,
  RespostaDisponibilidadeNicknameDto,
} from "@/modules/auth/aluno/aluno.service";
import type {
  DisponibilidadeEmailAlunoDto,
  DisponibilidadeNicknameAlunoDto,
  RegistrarAlunoDto,
} from "@/modules/auth/aluno/dto/registrar.aluno.types";
import type { RespostaAlunoDto } from "@/modules/auth/aluno/dto/resposta.aluno.types";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

// Controller HTTP de cadastro de aluno: checagens de disponibilidade e registro,
// delegando ao AlunoAuthService e padronizando as respostas.
export class AlunoAuthController {
  constructor(private readonly alunoAuthService: AlunoAuthService) {}

  /**
   * GET verifica se um nickname esta disponivel (usado durante o cadastro).
   *
   * @param request Requisicao com o nickname na query.
   * @param response Resposta indicando se o nickname esta livre.
   * @param next Encaminha erros ao middleware central.
   */
  verificarNicknameDisponivel = async (
    request: Request<unknown, unknown, unknown, DisponibilidadeNicknameAlunoDto>,
    response: Response<RespostaApiSucesso<RespostaDisponibilidadeNicknameDto>>,
    next: NextFunction,
  ) => {
    try {
      const disponibilidade = await this.alunoAuthService.verificarNicknameDisponivel(
        request.query,
      );

      return response.status(200).json({
        mensagem: MENSAGENS.nicknameDisponivel,
        dados: disponibilidade,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET verifica se um email esta disponivel (usado durante o cadastro).
   *
   * @param request Requisicao com o email na query.
   * @param response Resposta indicando se o email esta livre.
   * @param next Encaminha erros ao middleware central.
   */
  verificarEmailDisponivel = async (
    request: Request<unknown, unknown, unknown, DisponibilidadeEmailAlunoDto>,
    response: Response<RespostaApiSucesso<RespostaDisponibilidadeEmailDto>>,
    next: NextFunction,
  ) => {
    try {
      const disponibilidade = await this.alunoAuthService.verificarEmailDisponivel(request.query);

      return response.status(200).json({
        mensagem: MENSAGENS.emailDisponivel,
        dados: disponibilidade,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST registra um novo aluno (responde 201 com o aluno criado).
   *
   * @param request Requisicao com os dados de cadastro no body.
   * @param response Resposta com o aluno recem-criado.
   * @param next Encaminha erros ao middleware central.
   */
  registrar = async (
    request: Request<unknown, unknown, RegistrarAlunoDto>,
    response: Response<RespostaApiSucesso<RespostaAlunoDto>>,
    next: NextFunction,
  ) => {
    try {
      const aluno = await this.alunoAuthService.registrar(request.body);

      return response.status(201).json({
        mensagem: MENSAGENS.usuarioCadastrado,
        dados: aluno,
      });
    } catch (error) {
      return next(error);
    }
  };
}
