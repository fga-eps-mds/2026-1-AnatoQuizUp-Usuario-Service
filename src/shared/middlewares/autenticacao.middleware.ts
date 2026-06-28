import type { NextFunction, Request, Response } from "express";

import { prisma } from "@/config/db";
import { PAPEIS } from "@/shared/constants/papeis";
import type { Papel } from "@/shared/constants/papeis";
import { STATUS } from "@/shared/constants/status";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { PayloadAutenticacao } from "@/shared/types/autenticacao.types";
import { verificarTokenJwt } from "@/shared/utils/jwt";

// Middleware de autenticacao do Usuario-Service. Libera rotas publicas (login,
// cadastro, recuperacao) e, nas demais, valida o JWT, recarrega o usuario do banco
// (para refletir status/exclusao atuais) e anexa a identidade na requisicao.

// Rotas acessiveis sem token. Sao listadas com e sem o prefixo /api/v1 porque o
// caminho pode chegar de formas diferentes dependendo de como o request e montado.
const ROTAS_PUBLICAS = new Set([
  "/autenticacao/cadastro",
  "/autenticacao/cadastro/professor",
  "/autenticacao/login",
  "/autenticacao/recuperar-senha",
  "/autenticacao/redefinir-senha",
  "/autenticacao/atualizar-token",
  "/cadastro",
  "/cadastro/professor",
  "/login",
  "/redefinir-senha",
  "/recuperar-senha",
  "/atualizar-token",
]);

/**
 * Normaliza um caminho de rota para comparar com a lista de rotas publicas.
 *
 * Remove a query string e o prefixo /api/v1, deixando o caminho "limpo".
 *
 * @param caminho Caminho bruto da requisicao.
 * @returns Caminho normalizado (ou "" quando indefinido).
 */
function normalizarCaminho(caminho: string | undefined): string {
  if (!caminho) {
    return "";
  }

  const caminhoSemQuery = caminho.split("?")[0] ?? "";

  if (caminhoSemQuery.startsWith("/api/v1")) {
    return caminhoSemQuery.slice("/api/v1".length) || "/";
  }

  return caminhoSemQuery;
}

/**
 * Indica se a requisicao alvo e uma rota publica (dispensa autenticacao).
 *
 * Testa varias formas do caminho (path, originalUrl, url) por seguranca.
 *
 * @param request Requisicao a avaliar.
 * @returns true se qualquer variante do caminho estiver na lista publica.
 */
function ehRotaPublica(request: Request): boolean {
  const caminhos = [
    normalizarCaminho(request.path),
    normalizarCaminho(request.originalUrl),
    normalizarCaminho(request.url),
  ];

  return caminhos.some((caminho) => ROTAS_PUBLICAS.has(caminho));
}

// Traduz o perfil do banco ("ADMIN") para o papel de dominio (ADMINISTRADOR).
function converterPerfilParaPapel(perfil: string): Papel {
  if (perfil === "ADMIN") {
    return PAPEIS.ADMINISTRADOR;
  }

  return perfil as Papel;
}

/**
 * Extrai o token JWT do cabecalho Authorization (esquema Bearer).
 *
 * @param request Requisicao de onde o cabecalho e lido.
 * @returns O token sem o prefixo "Bearer ".
 * @throws ErroAplicacao 401 quando o cabecalho falta ou nao e Bearer.
 */
function obterTokenDoCabecalho(request: Request): string {
  const campoAuthorization = request.headers.authorization;

  if (!campoAuthorization) {
    throw new ErroAplicacao({
      mensagem: "Token não fornecido",
      codigo: CodigoDeErro.NENHUM_TOKEN_FORNECIDO,
      codigoStatus: 401,
    });
  }

  if (!campoAuthorization.startsWith("Bearer ")) {
    throw new ErroAplicacao({
      mensagem: "Token inválido",
      codigo: CodigoDeErro.TOKEN_INVALIDO,
      codigoStatus: 401,
    });
  }

  return campoAuthorization.replace("Bearer ", "");
}

/**
 * Garante que o status do usuario permite acessar rotas protegidas.
 *
 * ATIVO passa direto; os demais status viram 403 com codigo proprio.
 *
 * @param status Status atual do usuario.
 * @throws ErroAplicacao 403 quando o status nao for ATIVO.
 */
function validarStatusUsuario(status: string): void {
  if (status === STATUS.ATIVO) {
    return;
  }

  if (status === STATUS.PENDENTE) {
    throw new ErroAplicacao({
      mensagem: "Cadastro em análise",
      codigo: CodigoDeErro.CADASTRO_EM_ANALISE,
      codigoStatus: 403,
    });
  }

  if (status === STATUS.INATIVO) {
    throw new ErroAplicacao({
      mensagem: "Conta desativada",
      codigo: CodigoDeErro.CONTA_DESATIVADA,
      codigoStatus: 403,
    });
  }

  throw new ErroAplicacao({
    mensagem: "Cadastro recusado",
    codigo: CodigoDeErro.CADASTRO_RECUSADO,
    codigoStatus: 403,
  });
}

/**
 * Middleware que protege as rotas autenticadas do Usuario-Service.
 *
 * Fluxo: ignora rotas publicas; valida o token; recarrega o usuario do banco para
 * checar exclusao/status atuais (token sozinho nao basta); e, por fim, anexa a
 * identidade na requisicao em dois formatos (request.usuario e request.user) por
 * compatibilidade com diferentes partes do codigo.
 *
 * @param request Requisicao Express.
 * @param _response Resposta Express (nao usada aqui).
 * @param next Continua a cadeia, ou propaga o erro de autenticacao.
 * @throws ErroAplicacao 401/403 para token ou status invalidos.
 */
export async function middlewareAutenticacao(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  // Rotas publicas seguem sem qualquer verificacao.
  if (ehRotaPublica(request)) {
    return next();
  }

  // Valida a assinatura do token e extrai o payload.
  const token = obterTokenDoCabecalho(request);
  const payload: PayloadAutenticacao = verificarTokenJwt(token);

  // Recarrega o usuario para refletir o estado atual (pode ter sido excluido/inativado).
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      perfil: true,
      status: true,
      excluidoEm: true,
    },
  });

  // Usuario inexistente ou excluido invalida o token.
  if (!usuario || usuario.excluidoEm) {
    throw new ErroAplicacao({
      mensagem: "Token inválido",
      codigo: CodigoDeErro.TOKEN_INVALIDO,
      codigoStatus: 401,
    });
  }

  // Bloqueia status nao-ativos (pendente/inativo/recusado).
  validarStatusUsuario(usuario.status);

  const papel = converterPerfilParaPapel(usuario.perfil);

  // Identidade no formato em PT usado pela maior parte do codigo.
  request.usuario = {
    id: usuario.id,
    email: usuario.email,
    papel,
  };

  // Formato alternativo (em EN) mantido por compatibilidade com handlers legados.
  request.user = {
    userId: usuario.id,
    email: usuario.email,
    role: papel,
  };

  return next();
}
