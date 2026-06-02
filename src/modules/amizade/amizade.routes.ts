import { Router } from "express";

import { PAPEIS } from "@/shared/constants/papeis";
import { middlewarePapeis } from "@/shared/middlewares/papeis.middleware";
import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";
import {
  schemaBuscarAlunosAmizade,
  schemaMudarVisibilidade,
  schemaSolicitarAmizade,
} from "./amizade.schema";
import { AmizadesController } from "./amizade.controller";
import { AmizadesRepository } from "./amizade.repository";
import { AmizadesService } from "./amizade.service";
import { UsuariosRepository } from "../usuarios/usuarios.repository";

const amizadesRepository = new AmizadesRepository();
const usuarioRepository = new UsuariosRepository();
const amizadesService = new AmizadesService(amizadesRepository, usuarioRepository);
const amizadesController = new AmizadesController(amizadesService);

const amizadeRouter = Router();
const permiteAlunosEAdmin = middlewarePapeis(PAPEIS.ALUNO, PAPEIS.ADMINISTRADOR);

// lista amigos
amizadeRouter.get(
  "/",
  permiteAlunosEAdmin,
  validarRequisicao(schemaBuscarAlunosAmizade, "query"),
  amizadesController.listarAmigos,
);

// busca possíveis amigos
amizadeRouter.get(
  "/busca",
  permiteAlunosEAdmin,
  validarRequisicao(schemaBuscarAlunosAmizade, "query"),
  amizadesController.buscarAmigos,
);

// enviar solicitação
amizadeRouter.post(
  "/",
  permiteAlunosEAdmin,
  validarRequisicao(schemaSolicitarAmizade, "body"),
  amizadesController.enviarSolicitacao,
);

// lista convites recebidos
amizadeRouter.get(
  "/convites/recebidos",
  permiteAlunosEAdmin,
  validarRequisicao(schemaBuscarAlunosAmizade, "query"),
  amizadesController.listarConvites,
);

// lista convites enviados
amizadeRouter.get(
  "/convites/enviados",
  permiteAlunosEAdmin,
  validarRequisicao(schemaBuscarAlunosAmizade, "query"),
  amizadesController.listarConvites,
);

//  aceitar convite
amizadeRouter.patch(
  "/aceitar",
  permiteAlunosEAdmin,
  validarRequisicao(schemaSolicitarAmizade, "body"),
  amizadesController.processarSolicitacao,
);

//  recusar convite
amizadeRouter.patch(
  "/recusar",
  permiteAlunosEAdmin,
  validarRequisicao(schemaSolicitarAmizade, "body"),
  amizadesController.processarSolicitacao,
);

//  desfazer amizade
amizadeRouter.delete(
  "/",
  permiteAlunosEAdmin,
  validarRequisicao(schemaSolicitarAmizade, "body"),
  amizadesController.desfazerAmizade,
);

//  alterar visibilidade
amizadeRouter.patch(
  "/visibilidade",
  permiteAlunosEAdmin,
  validarRequisicao(schemaMudarVisibilidade, "body"),
  amizadesController.mudarVisibilidade,
);

export { amizadeRouter };
