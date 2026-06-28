import type { RequestHandler } from "express";
import { z } from "zod";
import type { ZodType } from "zod";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

// Middleware generico de validacao com Zod, reutilizado por todas as rotas.

// Parte da requisicao que sera validada.
type AlvoValidacao = "body" | "query" | "params";

/**
 * Cria um middleware que valida o alvo (body/query/params) contra um schema Zod.
 *
 * Em caso de falha, retorna 400 com os erros formatados; em caso de sucesso,
 * substitui o alvo pelos dados ja parseados/coeridos pelo schema.
 *
 * @param schema Schema Zod usado na validacao.
 * @param alvo Parte da requisicao a validar (padrao: body).
 * @returns RequestHandler de validacao.
 */
export function validarRequisicao<T>(
  schema: ZodType<T>,
  alvo: AlvoValidacao = "body",
): RequestHandler {
  return (request, _response, next) => {
    const validacao = schema.safeParse(request[alvo]);

    // Dados invalidos viram erro 400 com o detalhamento dos campos.
    if (!validacao.success) {
      return next(
        new ErroAplicacao({
          codigoStatus: 400,
          codigo: CodigoDeErro.ERRO_DE_VALIDACAO,
          mensagem: MENSAGENS.erroValidacao,
          detalhes: z.treeifyError(validacao.error),
        }),
      );
    }

    // Sobrescreve o alvo com os dados ja validados/normalizados pelo schema.
    // Usa defineProperty porque request.query e somente-leitura em algumas versoes.
    Object.defineProperty(request, alvo, {
      value: validacao.data,
      configurable: true,
      enumerable: true,
      writable: true,
    });

    return next();
  };
}
