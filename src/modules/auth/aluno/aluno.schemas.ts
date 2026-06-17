import { z } from "zod";

import {
  ESCOLARIDADES_ALUNO,
  ESTADOS_BRASILEIROS,
  FORMATO_NICKNAME,
  TAMANHO_MAXIMO_NICKNAME,
  TAMANHO_MINIMO_NICKNAME,
} from "@/modules/auth/aluno/aluno.constants";

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_NOME_COMPLETO = /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/;

function textoObrigatorio(max: number) {
  return z.string().trim().min(1).max(max);
}

export const schemaNomeCompleto = textoObrigatorio(120).regex(FORMATO_NOME_COMPLETO, {
  message: "Nome completo deve conter apenas letras e espacos.",
});

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

export const schemaNicknameAluno = z
  .string()
  .trim()
  .transform((nickname) => nickname.toLowerCase())
  .pipe(
    z.string().min(TAMANHO_MINIMO_NICKNAME).max(TAMANHO_MAXIMO_NICKNAME).regex(FORMATO_NICKNAME, {
      message: "Nickname deve comecar com letra e conter apenas letras minusculas, numeros e _.",
    }),
  );

export const schemaEmailAluno = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform((email) => email.toLowerCase());

export const schemaDisponibilidadeNicknameAluno = z.object({
  nickname: schemaNicknameAluno,
});

export const schemaDisponibilidadeEmailAluno = z.object({
  email: schemaEmailAluno,
});

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
    estado: z
      .string()
      .trim()
      .transform((estado) => estado.toUpperCase())
      .pipe(z.enum(ESTADOS_BRASILEIROS)),
    cidade: textoObrigatorio(100),
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
