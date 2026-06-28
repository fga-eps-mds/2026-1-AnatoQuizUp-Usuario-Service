import bcrypt from "bcryptjs";

import { jwtRefreshSecretKey } from "@/config/env";
import type {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RespostaLoginDto,
  RespostaRenovarSessaoDto,
  RespostaUsuarioAutenticadoDto,
  UsuarioSessaoDto,
} from "@/modules/auth/sessao/dto/login.types";
import type { SessaoRepository, UsuarioSessao } from "@/modules/auth/sessao/sessao.repository";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { STATUS } from "@/shared/constants/status";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import type { ValorCodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { PayloadAutenticacao } from "@/shared/types/autenticacao.types";
import { gerarRefreshToken, gerarTokenDeAcesso, verificarTokenJwt } from "@/shared/utils/jwt";

// Service de sessao: concentra login, consulta do usuario autenticado, renovacao
// (refresh) e logout. Gera/valida tokens JWT e delega a persistencia ao repository.

// Validade do refresh token, em dias, usada ao emitir/rotacionar tokens.
const DIAS_EXPIRACAO_REFRESH_TOKEN = 7;

/**
 * Soma dias a uma data, em UTC, sem alterar a data original.
 *
 * @param data Data base.
 * @param dias Quantidade de dias a somar.
 * @returns Nova data deslocada em "dias".
 */
function adicionarDias(data: Date, dias: number) {
  const novaData = new Date(data);
  novaData.setUTCDate(novaData.getUTCDate() + dias);
  return novaData;
}

// Atalho para erro 401 (nao autorizado) com mensagem customizada.
function criarErroNaoAutorizado(mensagem: string) {
  return new ErroAplicacao({
    codigoStatus: 401,
    codigo: CodigoDeErro.NAO_AUTORIZADO,
    mensagem,
  });
}

// Atalho para erro 403 (acesso proibido) com codigo/mensagem especificos.
function criarErroAcessoProibido(codigo: ValorCodigoDeErro, mensagem: string) {
  return new ErroAplicacao({
    codigoStatus: 403,
    codigo,
    mensagem,
  });
}

// Atalho para o erro padrao de token invalido/expirado (401).
function criarErroTokenInvalido() {
  return new ErroAplicacao({
    codigoStatus: 401,
    codigo: CodigoDeErro.TOKEN_INVALIDO,
    mensagem: MENSAGENS.tokenInvalido,
  });
}

/**
 * Garante que o status do usuario permite abrir/renovar sessao.
 *
 * Cada status bloqueado vira um 403 com codigo proprio, para o front exibir a
 * mensagem certa (cadastro em analise, conta desativada ou cadastro recusado).
 *
 * @param usuario Usuario que esta tentando autenticar.
 * @throws ErroAplicacao 403 quando o status nao permite sessao.
 */
function validarStatusUsuarioParaSessao(usuario: UsuarioSessao): void {
  if (usuario.status === STATUS.PENDENTE) {
    throw criarErroAcessoProibido(
      CodigoDeErro.CADASTRO_EM_ANALISE,
      MENSAGENS.cadastroEmAnalise,
    );
  }

  if (usuario.status === STATUS.INATIVO) {
    throw criarErroAcessoProibido(
      CodigoDeErro.CONTA_DESATIVADA,
      MENSAGENS.contaDesativada,
    );
  }

  if (usuario.status === STATUS.RECUSADO) {
    throw criarErroAcessoProibido(
      CodigoDeErro.CADASTRO_RECUSADO,
      MENSAGENS.cadastroRecusado,
    );
  }
}

// Extrai do usuario apenas os campos que vao dentro do JWT (payload minimo).
function criarPayloadAutenticacao(usuario: UsuarioSessao): PayloadAutenticacao {
  return {
    id: usuario.id,
    email: usuario.email,
    papel: usuario.papel,
    status: usuario.status,
  };
}

/**
 * Converte o usuario de dominio no DTO exposto ao cliente.
 *
 * Normaliza datas para string ISO (data de nascimento so com a parte de data) e
 * nao inclui campos sensiveis como o hash de senha.
 *
 * @param usuario Usuario de dominio.
 * @returns DTO de usuario seguro para retornar na resposta.
 */
function converterParaUsuarioSessaoDto(usuario: UsuarioSessao): UsuarioSessaoDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    nickname: usuario.nickname,
    email: usuario.email,
    papel: usuario.papel,
    status: usuario.status,
    instituicao: usuario.instituicao,
    curso: usuario.curso,
    periodo: usuario.periodo,
    semVinculoAcademico: usuario.semVinculoAcademico,
    dataNascimento: usuario.dataNascimento
      ? usuario.dataNascimento.toISOString().slice(0, 10)
      : null,
    nacionalidade: usuario.nacionalidade,
    cidade: usuario.cidade,
    estado: usuario.estado,
    escolaridade: usuario.escolaridade,
    departamento: usuario.departamento,
    siape: usuario.siape,
    aprovadoPorId: usuario.aprovadoPorId,
    aprovadoEm: usuario.aprovadoEm ? usuario.aprovadoEm.toISOString() : null,
    createdAt: usuario.createdAt.toISOString(),
    updatedAt: usuario.updatedAt.toISOString(),
    visivel: usuario.visivel,
  };
}

export class SessaoService {
  constructor(private readonly sessaoRepository: SessaoRepository) {}

