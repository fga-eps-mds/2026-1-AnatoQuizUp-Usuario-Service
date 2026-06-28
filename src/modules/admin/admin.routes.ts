import { Router } from "express";

import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";

import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { UserRepository } from "./admin.repository";
import {
  schemaAlterarStatusUser,
  schemaBuscarUserPorId,
  schemaListarUsers,
} from "./admin.schemas";

// Rotas de administracao de usuarios. Compoe as dependencias e registra os endpoints
// de listagem, detalhe e alteracao de status, cada um com validacao por Zod.
const userRepository = new UserRepository();
const adminService = new AdminService(userRepository);
const adminController = new AdminController(adminService);

const adminRouter = Router();

adminRouter.get(
  "/usuarios",
  validarRequisicao(schemaListarUsers, "query"),
  adminController.listar,
);
adminRouter.get(
  "/usuarios/:id",
  validarRequisicao(schemaBuscarUserPorId, "params"),
  adminController.buscarPorId,
);
adminRouter.patch(
  "/usuarios/:id/status",
  validarRequisicao(schemaBuscarUserPorId, "params"),
  validarRequisicao(schemaAlterarStatusUser),
  adminController.alterarStatus,
);
export { adminRouter };
