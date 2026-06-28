import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { logger } from "@/config/logger";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaApiErro } from "@/shared/types/api.types";

/**
 * Middleware central de erros do Usuario-Service.
 *
 * Ultimo da cadeia, converte qualquer excecao em resposta JSON padronizada: erros de
 * aplicacao usam seu proprio status/codigo; erros conhecidos do Prisma viram 400; o
 * resto e logado e respondido como 500 generico (sem vazar detalhes internos).
 *
 * @param erro Excecao capturada na cadeia.
 * @param _request Requisicao Express (nao usada na resposta).
 * @param response Resposta Express com o envelope de erro.
 * @param next Exigido na assinatura para o Express tratar como handler de erro.
 */
export function middlewareTratamentoErros(
  erro: unknown,
  _request: Request,
  response: Response<RespostaApiErro>,
  next: NextFunction,
) {
  void next;

  // Erros previstos ja trazem status, codigo e mensagem prontos.
  if (erro instanceof ErroAplicacao) {
    return response.status(erro.codigoStatus).json({
      erro: {
        codigo: erro.codigo,
        mensagem: erro.message,
        detalhes: erro.detalhes,
      },
    });
  }

  // Erros conhecidos do Prisma (ex.: violacao de constraint) viram 400.
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return response.status(400).json({
      erro: {
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: erro.message,
      },
    });
  }

  // Qualquer outra excecao e inesperada: loga completo e responde 500 generico.
  logger.error({ erro }, "Erro nao tratado na aplicacao.");

  return response.status(500).json({
    erro: {
      codigo: CodigoDeErro.ERRO_INTERNO,
      mensagem: MENSAGENS.erroInterno,
    },
  });
}
