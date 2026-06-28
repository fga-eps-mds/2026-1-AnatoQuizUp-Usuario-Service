import { z } from "zod";

// Schemas Zod do fluxo de recuperacao de senha (solicitar e redefinir).

// Email normalizado (trim, minusculo) e validado.
const schemaEmail = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform((email) => email.toLowerCase());

// Body para solicitar o email de recuperacao.
export const schemaSolicitarRecuperacaoSenha = z.object({
  email: schemaEmail,
});

// Body para redefinir: token recebido por email + nova senha (minimo 8 caracteres).
export const schemaRedefinirSenha = z.object({
  token: z.string().trim().min(1),
  senha: z.string().min(8),
});

// DTOs inferidos dos schemas acima (fonte unica de verdade).
export type SolicitarRecuperacaoSenhaDto = z.infer<typeof schemaSolicitarRecuperacaoSenha>;
export type RedefinirSenhaDto = z.infer<typeof schemaRedefinirSenha>;
