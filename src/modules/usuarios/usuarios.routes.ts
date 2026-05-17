import { Router } from "express";

import { PAPEIS } from "@/shared/constants/papeis";
import { middlewarePapeis } from "@/shared/middlewares/papeis.middleware";
import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";

import { UsuariosController } from "./usuarios.controller";
import { UsuariosRepository } from "./usuarios.repository";
import {
  schemaBuscarAlunos,
  schemaBuscarUsuariosPorIds,
} from "./usuarios.schemas";
import { UsuariosService } from "./usuarios.service";

const usuariosRepository = new UsuariosRepository();
const usuariosService = new UsuariosService(usuariosRepository);
const usuariosController = new UsuariosController(usuariosService);

const usuariosRouter = Router();

usuariosRouter.use(middlewarePapeis(PAPEIS.PROFESSOR, PAPEIS.ADMINISTRADOR));

usuariosRouter.get(
  "/alunos",
  validarRequisicao(schemaBuscarAlunos, "query"),
  usuariosController.buscarAlunos,
);

usuariosRouter.get(
  "/",
  validarRequisicao(schemaBuscarUsuariosPorIds, "query"),
  usuariosController.buscarPorIds,
);

export { usuariosRouter };
