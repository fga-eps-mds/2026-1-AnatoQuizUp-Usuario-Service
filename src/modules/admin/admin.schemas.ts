import { z } from "zod";
import { STATUS_USUARIO_API } from "./dto/alterar.status_user.types";

// Schemas Zod das rotas administrativas (paginacao, id e alteracao de status).

// Query de listagem paginada de usuarios.
export const schemaListarUsers = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Valida o id na rota de detalhe/alteracao.
export const schemaBuscarUserPorId = z.object({
  id: z.string().trim().min(1),
});

// Body de alteracao de status, restrito aos valores aceitos pela API.
export const schemaAlterarStatusUser = z.object({
  status: z.enum([
    STATUS_USUARIO_API.PENDING,
    STATUS_USUARIO_API.ACTIVE,
    STATUS_USUARIO_API.INACTIVE,
  ]),
});