  /**
   * Autentica o usuario por email e senha e emite os tokens da sessao.
   *
   * Mensagem de erro generica para email inexistente e senha errada (evita revelar
   * quais emails existem). Apos validar status, emite access + refresh token.
   *
   * @param input Credenciais de login (email e senha).
   * @returns Par de tokens (accessToken e refreshToken).
   * @throws ErroAplicacao 401/403 para credenciais invalidas ou status bloqueado.
   */
  async login(input: LoginDto): Promise<RespostaLoginDto> {
    // Normaliza o email (sem espacos, minusculo) para casar com o cadastro.
    const email = input.email.trim().toLowerCase();
    const usuario = await this.sessaoRepository.buscarUsuarioPorEmail(email);

    // Usuario inexistente ou excluido: erro generico de credenciais.
    if (!usuario || usuario.excluidoEm) {
      throw criarErroNaoAutorizado(MENSAGENS.credenciaisInvalidas);
    }

    // Compara a senha enviada com o hash armazenado.
    const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw criarErroNaoAutorizado(MENSAGENS.credenciaisInvalidas);
    }

    // Bloqueia login de contas pendentes/inativas/recusadas.
    validarStatusUsuarioParaSessao(usuario);

    const payload = criarPayloadAutenticacao(usuario);
    const accessToken = gerarTokenDeAcesso(payload);
    const refreshToken = gerarRefreshToken(payload);

    await this.sessaoRepository.salvarRefreshToken(
      usuario.id,
      refreshToken,
      adicionarDias(new Date(), DIAS_EXPIRACAO_REFRESH_TOKEN),
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Retorna os dados do usuario atualmente autenticado.
   *
   * @param usuarioId Id extraido do token de acesso.
   * @returns DTO do usuario autenticado.
   * @throws ErroAplicacao 401 se o usuario nao existir mais ou estiver excluido.
   */
  async obterUsuarioAutenticado(usuarioId: string): Promise<RespostaUsuarioAutenticadoDto> {
    const usuario = await this.sessaoRepository.buscarUsuarioPorId(usuarioId);

    if (!usuario || usuario.excluidoEm) {
      throw criarErroTokenInvalido();
    }

    return {
      usuario: converterParaUsuarioSessaoDto(usuario),
    };
  }

  /**
   * Renova a sessao a partir de um refresh token valido.
   *
   * Valida o token em camadas: assinatura JWT, existencia/nao-revogacao, expiracao
   * e correspondencia de dono. Em seguida revalida o status do usuario e rotaciona
   * o refresh token (o antigo e revogado e um novo e emitido).
   *
   * @param input DTO contendo o refresh token atual.
   * @returns Novo par de tokens (access + refresh).
   * @throws ErroAplicacao 401/403 para token invalido ou status bloqueado.
   */
  async renovarSessao(input: RefreshTokenDto): Promise<RespostaRenovarSessaoDto> {
    const refreshTokenAtual = input.refreshToken.trim();
    // Confere a assinatura/forma do token antes de tocar no banco.
    const payload = verificarTokenJwt(refreshTokenAtual, jwtRefreshSecretKey);
    const refreshTokenSalvo = await this.sessaoRepository.buscarRefreshToken(refreshTokenAtual);

    // Token precisa existir e nao ter sido revogado.
    if (!refreshTokenSalvo || refreshTokenSalvo.revogadoEm) {
      throw criarErroTokenInvalido();
    }

    // Token expirado nao renova sessao.
    if (refreshTokenSalvo.expiraEm.getTime() <= Date.now()) {
      throw criarErroTokenInvalido();
    }

    // O dono do token salvo deve bater com o id do payload assinado.
    if (refreshTokenSalvo.usuarioId !== payload.id) {
      throw criarErroTokenInvalido();
    }

    const usuario = await this.sessaoRepository.buscarUsuarioPorId(refreshTokenSalvo.usuarioId);

    if (!usuario || usuario.excluidoEm) {
      throw criarErroTokenInvalido();
    }

    // Revalida o status: o usuario pode ter sido desativado desde o ultimo login.
    validarStatusUsuarioParaSessao(usuario);

    const novoPayload = criarPayloadAutenticacao(usuario);
    const accessToken = gerarTokenDeAcesso(novoPayload);
    const refreshToken = gerarRefreshToken(novoPayload);
    const rotacionouToken = await this.sessaoRepository.rotacionarRefreshToken(
      refreshTokenAtual,
      usuario.id,
      refreshToken,
      adicionarDias(new Date(), DIAS_EXPIRACAO_REFRESH_TOKEN),
    );

    // Rotacao falha (ex.: token ja usado em paralelo) invalida a renovacao.
    if (!rotacionouToken) {
      throw criarErroTokenInvalido();
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Encerra a sessao revogando o refresh token informado.
   *
   * @param usuarioId Id do usuario autenticado (dono esperado do token).
   * @param input DTO contendo o refresh token a revogar.
   * @throws ErroAplicacao 401 se o token nao for valido/do usuario.
   */
  async logout(usuarioId: string, input: LogoutDto): Promise<void> {
    const refreshToken = input.refreshToken.trim();
    const refreshTokenSalvo = await this.sessaoRepository.buscarRefreshToken(refreshToken);

    // Token precisa existir, estar ativo e pertencer ao proprio usuario.
    if (
      !refreshTokenSalvo ||
      refreshTokenSalvo.revogadoEm ||
      refreshTokenSalvo.usuarioId !== usuarioId
    ) {
      throw criarErroTokenInvalido();
    }

    const tokenRevogado = await this.sessaoRepository.revogarRefreshToken(refreshToken, usuarioId);

    // Se nada foi revogado, o token ja nao era valido: sinaliza erro.
    if (!tokenRevogado) {
      throw criarErroTokenInvalido();
    }
  }
}
