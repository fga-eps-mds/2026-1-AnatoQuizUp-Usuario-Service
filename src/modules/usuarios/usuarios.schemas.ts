import { z } from "zod";

import {
  schemaNicknameAluno,
  schemaNomeCompleto,
} from "@/modules/auth/aluno/aluno.schemas";

export const schemaBuscarAlunos = z.object({
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

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

export const schemaBuscarUsuarioPorId = z.object({
  id: z.string().trim().min(1, "Id do usuario e obrigatorio"),
});

export const schemaAtualizarDadosPessoais = z
  .object({
    nome: schemaNomeCompleto.optional(),
    nickname: schemaNicknameAluno.optional(),
  })
  .refine((dados) => dados.nome !== undefined || dados.nickname !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const schemaAlterarSenha = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha: z.string().min(8),
    confirmacaoNovaSenha: z.string().min(8),
  })
  .refine((dados) => dados.novaSenha === dados.confirmacaoNovaSenha, {
    message: "A confirmacao nao corresponde a nova senha.",
    path: ["confirmacaoNovaSenha"],
  })
  .refine((dados) => dados.novaSenha !== dados.senhaAtual, {
    message: "A nova senha deve ser diferente da senha atual.",
    path: ["novaSenha"],
  });
