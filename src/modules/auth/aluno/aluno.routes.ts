import { Router } from "express";

import { AlunoAuthController } from "@/modules/auth/aluno/aluno.controller";
import { AlunoAuthRepository } from "@/modules/auth/aluno/aluno.repository";
import { alunoNacionalidadesRouter } from "@/modules/auth/aluno/nacionalidades/nacionalidades.routes";
import { alunoOpcoesAcademicasRouter } from "@/modules/auth/aluno/opcoes-academicas/opcoes-academicas.routes";
import {
  schemaDisponibilidadeEmailAluno,
  schemaDisponibilidadeNicknameAluno,
  schemaRegistrarAluno,
} from "@/modules/auth/aluno/aluno.schemas";
import { AlunoAuthService } from "@/modules/auth/aluno/aluno.service";
import { validarRequisicao } from "@/shared/middlewares/validacao.middleware";

// Rotas publicas de cadastro de aluno: checagens de disponibilidade, registro e os
// sub-routers de apoio ao formulario (nacionalidades, opcoes academicas).
const alunoAuthRepository = new AlunoAuthRepository();
const alunoAuthService = new AlunoAuthService(alunoAuthRepository);
const alunoAuthController = new AlunoAuthController(alunoAuthService);

const alunoAuthRouter = Router();

// Sub-routers que alimentam os selects do formulario de cadastro.
alunoAuthRouter.use("/alunos/nacionalidades", alunoNacionalidadesRouter);
alunoAuthRouter.use("/alunos/opcoes-academicas", alunoOpcoesAcademicasRouter);

alunoAuthRouter.get(
  "/alunos/nickname-disponivel",
  validarRequisicao(schemaDisponibilidadeNicknameAluno, "query"),
  alunoAuthController.verificarNicknameDisponivel,
);

alunoAuthRouter.get(
  "/alunos/email-disponivel",
  validarRequisicao(schemaDisponibilidadeEmailAluno, "query"),
  alunoAuthController.verificarEmailDisponivel,
);

alunoAuthRouter.post(
  "/cadastro",
  validarRequisicao(schemaRegistrarAluno),
  alunoAuthController.registrar,
);

export { alunoAuthRouter };
