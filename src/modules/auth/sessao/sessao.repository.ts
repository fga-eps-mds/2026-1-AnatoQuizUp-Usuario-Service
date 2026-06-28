import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";
import { VALOR_NAO_SE_APLICA } from "@/modules/auth/aluno/aluno.constants";
import type { Papel } from "@/shared/constants/papeis";
import { PAPEIS } from "@/shared/constants/papeis";
import type { Status } from "@/shared/constants/status";

// Repository de sessao: acessa diretamente o banco (via SQL cru do Prisma) para
// autenticacao e gestao de refresh tokens. Faz a traducao entre o modelo do banco
// (colunas em PT, perfil "ADMIN") e o modelo de dominio usado pela aplicacao.

// Valor de perfil como esta gravado no banco.
type PerfilBanco = "ALUNO" | "PROFESSOR" | "ADMIN";

// Usuario no formato de dominio (usado pela camada de servico).
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

// Usuario exatamente como vem do banco (nomes de coluna e perfil originais).
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

/**
 * Traduz o perfil do banco para o papel usado no dominio.
 *
 * No banco o administrador e gravado como "ADMIN"; no dominio usamos ADMINISTRADOR.
 *
 * @param perfil Perfil como gravado no banco.
 * @returns Papel correspondente no dominio.
 */
function converterPerfilParaPapel(perfil: PerfilBanco): Papel {
  if (perfil === "ADMIN") {
    return PAPEIS.ADMINISTRADOR;
  }

  return perfil;
}

/**
 * Converte o registro cru do banco para o modelo de dominio UsuarioSessao.
 *
 * Renomeia campos (ex.: senha -> senhaHash, semestre -> periodo) e deriva
 * semVinculoAcademico a partir dos campos academicos marcados como "nao se aplica".
 *
 * @param usuario Registro do usuario vindo do banco.
 * @returns Usuario no formato de dominio.
 */
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
  /**
   * Busca um usuario pelo email (usado no login).
   *
   * @param email Email informado na autenticacao.
   * @returns Usuario de dominio, ou null se nao encontrado.
   */
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

  /**
   * Busca um usuario pelo id (usado ao renovar/validar a sessao).
   *
   * @param id Identificador do usuario.
   * @returns Usuario de dominio, ou null se nao encontrado.
   */
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

  /**
   * Persiste um novo refresh token associado ao usuario.
   *
   * @param usuarioId Dono do token.
   * @param token Valor do refresh token a salvar.
   * @param expiraEm Momento de expiracao do token.
   */
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

  /**
   * Recupera um refresh token pelo seu valor (para validar/rotacionar).
   *
   * @param token Valor do refresh token.
   * @returns O token encontrado, ou null se nao existir.
   */
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

  /**
   * Rotaciona o refresh token de forma atomica: revoga o antigo e cria um novo.
   *
   * Tudo roda numa transacao para evitar janela em que os dois tokens coexistam.
   * Se o token antigo ja estava revogado/inexistente, nada e criado e retorna false
   * (sinal de possivel reuso indevido de token).
   *
   * @param tokenAntigo Token atual a ser revogado.
   * @param usuarioId Dono do token.
   * @param novoToken Novo token a ser persistido.
   * @param novoTokenExpiraEm Expiracao do novo token.
   * @returns true se a rotacao ocorreu; false se o token antigo nao era valido.
   */
  async rotacionarRefreshToken(
    tokenAntigo: string,
    usuarioId: string,
    novoToken: string,
    novoTokenExpiraEm: Date,
  ): Promise<boolean> {
    return prisma.$transaction(async (transacao) => {
      // Revoga o token antigo apenas se ainda estiver ativo.
      const tokensRevogados = await transacao.$executeRaw`
        UPDATE refresh_tokens
        SET "revogadoEm" = NOW()
        WHERE token = ${tokenAntigo}
          AND "revogadoEm" IS NULL
      `;

      // Nenhuma linha afetada: token ja revogado ou inexistente, aborta a rotacao.
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

  /**
   * Revoga um refresh token especifico do usuario (usado no logout).
   *
   * @param token Token a revogar.
   * @param usuarioId Dono do token, para garantir que so o proprio revoga.
   * @returns true se algum token ativo foi revogado; false caso contrario.
   */
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
