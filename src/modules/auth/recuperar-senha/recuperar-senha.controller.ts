import type { NextFunction, Request, Response } from "express";

import type { RecuperarSenhaService } from "@/modules/auth/recuperar-senha/recuperar-senha.service";
import type {
  RedefinirSenhaDto,
  SolicitarRecuperacaoSenhaDto,
} from "@/modules/auth/recuperar-senha/recuperar-senha.schemas";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

// Controller HTTP do fluxo de recuperacao de senha (solicitar e redefinir).
export class RecuperarSenhaController {
  constructor(private readonly recuperarSenhaService: RecuperarSenhaService) {}

  /**
   * POST solicita a recuperacao; responde 200 generico mesmo se o email nao existir.
   *
   * @param request Requisicao com o email no body.
   * @param response Resposta generica de confirmacao.
   * @param next Encaminha erros ao middleware central.
   */
  forgotPassword = async (
    request: Request<unknown, unknown, SolicitarRecuperacaoSenhaDto>,
    response: Response<RespostaApiSucesso<null>>,
    next: NextFunction,
  ) => {
    try {
      await this.recuperarSenhaService.forgotPassword(request.body);

      return response.status(200).json({
        mensagem: MENSAGENS.instrucoesRecuperacaoSenhaEnviadas,
        dados: null,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST redefine a senha a partir de um token valido recebido por email.
   *
   * @param request Requisicao com o token e a nova senha no body.
   * @param response Resposta de confirmacao da redefinicao.
   * @param next Encaminha erros ao middleware central.
   */
  resetPassword = async (
    request: Request<unknown, unknown, RedefinirSenhaDto>,
    response: Response<RespostaApiSucesso<null>>,
    next: NextFunction,
  ) => {
    try {
      await this.recuperarSenhaService.resetPassword(request.body);

      return response.status(200).json({
        mensagem: MENSAGENS.senhaRedefinida,
        dados: null,
      });
    } catch (error) {
      return next(error);
    }
  };
}
