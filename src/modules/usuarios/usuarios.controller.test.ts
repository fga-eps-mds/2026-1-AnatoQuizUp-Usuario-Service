import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type { ResumoUsuarioDto } from "./dto/usuario.types";
import { UsuariosController } from "./usuarios.controller";
import type { UsuariosService } from "./usuarios.service";

function criarResponseMock<T>() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  return {
    response: { status } as unknown as Response<T>,
    status,
    json,
  };
}

const alunoResumo: ResumoUsuarioDto = {
  id: "aluno-1",
  nome: "Joao Silva",
  nickname: "joao",
  email: "joao@example.com",
  perfil: "ALUNO",
  status: "ATIVO",
  instituicao: "UnB",
  curso: "Medicina",
  semestre: "2026.1",
};

describe("UsuariosController", () => {
  const next = jest.fn() as NextFunction;
  let service: jest.Mocked<UsuariosService>;
  let controller: UsuariosController;

  beforeEach(() => {
    service = {
      buscarAlunos: jest.fn(),
      buscarUsuariosPorIds: jest.fn(),
    } as unknown as jest.Mocked<UsuariosService>;
    controller = new UsuariosController(service);
    jest.clearAllMocks();
  });

  test("buscarAlunos responde com lista paginada", async () => {
    const resposta: RespostaPaginada<ResumoUsuarioDto> = {
      dados: [alunoResumo],
      metadados: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    service.buscarAlunos.mockResolvedValue(resposta);

    const request = {
      query: { busca: "joao", page: 1, limit: 10 },
    } as Request;
    const { response, status, json } = criarResponseMock<RespostaPaginada<ResumoUsuarioDto>>();

    await controller.buscarAlunos(request, response, next);

    expect(service.buscarAlunos).toHaveBeenCalledWith({ busca: "joao", page: 1, limit: 10 });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(resposta);
  });

  test("buscarPorIds responde com mensagem e dados", async () => {
    service.buscarUsuariosPorIds.mockResolvedValue([alunoResumo]);

    const request = {
      query: { ids: ["aluno-1"] },
    } as unknown as Request;
    const { response, status, json } = criarResponseMock<RespostaApiSucesso<ResumoUsuarioDto[]>>();

    await controller.buscarPorIds(request, response, next);

    expect(service.buscarUsuariosPorIds).toHaveBeenCalledWith(["aluno-1"]);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.usuariosEncontrados,
      dados: [alunoResumo],
    });
  });

  test("encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha");
    service.buscarUsuariosPorIds.mockRejectedValue(erro);

    const request = {
      query: { ids: ["aluno-1"] },
    } as unknown as Request;
    const { response } = criarResponseMock<RespostaApiSucesso<ResumoUsuarioDto[]>>();

    await controller.buscarPorIds(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});
