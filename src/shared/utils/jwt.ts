import { randomUUID } from "node:crypto";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import type { PayloadAutenticacao } from "../types/autenticacao.types";
import { jwtSecretKey, jwtRefreshSecretKey } from "../../config/env";
import { ErroAplicacao } from "../errors/erro-aplicacao";

// Utilitarios de JWT: verificacao e geracao dos tokens (acesso, refresh e
// redefinicao de senha), centralizando segredos e tempos de expiracao.

/**
 * Verifica e decodifica um token JWT.
 *
 * Traduz os erros da lib em ErroAplicacao 401 com codigos distintos (expirado,
 * invalido ou falha generica), para o cliente reagir de forma adequada.
 *
 * @param token Token a verificar.
 * @param segredo Segredo de assinatura (padrao: o do access token).
 * @returns O payload de autenticacao decodificado.
 * @throws ErroAplicacao 401 quando o token e invalido/expirado.
 */
export const verificarTokenJwt = (token: string, segredo: string = jwtSecretKey) => {
  try {
    const payload: PayloadAutenticacao = jwt.verify(token, segredo) as PayloadAutenticacao;
    return payload;
  } catch (erro: unknown) {
    if (erro instanceof TokenExpiredError) {
      throw new ErroAplicacao({
        mensagem: "Token expirado",
        codigo: "TOKEN_EXPIRADO",
        codigoStatus: 401,
        detalhes: erro,
      });
    } else if (erro instanceof JsonWebTokenError) {
      throw new ErroAplicacao({
        mensagem: "Token inválido",
        codigo: "TOKEN_INVALIDO",
        codigoStatus: 401,
        detalhes: erro,
      });
    } else {
      throw new ErroAplicacao({
        mensagem: "Falha na verificação do token",
        codigo: "VERIFICACAO_TOKEN_FALHOU",
        codigoStatus: 401,
        detalhes: erro,
      });
    }
  }
};

// Gera o access token, de vida curta (1h).
export const gerarTokenDeAcesso = (
  payload: PayloadAutenticacao,
  segredo: string = jwtSecretKey,
) => {
  return jwt.sign(payload, segredo, { expiresIn: "1h" });
};

// Gera o refresh token (7 dias) com jti unico, para permitir rotacao/revogacao.
export const gerarRefreshToken = (
  payload: PayloadAutenticacao,
  segredo: string = jwtRefreshSecretKey,
) => {
  return jwt.sign(payload, segredo, { expiresIn: "7 days", jwtid: randomUUID() });
};

// Gera um token curto (15m) especifico para o fluxo de redefinicao de senha.
export const gerarTokenDeRedefinicaoDeSenha = (
  payload: PayloadAutenticacao,
  segredo: string = jwtSecretKey,
) => {
  return jwt.sign(payload, segredo, { expiresIn: "15m" });
};
