import type { NextFunction, Request, Response } from "express";

import { env } from "@/config/env";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

// Middleware de token interno: garante que as rotas /api so sejam chamadas pelo BFF.
// O BFF injeta o header x-internal-token; qualquer chamada sem ele (ou com valor
// errado) e barrada com 403, protegendo o servico de acesso publico direto.

const MENSAGEM_AUSENTE = "Token interno ausente. Acesso permitido somente via BFF.";
const MENSAGEM_INVALIDO = "Token interno invalido.";

/**
 * Valida o header x-internal-token contra o segredo compartilhado.
 *
 * @param request Requisicao Express.
 * @param _response Resposta Express (nao usada).
 * @param next Continua a cadeia, ou propaga erro 403.
 */
export function middlewareTokenInterno(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const recebido = request.header("x-internal-token");

  // Header ausente: chamada nao veio do BFF.
  if (!recebido) {
    return next(
      new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.PROIBIDO,
        mensagem: MENSAGEM_AUSENTE,
      }),
    );
  }

  // Valor diferente do segredo configurado: token forjado/desatualizado.
  if (recebido !== env.INTERNAL_TOKEN) {
    return next(
      new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.PROIBIDO,
        mensagem: MENSAGEM_INVALIDO,
      }),
    );
  }

  next();
}
