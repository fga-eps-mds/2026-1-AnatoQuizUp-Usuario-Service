import { randomUUID } from "node:crypto";

import { prisma } from "@/config/db";

// Repository de recuperacao de senha: persiste/consulta tokens de redefinicao e
// aplica a troca de senha de forma atomica. Usa SQL cru do Prisma.

// Projecao minima do usuario usada no fluxo de recuperacao.
type UsuarioRecuperacaoSenha = {
  id: string;
  email: string;
};

// Token de redefinicao como armazenado (usadoEm marca consumo).
export type TokenRedefinicaoSenha = {
  token: string;
  usuarioId: string;
  expiraEm: Date;
  usadoEm: Date | null;
};

export type CriarTokenRedefinicaoSenhaData = {
  token: string;
  usuarioId: string;
  expiraEm: Date;
};

export type AtualizarSenhaComTokenData = {
  token: string;
  usuarioId: string;
  senhaHash: string;
  agora: Date;
};

export class RecuperarSenhaRepository {
  // Busca o usuario (nao excluido) pelo email para iniciar a recuperacao.
  async buscarUsuarioPorEmail(email: string): Promise<UsuarioRecuperacaoSenha | null> {
    const registros = await prisma.$queryRaw<UsuarioRecuperacaoSenha[]>`
      SELECT id, email
      FROM usuarios
      WHERE email = ${email}
        AND "excluidoEm" IS NULL
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  // Insere um novo token de redefinicao associado ao usuario.
  async criarTokenRedefinicaoSenha(data: CriarTokenRedefinicaoSenhaData): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO tokens_redefinicao_senha (
        id,
        token,
        "usuarioId",
        "expiraEm",
        "criadoEm"
      )
      VALUES (
        ${randomUUID()},
        ${data.token},
        ${data.usuarioId},
        ${data.expiraEm},
        NOW()
      )
    `;
  }

  // Recupera um token de redefinicao pelo seu valor (para validacao no service).
  async buscarTokenRedefinicaoSenha(token: string): Promise<TokenRedefinicaoSenha | null> {
    const registros = await prisma.$queryRaw<TokenRedefinicaoSenha[]>`
      SELECT
        token,
        "usuarioId",
        "expiraEm",
        "usadoEm"
      FROM tokens_redefinicao_senha
      WHERE token = ${token}
      LIMIT 1
    `;

    return registros[0] ?? null;
  }

  /**
   * Troca a senha do usuario consumindo o token, de forma atomica.
   *
   * Numa transacao, marca o token como usado SOMENTE se ainda estiver valido (nao
   * usado e nao expirado); so entao atualiza a senha. Isso evita reuso do mesmo
   * token por duas requisicoes simultaneas.
   *
   * @param data Token, usuario, novo hash de senha e instante atual.
   * @returns true se a senha foi efetivamente trocada; false caso contrario.
   */
  async atualizarSenhaComToken(data: AtualizarSenhaComTokenData): Promise<boolean> {
    const tokensAtualizados = await prisma.$transaction(async (transacao) => {
      // Marca o token como usado apenas se ainda for valido (corrida segura).
      const quantidadeTokensAtualizados = await transacao.$executeRaw`
        UPDATE tokens_redefinicao_senha
        SET "usadoEm" = ${data.agora}
        WHERE token = ${data.token}
          AND "usuarioId" = ${data.usuarioId}
          AND "usadoEm" IS NULL
          AND "expiraEm" > ${data.agora}
      `;

      // Token nao atualizado (ja usado/expirado): aborta sem mexer na senha.
      if (quantidadeTokensAtualizados !== 1) {
        return quantidadeTokensAtualizados;
      }

      // Token consumido com sucesso: agora sim grava a nova senha.
      await transacao.$executeRaw`
        UPDATE usuarios
        SET
          senha = ${data.senhaHash},
          "atualizadoEm" = ${data.agora}
        WHERE id = ${data.usuarioId}
      `;

      return quantidadeTokensAtualizados;
    });

    return tokensAtualizados === 1;
  }
}
