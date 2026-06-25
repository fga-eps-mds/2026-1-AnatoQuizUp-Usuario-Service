import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { PAPEIS } from "@/shared/constants/papeis";

import type { AlunoVisivelDto } from "./dto/usuario.types";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";
import type { UsuariosRepository } from "./usuarios.repository";

const alunoVisivel: AlunoVisivelDto = {
  id: "a1",
  nome: "Joao Silva",
  nickname: "joao",
  curso: "Medicina",
  semestre: "3",
};

describe("UsuariosService.buscarAlunosVisiveis", () => {
  test("delega ao repositorio repassando incluirPrivados", async () => {
    const repository = {
      buscarAlunosVisiveis: jest.fn().mockResolvedValue([alunoVisivel]),
    } as unknown as jest.Mocked<UsuariosRepository>;
    const service = new UsuariosService(repository);

    await expect(service.buscarAlunosVisiveis(true)).resolves.toEqual([alunoVisivel]);
    expect(repository.buscarAlunosVisiveis).toHaveBeenCalledWith(true);
  });

  test("usa false como padrao", async () => {
    const repository = {
      buscarAlunosVisiveis: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<UsuariosRepository>;
    const service = new UsuariosService(repository);

    await service.buscarAlunosVisiveis();

    expect(repository.buscarAlunosVisiveis).toHaveBeenCalledWith(false);
  });
});

describe("UsuariosController.buscarVisiveis", () => {
  const next = jest.fn() as NextFunction;
  let service: jest.Mocked<UsuariosService>;
  let controller: UsuariosController;

  function criarResponseMock() {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { response: { status } as unknown as Response, status, json };
  }

  beforeEach(() => {
    service = {
      buscarAlunosVisiveis: jest.fn(),
    } as unknown as jest.Mocked<UsuariosService>;
    controller = new UsuariosController(service);
    jest.clearAllMocks();
  });

  test("aluno nao recebe privados mesmo pedindo incluirPrivados", async () => {
    service.buscarAlunosVisiveis.mockResolvedValue([alunoVisivel]);
    const request = {
      usuario: { papel: PAPEIS.ALUNO },
      query: { incluirPrivados: "true" },
    } as unknown as Request;
    const { response, status, json } = criarResponseMock();

    await controller.buscarVisiveis(request, response, next);

    expect(service.buscarAlunosVisiveis).toHaveBeenCalledWith(false);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.usuariosEncontrados,
      dados: [alunoVisivel],
    });
  });

  test("professor recebe privados quando incluirPrivados=true", async () => {
    service.buscarAlunosVisiveis.mockResolvedValue([]);
    const request = {
      usuario: { papel: PAPEIS.PROFESSOR },
      query: { incluirPrivados: "true" },
    } as unknown as Request;
    const { response } = criarResponseMock();

    await controller.buscarVisiveis(request, response, next);

    expect(service.buscarAlunosVisiveis).toHaveBeenCalledWith(true);
  });

  test("admin sem incluirPrivados usa false", async () => {
    service.buscarAlunosVisiveis.mockResolvedValue([]);
    const request = {
      usuario: { papel: PAPEIS.ADMINISTRADOR },
      query: {},
    } as unknown as Request;
    const { response } = criarResponseMock();

    await controller.buscarVisiveis(request, response, next);

    expect(service.buscarAlunosVisiveis).toHaveBeenCalledWith(false);
  });

  test("sem usuario autenticado usa false", async () => {
    service.buscarAlunosVisiveis.mockResolvedValue([]);
    const request = { query: { incluirPrivados: "true" } } as unknown as Request;
    const { response } = criarResponseMock();

    await controller.buscarVisiveis(request, response, next);

    expect(service.buscarAlunosVisiveis).toHaveBeenCalledWith(false);
  });

  test("encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha");
    service.buscarAlunosVisiveis.mockRejectedValue(erro);
    const request = {
      usuario: { papel: PAPEIS.PROFESSOR },
      query: {},
    } as unknown as Request;
    const { response } = criarResponseMock();

    await controller.buscarVisiveis(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});
