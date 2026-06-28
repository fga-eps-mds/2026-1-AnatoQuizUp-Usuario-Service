import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";
import type { RegistroProfessor } from "@/modules/auth/professor/dto/resposta.professor.types";
import type { Papel, StatusUsuario } from "@/shared/constants/papeis";

// Repository de cadastro de professor: acesso ao banco via SQL cru do Prisma, com
// traducao entre as colunas do banco e o modelo de dominio do professor.

// Dados necessarios para inserir um professor (ja normalizados pelo service).
export type CriarProfessorData = {
  nome: string;
  email: string;
  senhaHash: string;
  instituicao: string;
  departamento: string;
  curso: string;
  siape: string;
  papel: Papel;
  status: StatusUsuario;
};

// Projecoes minimas usadas so para checar duplicidade de email/siape.
type ProfessorPorEmail = {
  id: string;
  email: string;
};

type ProfessorPorSiape = {
  id: string;
  siape: string;
};

// Registro de professor exatamente como retornado pelo banco.
type RegistroProfessorBanco = {
  id: string;
  nome: string;
  email: string;
  instituicao: string | null;
  departamento: string | null;
  curso: string | null;
  siape: string | null;
  perfil: Papel;
  status: StatusUsuario;
  criadoEm: Date;
  atualizadoEm: Date;
};

// Converte o registro cru do banco para o modelo de dominio (perfil -> papel).
function converterRegistroBanco(registro: RegistroProfessorBanco): RegistroProfessor {
  return {
    id: registro.id,
    nome: registro.nome,
    email: registro.email,
    instituicao: registro.instituicao,
    departamento: registro.departamento,
    curso: registro.curso,
    siape: registro.siape,
    papel: registro.perfil,
    status: registro.status,
    criadoEm: registro.criadoEm,
    atualizadoEm: registro.atualizadoEm,
  };
}

export class ProfessorAuthRepository {
  /**
   * Busca minima por email para checar se ja existe cadastro.
   *
   * @param email Email a procurar.
   * @returns id/email do professor, ou null.
   */
  async buscarPorEmail(email: string): Promise<ProfessorPorEmail | null> {
    const registros = await prisma.$queryRaw<ProfessorPorEmail[]>`
      SELECT id, email
      FROM usuarios
      WHERE email = ${email}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  /**
   * Busca minima por SIAPE para checar duplicidade da matricula funcional.
   *
   * @param siape SIAPE a procurar.
   * @returns id/siape do professor, ou null.
   */
  async buscarPorSiape(siape: string): Promise<ProfessorPorSiape | null> {
    const registros = await prisma.$queryRaw<ProfessorPorSiape[]>`
      SELECT id, siape
      FROM usuarios
      WHERE siape = ${siape}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  /**
   * Insere um novo professor e retorna o registro convertido para o dominio.
   *
   * Gera o id (UUID), usa RETURNING para evitar SELECT extra e converte as strings
   * de papel/status para os enums do Postgres via cast.
   *
   * @param data Dados ja normalizados do professor.
   * @returns Professor criado, no formato de dominio.
   */
  async criar(data: CriarProfessorData): Promise<RegistroProfessor> {
    const id = randomUUID();

    const registros = await prisma.$queryRaw<RegistroProfessorBanco[]>`
      INSERT INTO usuarios (
        id,
        nome,
        email,
        senha,
        perfil,
        status,
        instituicao,
        departamento,
        curso,
        siape,
        "criadoEm",
        "atualizadoEm"
      )
      VALUES (
        ${id},
        ${data.nome},
        ${data.email},
        ${data.senhaHash},
        ${data.papel}::"PerfilUsuario",
        ${data.status}::"StatusUsuario",
        ${data.instituicao},
        ${data.departamento},
        ${data.curso},
        ${data.siape},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        nome,
        email,
        instituicao,
        departamento,
        curso,
        siape,
        perfil,
        status,
        "criadoEm",
        "atualizadoEm"
    `;

    return converterRegistroBanco(registros[0]);
  }
}
