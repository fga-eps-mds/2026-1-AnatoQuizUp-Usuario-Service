import { z } from "zod";

const FORMATO_EMAIL_UNB = /^[^\s@]+@(?:[a-z0-9-]+\.)*unb\.br$/i;
const FORMATO_SIAPE = /^\d{7}$/;
const FORMATO_NOME_COMPLETO = /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/;

function textoObrigatorio(max: number) {
  return z.string().trim().min(1).max(max);
}

const schemaNomeCompleto = textoObrigatorio(120).regex(FORMATO_NOME_COMPLETO, {
  message: "Nome completo deve conter apenas letras e espacos.",
});

export const schemaEmailProfessor = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform((email) => email.toLowerCase())
  .refine((email) => FORMATO_EMAIL_UNB.test(email), {
    message: "Email institucional UnB obrigatorio.",
  });

export const schemaSiapeProfessor = z.string().trim().regex(FORMATO_SIAPE, {
  message: "SIAPE invalido.",
});

export const schemaRegistrarProfessor = z
  .object({
    nome: schemaNomeCompleto,
    email: schemaEmailProfessor,
    siape: schemaSiapeProfessor,
    instituicao: z
      .string()
      .trim()
      .refine((instituicao) => instituicao === "UnB", {
        message: "Instituicao deve ser UnB.",
      }),
    departamento: textoObrigatorio(120),
    curso: textoObrigatorio(120),
    senha: z.string().min(8),
    confirmacaoSenha: z.string().min(8),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: "Confirmacao de senha deve ser igual a senha.",
    path: ["confirmacaoSenha"],
  });
