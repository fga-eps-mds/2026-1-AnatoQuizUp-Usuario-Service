import type { NextFunction, Request, Response } from "express";

import type {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RespostaLoginDto,
  RespostaRenovarSessaoDto,
  RespostaUsuarioAutenticadoDto,
} from "@/modules/auth/sessao/dto/login.types";
import type { SessaoService } from "@/modules/auth/sessao/sessao.service";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

// Controller HTTP de sessao: expoe login, renovacao, logout e consulta do usuario
// autenticado, delegando as regras ao SessaoService e padronizando as respostas.
export class SessaoController {
  constructor(private readonly sessaoService: SessaoService) {}

  /**
   * POST autentica por email/senha e devolve os tokens da sessao.
   *
   * @param request Requisicao com email/senha no body.
   * @param response Resposta com o par de tokens.
   * @param next Encaminha erros ao middleware central.
   */
  login = async (
    request: Request<unknown, unknown, LoginDto>,
    response: Response<RespostaApiSucesso<RespostaLoginDto>>,
    next: NextFunction,
  ) => {
    try {
      const dados = await this.sessaoService.login(request.body);

      return response.status(200).json({
        mensagem: MENSAGENS.loginRealizado,
        dados,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST troca um refresh token valido por um novo par de tokens.
   *
   * @param request Requisicao com o refresh token no body.
   * @param response Resposta com o novo par de tokens.
   * @param next Encaminha erros ao middleware central.
   */
  renovarSessao = async (
    request: Request<unknown, unknown, RefreshTokenDto>,
    response: Response<RespostaApiSucesso<RespostaRenovarSessaoDto>>,
    next: NextFunction,
  ) => {
    try {
      const dados = await this.sessaoService.renovarSessao(request.body);

      return response.status(200).json({
        mensagem: MENSAGENS.sessaoRenovada,
        dados,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * POST encerra a sessao revogando o refresh token (responde 204 sem corpo).
   *
   * @param request Requisicao com o refresh token no body e o usuario logado.
   * @param response Resposta vazia (204) em caso de sucesso.
   * @param next Encaminha erros ao middleware central.
   */
  logout = async (
    request: Request<unknown, unknown, LogoutDto>,
    response: Response<void>,
    next: NextFunction,
  ) => {
    try {
      // Logout exige usuario autenticado na requisicao.
      if (!request.usuario) {
        throw new ErroAplicacao({
          codigoStatus: 401,
          codigo: CodigoDeErro.TOKEN_INVALIDO,
          mensagem: MENSAGENS.tokenInvalido,
        });
      }

      await this.sessaoService.logout(request.usuario.id, request.body);

      return response.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET retorna os dados do usuario autenticado (a partir do token).
   *
   * @param request Requisicao com o usuario ja resolvido pelo middleware.
   * @param response Resposta com os dados do usuario autenticado.
   * @param next Encaminha erros ao middleware central.
   */
  obterUsuarioAutenticado = async (
    request: Request,
    response: Response<RespostaApiSucesso<RespostaUsuarioAutenticadoDto>>,
    next: NextFunction,
  ) => {
    try {
      // Rota protegida: precisa de usuario autenticado.
      if (!request.usuario) {
        throw new ErroAplicacao({
          codigoStatus: 401,
          codigo: CodigoDeErro.TOKEN_INVALIDO,
          mensagem: MENSAGENS.tokenInvalido,
        });
      }

      const dados = await this.sessaoService.obterUsuarioAutenticado(request.usuario.id);

      return response.status(200).json({
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
        dados,
      });
    } catch (error) {
      return next(error);
    }
  };
}
