import { Router } from "express";

import { PAPEIS } from "@/shared/constants/papeis";
import { middlewarePapeis } from "@/shared/middlewares/papeis.middleware";
import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";

import { UsuariosController } from "./usuarios.controller";
import { UsuariosRepository } from "./usuarios.repository";
import {
  schemaBuscarAlunos,
  schemaBuscarUsuarioPorId,
  schemaBuscarUsuariosPorIds,
} from "./usuarios.schemas";
import { UsuariosService } from "./usuarios.service";

// Rotas de usuarios. Compoe as dependencias e registra as buscas; algumas restritas
// a gestao (professor/admin) e outras abertas a qualquer usuario autenticado.
const usuariosRepository = new UsuariosRepository();
const usuariosService = new UsuariosService(usuariosRepository);
const usuariosController = new UsuariosController(usuariosService);

const usuariosRouter = Router();

// Guarda de papel para as rotas que so a gestao pode acessar.
const apenasGestao = middlewarePapeis(PAPEIS.PROFESSOR, PAPEIS.ADMINISTRADOR);

// Busca de alunos: restrita a gestao.
usuariosRouter.get(
  "/alunos",
  apenasGestao,
  validarRequisicao(schemaBuscarAlunos, "query"),
  usuariosController.buscarAlunos,
);

usuariosRouter.get(
  "/",
  apenasGestao,
  validarRequisicao(schemaBuscarUsuariosPorIds, "query"),
  usuariosController.buscarPorIds,
);

// Lista de alunos com perfil visivel — base do ranking geral.
// Acessivel a qualquer usuario autenticado (inclusive alunos).
usuariosRouter.get("/visiveis", usuariosController.buscarVisiveis);

// Busca publica por id: acessivel a qualquer papel autenticado.
// Retorna apenas { id, nome, papel } — sem dados sensiveis.
usuariosRouter.get(
  "/:id",
  validarRequisicao(schemaBuscarUsuarioPorId, "params"),
  usuariosController.buscarPorIdPublico,
);

export { usuariosRouter };
