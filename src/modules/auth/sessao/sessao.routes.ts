import { Router } from "express";

import { SessaoController } from "@/modules/auth/sessao/sessao.controller";
import { SessaoRepository } from "@/modules/auth/sessao/sessao.repository";
import {
  schemaLogin,
  schemaLogout,
  schemaRefreshToken,
} from "@/modules/auth/sessao/sessao.schemas";
import { SessaoService } from "@/modules/auth/sessao/sessao.service";
import { middlewareAutenticacao } from "@/shared/middlewares/autenticacao.middleware";
import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";

// Rotas de sessao. Compoe as dependencias (repository -> service -> controller) e
// registra os endpoints; login/atualizar-token sao publicos, os demais exigem token.
const sessaoRepository = new SessaoRepository();
const sessaoService = new SessaoService(sessaoRepository);
const sessaoController = new SessaoController(sessaoService);

const sessaoRouter = Router();

// Publicas: validam o corpo e nao exigem autenticacao previa.
sessaoRouter.post("/login", validarRequisicao(schemaLogin), sessaoController.login);
sessaoRouter.post(
  "/atualizar-token",
  validarRequisicao(schemaRefreshToken),
  sessaoController.renovarSessao,
);
// Protegidas: exigem usuario autenticado.
sessaoRouter.get(
  "/usuario-atual",
  middlewareAutenticacao,
  sessaoController.obterUsuarioAutenticado,
);
sessaoRouter.post(
  "/sair",
  middlewareAutenticacao,
  validarRequisicao(schemaLogout),
  sessaoController.logout,
);

export { sessaoRouter };
