import { z } from "zod";

// Schemas Zod de validacao das rotas de amizade (params/query/body).

// Busca de amizades de um usuario especifico, com paginacao.
export const schemaBuscarAmizades = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Filtros de listagem/busca de amigos (nome/nickname) com paginacao.
export const schemaBuscarAlunosAmizade = z.object({
  nome: z.string().trim().min(1).optional(),
  nickname: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Body de enviar/aceitar/recusar/desfazer: identifica o usuario ou a solicitacao.
export const schemaSolicitarAmizade = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
});

// Body de alteracao de visibilidade do perfil.
export const schemaMudarVisibilidade = z.object({
  visivel: z.boolean(),
});

// Busca de amizade por usuario com termo de pesquisa opcional e paginacao.
export const schemaBuscarAmizadePorUsuarioId = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
