import { z } from "zod";

// Schemas Zod das rotas de usuarios (buscas paginadas e por ids).

// Busca paginada de alunos com termo opcional.
export const schemaBuscarAlunos = z.object({
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Recebe "ids" como CSV e transforma em lista limpa, sem vazios nem duplicados.
export const schemaBuscarUsuariosPorIds = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((ids) => ids.split(",").map((id) => id.trim()).filter(Boolean))
    .refine((ids) => ids.length > 0, {
      message: "Informe ao menos um id de usuario",
    })
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "A lista de ids nao pode conter valores duplicados",
    }),
});

// Valida o id na rota de busca publica por usuario.
export const schemaBuscarUsuarioPorId = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
});
