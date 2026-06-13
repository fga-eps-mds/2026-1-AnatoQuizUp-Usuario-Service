import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso } from "@/shared/types/api.types";

import type { RegistrarProfessorDto } from "../../../../src/modules/auth/professor/dto/registrar.professor.types";
import type { RespostaProfessorDto } from "../../../../src/modules/auth/professor/dto/resposta.professor.types";
import { ProfessorAuthController } from "../../../../src/modules/auth/professor/professor.controller";
import type { ProfessorAuthService } from "../../../../src/modules/auth/professor/professor.service";

function criarProfessorResposta(
  overrides: Partial<RespostaProfessorDto> = {},
): RespostaProfessorDto {
  return {
    id: "professor-1",
    nome: "Hilmer Rodrigues Neri",
    email: "hilmer@unb.br",
    instituicao: "UnB",
    departamento: "Anatomia",
    curso: "Medicina",
    siape: "1234567",
    papel: "PROFESSOR",
    status: "PENDENTE",
    criadoEm: "2026-05-10T10:00:00.000Z",
    atualizadoEm: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

function criarResponseMock<T>() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  return {
    response: { status } as unknown as Response<T>,
    status,
    json,
  };
}

describe("ProfessorAuthController", () => {
  const next = jest.fn() as NextFunction;
  let professorAuthService: jest.Mocked<ProfessorAuthService>;
  let controller: ProfessorAuthController;

  beforeEach(() => {
    professorAuthService = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<ProfessorAuthService>;
    controller = new ProfessorAuthController(professorAuthService);
    jest.clearAllMocks();
  });

  test("registrar responde com professor pendente", async () => {
    const professor = criarProfessorResposta();
    professorAuthService.registrar.mockResolvedValue(professor);

    const body = {
      nome: "Hilmer Rodrigues Neri",
      email: "hilmer@unb.br",
      siape: "1234567",
      instituicao: "UnB",
      departamento: "Anatomia",
      curso: "Medicina",
      senha: "senhaValida123",
      confirmacaoSenha: "senhaValida123",
    } satisfies RegistrarProfessorDto;
    const request = { body } as Request<unknown, unknown, RegistrarProfessorDto>;
    const { response, status, json } = criarResponseMock<
      RespostaApiSucesso<{ usuario: RespostaProfessorDto }>
    >();

    await controller.registrar(request, response, next);

    expect(professorAuthService.registrar).toHaveBeenCalledWith(body);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.professorCadastradoPendente,
      dados: {
        usuario: professor,
      },
    });
  });

  test("registrar encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha ao cadastrar");
    professorAuthService.registrar.mockRejectedValue(erro);

    const request = { body: {} } as Request<unknown, unknown, RegistrarProfessorDto>;
    const { response } = criarResponseMock<
      RespostaApiSucesso<{ usuario: RespostaProfessorDto }>
    >();

    await controller.registrar(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});
