import { z } from "zod";

// Schemas Zod de cadastro do professor. Diferente do aluno, exige email institucional
// da UnB, SIAPE de 7 digitos e instituicao fixa "UnB".

const FORMATO_EMAIL_UNB = /^[^\s@]+@(?:[a-z0-9-]+\.)*unb\.br$/i;
const FORMATO_SIAPE = /^\d{7}$/;
const FORMATO_NOME_COMPLETO = /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/;

// Texto obrigatorio com limite maximo (trim + nao vazio).
function textoObrigatorio(max: number) {
  return z.string().trim().min(1).max(max);
}

// Nome completo: apenas letras (com acentos) e espacos.
const schemaNomeCompleto = textoObrigatorio(120).regex(FORMATO_NOME_COMPLETO, {
  message: "Nome completo deve conter apenas letras e espacos.",
});

// Email: normalizado e restrito ao dominio institucional da UnB.
export const schemaEmailProfessor = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform((email) => email.toLowerCase())
  .refine((email) => FORMATO_EMAIL_UNB.test(email), {
    message: "Email institucional UnB obrigatorio.",
  });

// SIAPE: matricula funcional de exatamente 7 digitos.
export const schemaSiapeProfessor = z.string().trim().regex(FORMATO_SIAPE, {
  message: "SIAPE invalido.",
});

// Payload completo de cadastro do professor, com refine de confirmacao de senha.
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
