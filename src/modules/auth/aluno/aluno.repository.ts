import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";
import { VALOR_NAO_SE_APLICA, type EscolaridadeAluno } from "@/modules/auth/aluno/aluno.constants";
import type { RegistroAluno } from "@/modules/auth/aluno/dto/resposta.aluno.types";
import type { Papel, StatusUsuario } from "@/shared/constants/papeis";

// Repository de cadastro de aluno: acesso ao banco via SQL cru do Prisma, com
// traducao entre as colunas do banco (PT, "perfil"/"semestre") e o dominio.

// Dados necessarios para criar um aluno (ja normalizados pelo service).
export type CriarAlunoData = {
  nome: string;
  nickname: string;
  email: string;
  senhaHash: string;
  instituicao: string;
  curso: string;
  periodo: string;
  dataNascimento: Date;
  nacionalidade: string;
  cidade: string;
  estado: string;
  escolaridade: EscolaridadeAluno;
  papel: Papel;
  status: StatusUsuario;
};

// Niveis aceitos no banco (inclui pos-graduacao alem da escolaridade do aluno).
type NivelEducacional = EscolaridadeAluno | "MESTRADO" | "DOUTORADO";

// Projecoes minimas usadas so para checar duplicidade de email/nickname.
type AlunoPorEmail = {
  id: string;
  email: string;
};

type AlunoPorNickname = {
  id: string;
  nickname: string;
};

// Registro de aluno exatamente como retornado pelo banco.
type RegistroAlunoBanco = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  instituicao: string | null;
  curso: string | null;
  semestre: string | null;
  estado: string | null;
  cidade: string | null;
  nacionalidade: string | null;
  dataNascimento: Date | null;
  nivelEducacional: NivelEducacional | null;
  perfil: Papel;
  status: StatusUsuario;
  criadoEm: Date;
  atualizadoEm: Date;
};

/**
 * Converte o registro cru do banco para o modelo de dominio do aluno.
 *
 * Renomeia semestre -> periodo e nivelEducacional -> escolaridade, e deriva
 * semVinculoAcademico quando os campos academicos sao "nao se aplica".
 *
 * @param registro Registro do aluno vindo do banco.
 * @returns Aluno no formato de dominio.
 */
function converterRegistroBanco(registro: RegistroAlunoBanco): RegistroAluno {
  return {
    id: registro.id,
    nome: registro.nome,
    nickname: registro.nickname,
    email: registro.email,
    instituicao: registro.instituicao,
    curso: registro.curso,
    periodo: registro.semestre,
    semVinculoAcademico:
      registro.instituicao === VALOR_NAO_SE_APLICA &&
      registro.curso === VALOR_NAO_SE_APLICA &&
      registro.semestre === VALOR_NAO_SE_APLICA,
    dataNascimento: registro.dataNascimento,
    nacionalidade: registro.nacionalidade,
    cidade: registro.cidade,
    estado: registro.estado,
    escolaridade: registro.nivelEducacional,
    papel: registro.perfil,
    status: registro.status,
    createdAt: registro.criadoEm,
    updatedAt: registro.atualizadoEm,
  };
}

export class AlunoAuthRepository {
  /**
   * Busca minima por email (so id/email) para checar se ja existe cadastro.
   *
   * @param email Email a procurar.
   * @returns id/email do aluno, ou null se nao houver.
   */
  async buscarPorEmail(email: string): Promise<AlunoPorEmail | null> {
    const registros = await prisma.$queryRaw<AlunoPorEmail[]>`
      SELECT id, email
      FROM usuarios
      WHERE email = ${email}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  /**
   * Busca minima por nickname para checar disponibilidade no cadastro.
   *
   * @param nickname Nickname a procurar.
   * @returns id/nickname do aluno, ou null se estiver livre.
   */
  async buscarPorNickname(nickname: string): Promise<AlunoPorNickname | null> {
    const registros = await prisma.$queryRaw<AlunoPorNickname[]>`
      SELECT id, nickname
      FROM usuarios
      WHERE nickname = ${nickname}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  /**
   * Insere um novo aluno e retorna o registro ja convertido para o dominio.
   *
   * Gera o id da aplicacao (UUID) e usa RETURNING para evitar um SELECT extra.
   * Os casts ::"PerfilUsuario" etc. convertem strings nos enums do Postgres.
   *
   * @param data Dados ja normalizados do aluno a inserir.
   * @returns Aluno criado, no formato de dominio.
   */
  async criar(data: CriarAlunoData) {
    const id = randomUUID();

    const registros = await prisma.$queryRaw<RegistroAlunoBanco[]>`
      INSERT INTO usuarios (
        id,
        nome,
        nickname,
        email,
        senha,
        perfil,
        status,
        instituicao,
        curso,
        semestre,
        estado,
        cidade,
        nacionalidade,
        "dataNascimento",
        "nivelEducacional",
        "criadoEm",
        "atualizadoEm"
      )
      VALUES (
        ${id},
        ${data.nome},
        ${data.nickname},
        ${data.email},
        ${data.senhaHash},
        ${data.papel}::"PerfilUsuario",
        ${data.status}::"StatusUsuario",
        ${data.instituicao},
        ${data.curso},
        ${data.periodo},
        ${data.estado},
        ${data.cidade},
        ${data.nacionalidade},
        ${data.dataNascimento},
        ${data.escolaridade}::"NivelEducacional",
        NOW(),
        NOW()
      )
      RETURNING
        id,
        nome,
        nickname,
        email,
        instituicao,
        curso,
        semestre,
        estado,
        cidade,
        nacionalidade,
        "dataNascimento",
        "nivelEducacional",
        perfil,
        status,
        "criadoEm",
        "atualizadoEm"
    `;

    return converterRegistroBanco(registros[0]);
  }
}
