import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";
import { VALOR_NAO_SE_APLICA } from "@/modules/auth/aluno/aluno.constants";
import type { Papel } from "@/shared/constants/papeis";
import { PAPEIS } from "@/shared/constants/papeis";
import type { Status } from "@/shared/constants/status";

type PerfilBanco = "ALUNO" | "PROFESSOR" | "ADMIN";

export type UsuarioSessao = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  senhaHash: string;
  papel: Papel;
  status: Status;
  excluidoEm: Date | null;
  instituicao: string | null;
  curso: string | null;
  periodo: string | null;
  semVinculoAcademico: boolean;
  dataNascimento: Date | null;
  nacionalidade: string | null;
  cidade: string | null;
  estado: string | null;
  escolaridade: string | null;
  departamento: string | null;
  siape: string | null;
  aprovadoPorId: string | null;
  aprovadoEm: Date | null;
  createdAt: Date;
  updatedAt: Date;
  visivel: boolean;
};

export type RefreshTokenSessao = {
  token: string;
  usuarioId: string;
  expiraEm: Date;
  revogadoEm: Date | null;
};

type UsuarioSessaoBanco = {
  id: string;
  nome: string;
  nickname: string | null;
  email: string;
  senha: string;
  perfil: PerfilBanco;
  status: Status;
  excluidoEm: Date | null;
  instituicao: string | null;
  curso: string | null;
  semestre: string | null;
  dataNascimento: Date | null;
  nacionalidade: string | null;
  cidade: string | null;
  estado: string | null;
  nivelEducacional: string | null;
  departamento: string | null;
  siape: string | null;
  aprovadoPorId: string | null;
  aprovadoEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
  visivel: boolean;
};

type RefreshTokenSessaoBanco = {
  token: string;
  usuarioId: string;
  expiraEm: Date;
  revogadoEm: Date | null;
};

function converterPerfilParaPapel(perfil: PerfilBanco): Papel {
  if (perfil === "ADMIN") {
    return PAPEIS.ADMINISTRADOR;
  }

  return perfil;
}

function converterUsuarioBanco(usuario: UsuarioSessaoBanco): UsuarioSessao {
  return {
    id: usuario.id,
    nome: usuario.nome,
    nickname: usuario.nickname,
    email: usuario.email,
    senhaHash: usuario.senha,
    papel: converterPerfilParaPapel(usuario.perfil),
    status: usuario.status,
    excluidoEm: usuario.excluidoEm,
    instituicao: usuario.instituicao,
    curso: usuario.curso,
    periodo: usuario.semestre,
    semVinculoAcademico:
      usuario.instituicao === VALOR_NAO_SE_APLICA &&
      usuario.curso === VALOR_NAO_SE_APLICA &&
      usuario.semestre === VALOR_NAO_SE_APLICA,
    dataNascimento: usuario.dataNascimento,
    nacionalidade: usuario.nacionalidade,
    cidade: usuario.cidade,
    estado: usuario.estado,
    escolaridade: usuario.nivelEducacional,
    departamento: usuario.departamento,
    siape: usuario.siape,
    aprovadoPorId: usuario.aprovadoPorId,
    aprovadoEm: usuario.aprovadoEm,
    createdAt: usuario.criadoEm,
    updatedAt: usuario.atualizadoEm,
    visivel: usuario.visivel,
  };
}

export class SessaoRepository {
  async buscarUsuarioPorEmail(email: string): Promise<UsuarioSessao | null> {
    const registros = await prisma.$queryRaw<UsuarioSessaoBanco[]>`
      SELECT
        id,
        nome,
        nickname,
        email,
        senha,
        perfil,
        status,
        "excluidoEm",
        instituicao,
        curso,
        semestre,
        "dataNascimento",
        nacionalidade,
        cidade,
        estado,
        "nivelEducacional",
        departamento,
        siape,
        "aprovadoPorId",
        "aprovadoEm",
        "criadoEm",
        "atualizadoEm",
        visivel
      FROM usuarios
      WHERE email = ${email}
      LIMIT 1
    `;

    const usuario = registros[0];

    return usuario ? converterUsuarioBanco(usuario) : null;
  }

  async buscarUsuarioPorId(id: string): Promise<UsuarioSessao | null> {
    const registros = await prisma.$queryRaw<UsuarioSessaoBanco[]>`
      SELECT
        id,
        nome,
        nickname,
        email,
        senha,
        perfil,
        status,
        "excluidoEm",
        instituicao,
        curso,
        semestre,
        "dataNascimento",
        nacionalidade,
        cidade,
        estado,
        "nivelEducacional",
        departamento,
        siape,
        "aprovadoPorId",
        "aprovadoEm",
        "criadoEm",
        "atualizadoEm",
        visivel
      FROM usuarios
      WHERE id = ${id}
      LIMIT 1
    `;

    const usuario = registros[0];

    return usuario ? converterUsuarioBanco(usuario) : null;
  }

  async salvarRefreshToken(usuarioId: string, token: string, expiraEm: Date): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO refresh_tokens (
        id,
        token,
        "usuarioId",
        "expiraEm",
        "criadoEm"
      )
      VALUES (
        ${randomUUID()},
        ${token},
        ${usuarioId},
        ${expiraEm},
        NOW()
      )
    `;
  }

  async buscarRefreshToken(token: string): Promise<RefreshTokenSessao | null> {
    const registros = await prisma.$queryRaw<RefreshTokenSessaoBanco[]>`
      SELECT
        token,
        "usuarioId",
        "expiraEm",
        "revogadoEm"
      FROM refresh_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  async rotacionarRefreshToken(
    tokenAntigo: string,
    usuarioId: string,
    novoToken: string,
    novoTokenExpiraEm: Date,
  ): Promise<boolean> {
    return prisma.$transaction(async (transacao) => {
      const tokensRevogados = await transacao.$executeRaw`
        UPDATE refresh_tokens
        SET "revogadoEm" = NOW()
        WHERE token = ${tokenAntigo}
          AND "revogadoEm" IS NULL
      `;

      if (tokensRevogados === 0) {
        return false;
      }

      await transacao.$executeRaw`
        INSERT INTO refresh_tokens (
          id,
          token,
          "usuarioId",
          "expiraEm",
          "criadoEm"
        )
        VALUES (
          ${randomUUID()},
          ${novoToken},
          ${usuarioId},
          ${novoTokenExpiraEm},
          NOW()
        )
      `;

      return true;
    });
  }

  async revogarRefreshToken(token: string, usuarioId: string): Promise<boolean> {
    const tokensRevogados = await prisma.$executeRaw`
      UPDATE refresh_tokens
      SET "revogadoEm" = NOW()
      WHERE token = ${token}
        AND "usuarioId" = ${usuarioId}
        AND "revogadoEm" IS NULL
    `;

    return tokensRevogados > 0;
  }
}
