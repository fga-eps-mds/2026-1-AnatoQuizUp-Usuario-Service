import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { env } from "@/config/env";
import type { RecuperarSenhaRepository } from "@/modules/auth/recuperar-senha/recuperar-senha.repository";
import type {
  RedefinirSenhaDto,
  SolicitarRecuperacaoSenhaDto,
} from "@/modules/auth/recuperar-senha/recuperar-senha.schemas";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import { enviarEmailRedefinicaoSenha } from "@/shared/services/emailService";

// Service de recuperacao de senha: gera token de redefinicao, envia o email e
// valida/consome o token na redefinicao efetiva.

const BCRYPT_SALT_ROUNDS = 10;
// Token de redefinicao vale 1 hora.
const VALIDADE_TOKEN_REDEFINICAO_SENHA_MS = 60 * 60 * 1000;

// Tipo da funcao de envio de email, injetavel para facilitar testes.
type EnviarEmailRedefinicaoSenha = typeof enviarEmailRedefinicaoSenha;

// Normaliza o email para casar com o cadastro (sem espacos, minusculo).
function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

// Monta o link do front com o token na query string (devidamente escapado).
function criarLinkRedefinicaoSenha(token: string) {
  return `${env.FRONTEND_PROD_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

// Token expira quando o instante de expiracao ja passou.
function tokenEstaExpirado(expiraEm: Date, agora: Date) {
  return expiraEm.getTime() <= agora.getTime();
}

export class RecuperarSenhaService {
  constructor(
    private readonly recuperarSenhaRepository: RecuperarSenhaRepository,
    private readonly enviarEmail: EnviarEmailRedefinicaoSenha = enviarEmailRedefinicaoSenha,
  ) {}

  /**
   * Inicia o fluxo de "esqueci a senha".
   *
   * Por seguranca nao revela se o email existe: se nao houver usuario, retorna sem
   * erro. Existindo, gera um token com validade e dispara o email com o link.
   *
   * @param input DTO com o email informado.
   */
  async forgotPassword(input: SolicitarRecuperacaoSenhaDto): Promise<void> {
    const email = normalizarEmail(input.email);
    const usuario = await this.recuperarSenhaRepository.buscarUsuarioPorEmail(email);

    // Email inexistente: encerra silenciosamente (nao expoe quais emails existem).
    if (!usuario) {
      return;
    }

    const token = randomUUID();
    const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_REDEFINICAO_SENHA_MS);

    await this.recuperarSenhaRepository.criarTokenRedefinicaoSenha({
      token,
      usuarioId: usuario.id,
      expiraEm,
    });

    await this.enviarEmail(usuario.email, criarLinkRedefinicaoSenha(token));
  }

  /**
   * Conclui a redefinicao de senha a partir de um token valido.
   *
   * Recusa token inexistente, ja usado ou expirado. Em seguida grava o novo hash e
   * marca o token como consumido de forma atomica (o repository so atualiza se o
   * token ainda estiver valido), prevenindo reuso.
   *
   * @param input DTO com o token e a nova senha.
   * @throws ErroAplicacao 400 quando o link/token e invalido.
   */
  async resetPassword(input: RedefinirSenhaDto): Promise<void> {
    const agora = new Date();
    const tokenRedefinicao = await this.recuperarSenhaRepository.buscarTokenRedefinicaoSenha(
      input.token,
    );

    // Token precisa existir, nao ter sido usado e nao estar expirado.
    if (
      !tokenRedefinicao ||
      tokenRedefinicao.usadoEm ||
      tokenEstaExpirado(tokenRedefinicao.expiraEm, agora)
    ) {
      throw this.criarErroLinkInvalido();
    }

    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_SALT_ROUNDS);
    const senhaAtualizada = await this.recuperarSenhaRepository.atualizarSenhaComToken({
      token: input.token,
      usuarioId: tokenRedefinicao.usuarioId,
      senhaHash,
      agora,
    });

    // Falha aqui indica corrida (token consumido em paralelo): trata como invalido.
    if (!senhaAtualizada) {
      throw this.criarErroLinkInvalido();
    }
  }

  // Erro 400 padronizado para link/token de redefinicao invalido ou expirado.
  private criarErroLinkInvalido() {
    return new ErroAplicacao({
      codigoStatus: 400,
      codigo: CodigoDeErro.TOKEN_INVALIDO,
      mensagem: MENSAGENS.linkRedefinicaoSenhaInvalido,
    });
  }
}
