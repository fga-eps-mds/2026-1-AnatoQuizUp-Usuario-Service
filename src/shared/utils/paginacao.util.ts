import type { MetadadosPaginacao } from "@/shared/types/api.types";

export type EntradaPaginacao = {
  page?: number;
  limit?: number;
};

export type ParametrosPaginacao = {
  page: number;
  limit: number;
  skip: number;
};

// Utilitario de paginacao compartilhado: sanitiza page/limit e monta os metadados.

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Resolve os parametros de paginacao a partir da entrada do cliente.
 *
 * Aplica defaults para page/limit invalidos, limita o tamanho da pagina ao MAX_LIMIT
 * e calcula o skip correspondente para a consulta no banco.
 *
 * @param input page/limit informados (possivelmente ausentes ou invalidos).
 * @returns page, limit e skip ja saneados.
 */
export function resolverParametrosPaginacao(input: EntradaPaginacao): ParametrosPaginacao {
  const pagina = input.page && input.page > 0 ? input.page : DEFAULT_PAGE;
  const limite = input.limit && input.limit > 0 ? Math.min(input.limit, MAX_LIMIT) : DEFAULT_LIMIT;

  return {
    page: pagina,
    limit: limite,
    skip: (pagina - 1) * limite,
  };
}

/**
 * Monta os metadados de paginacao da resposta.
 *
 * @param paginacao Parametros usados na consulta.
 * @param total Total de registros encontrados.
 * @returns Metadados (page, limit, total e total de paginas).
 */
export function montarMetadadosPaginacao(
  paginacao: ParametrosPaginacao,
  total: number,
): MetadadosPaginacao {
  return {
    page: paginacao.page,
    limit: paginacao.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / paginacao.limit),
  };
}
