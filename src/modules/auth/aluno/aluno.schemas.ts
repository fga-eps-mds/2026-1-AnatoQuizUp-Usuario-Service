import { z } from "zod";

import {
  ESCOLARIDADES_ALUNO,
  ESTADOS_BRASILEIROS,
  FORMATO_NICKNAME,
  TAMANHO_MAXIMO_NICKNAME,
  TAMANHO_MINIMO_NICKNAME,
} from "@/modules/auth/aluno/aluno.constants";

// Schemas Zod de cadastro/validacao do aluno. Centralizam as regras de formato
// (nickname, email, data, estado, escolaridade) reaproveitadas pelas rotas.

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_NOME_COMPLETO = /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/;

// Texto obrigatorio com limite maximo de caracteres (trim + nao vazio).
function textoObrigatorio(max: number) {
  return z.string().trim().min(1).max(max);
}

// Nome completo: apenas letras (com acentos) e espacos.
const schemaNomeCompleto = textoObrigatorio(120).regex(FORMATO_NOME_COMPLETO, {
  message: "Nome completo deve conter apenas letras e espacos.",
});

/**
 * Valida se a string e uma data ISO (yyyy-mm-dd) realmente existente.
 *
 * Alem do formato, reconstroi a data em UTC e confere se os componentes batem,
 * rejeitando datas impossiveis como 2026-02-31.
 *
 * @param valor String de data a validar.
 * @returns true se for uma data valida no formato esperado.
 */
function dataIsoValida(valor: string) {
  if (!FORMATO_DATA_ISO.test(valor)) {
    return false;
  }

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

// Nickname: normalizado para minusculo e validado quanto a tamanho e formato.
export const schemaNicknameAluno = z
  .string()
  .trim()
  .transform((nickname) => nickname.toLowerCase())
  .pipe(
    z.string().min(TAMANHO_MINIMO_NICKNAME).max(TAMANHO_MAXIMO_NICKNAME).regex(FORMATO_NICKNAME, {
      message: "Nickname deve comecar com letra e conter apenas letras minusculas, numeros e _.",
    }),
  );

// Email: limitado, validado e normalizado para minusculo.
export const schemaEmailAluno = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform((email) => email.toLowerCase());

// Query da checagem de disponibilidade de nickname.
export const schemaDisponibilidadeNicknameAluno = z.object({
  nickname: schemaNicknameAluno,
});

// Query da checagem de disponibilidade de email.
export const schemaDisponibilidadeEmailAluno = z.object({
  email: schemaEmailAluno,
});

// Payload completo de cadastro do aluno, com refine para confirmar a senha.
export const schemaRegistrarAluno = z
  .object({
    nome: schemaNomeCompleto,
    nickname: schemaNicknameAluno,
    email: schemaEmailAluno,
    senha: z.string().min(8),
    confirmacaoSenha: z.string().min(8),
    instituicao: textoObrigatorio(160),
    curso: textoObrigatorio(120),
    periodo: textoObrigatorio(40),
    dataNascimento: z.string().trim().refine(dataIsoValida, {
      message: "Data deve estar no formato yyyy-mm-dd.",
    }),
    nacionalidade: textoObrigatorio(80),
    // Estado normalizado para maiusculo e restrito as UFs brasileiras.
    estado: z
      .string()
      .trim()
      .transform((estado) => estado.toUpperCase())
      .pipe(z.enum(ESTADOS_BRASILEIROS)),
    cidade: textoObrigatorio(100),
    // Escolaridade normalizada e restrita as opcoes validas de aluno.
    escolaridade: z
      .string()
      .trim()
      .transform((escolaridade) => escolaridade.toUpperCase())
      .pipe(z.enum(ESCOLARIDADES_ALUNO)),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: "Confirmacao de senha deve ser igual a senha.",
    path: ["confirmacaoSenha"],
  });
