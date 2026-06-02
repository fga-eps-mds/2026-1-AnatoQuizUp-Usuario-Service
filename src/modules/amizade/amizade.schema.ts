import { z } from "zod";

export const schemaBuscarAmizades = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const schemaBuscarAlunosAmizade = z.object({
  nome: z.string().trim().min(1).optional(),
  nickname: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const schemaSolicitarAmizade = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
});

export const schemaMudarVisibilidade = z.object({
  visivel: z.boolean(),
});

export const schemaBuscarAmizadePorUsuarioId = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
