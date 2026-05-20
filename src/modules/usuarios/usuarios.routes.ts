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

const usuariosRepository = new UsuariosRepository();
const usuariosService = new UsuariosService(usuariosRepository);
const usuariosController = new UsuariosController(usuariosService);

const usuariosRouter = Router();

const apenasGestao = middlewarePapeis(PAPEIS.PROFESSOR, PAPEIS.ADMINISTRADOR);

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

// Busca publica por id: acessivel a qualquer papel autenticado.
// Retorna apenas { id, nome, papel } — sem dados sensiveis.
usuariosRouter.get(
  "/:id",
  validarRequisicao(schemaBuscarUsuarioPorId, "params"),
  usuariosController.buscarPorIdPublico,
);

export { usuariosRouter };
