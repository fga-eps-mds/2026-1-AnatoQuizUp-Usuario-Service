import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import { AdminController } from "../../../src/modules/admin/admin.controller";
import type { AdminService } from "../../../src/modules/admin/admin.service";
import type { AlterarStatusUserDto } from "../../../src/modules/admin/dto/alterar.status_user.types";
import type { ListarUsersDto, ListarUsersQueryDto } from "../../../src/modules/admin/dto/listar.users.types";
import type { RespostaUserDto } from "../../../src/modules/admin/dto/resposta.user.types";

function criarUsuarioResposta(overrides: Partial<RespostaUserDto> = {}): RespostaUserDto {
  return {
    id: "user-1",
    nome: "Maria",
    nickname: "maria",
    email: "maria@example.com",
    perfil: "ALUNO",
    status: "ATIVO",
    instituicao: null,
    curso: null,
    semestre: null,
    estado: null,
    cidade: null,
    nacionalidade: null,
    dataNascimento: null,
    nivelEducacional: null,
    departamento: null,
    siape: null,
    aprovadoPorId: null,
    aprovadoEm: null,
    criadoEm: "2026-04-27T03:28:54.851Z",
    atualizadoEm: "2026-04-27T03:28:47.821Z",
    excluidoEm: null,
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

describe("AdminController", () => {
  const next = jest.fn() as NextFunction;
  let adminService: jest.Mocked<AdminService>;
  let controller: AdminController;

  beforeEach(() => {
    adminService = {
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      alterarStatus: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;
    controller = new AdminController(adminService);
    jest.clearAllMocks();
  });

  test("listar responde com paginação dos usuários", async () => {
    const dados = [criarUsuarioResposta()] as unknown as ListarUsersDto[];
    const respostaPaginada: RespostaPaginada<ListarUsersDto> = {
      dados,
      metadados: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    adminService.listar.mockResolvedValue(respostaPaginada);

    const request = {
      query: { page: 1, limit: 10 },
    } as Request<unknown, unknown, unknown, ListarUsersQueryDto>;
    const { response, status, json } = criarResponseMock<RespostaPaginada<ListarUsersDto>>();

    await controller.listar(request, response, next);

    expect(adminService.listar).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(respostaPaginada);
  });

  test("buscarPorId responde com mensagem e dados do usuário", async () => {
    const usuario = criarUsuarioResposta();
    adminService.buscarPorId.mockResolvedValue(usuario);

    const request = { params: { id: "user-1" } } as Request<{ id: string }>;
    const { response, status, json } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.buscarPorId(request, response, next);

    expect(adminService.buscarPorId).toHaveBeenCalledWith("user-1");
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.usuarioEncontrado,
      dados: usuario,
    });
  });

  test("alterarStatus extrai contexto do usuario autenticado e responde com sucesso", async () => {
    const usuario = criarUsuarioResposta({ status: "INATIVO" });
    adminService.alterarStatus.mockResolvedValue(usuario);

    const request = {
      params: { id: "user-1" },
      body: { status: "INACTIVE" } satisfies AlterarStatusUserDto,
      usuario: { id: "admin-1", email: "admin@example.com", papel: "ADMINISTRADOR" },
    } as unknown as Request<{ id: string }, unknown, AlterarStatusUserDto>;
    const { response, status, json } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.alterarStatus(request, response, next);

    expect(adminService.alterarStatus).toHaveBeenCalledWith(
      "user-1",
      { status: "INACTIVE" },
      { id: "admin-1", perfil: "ADMIN" },
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.usuarioStatusAlterado,
      dados: usuario,
    });
  });
  test("listar encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha ao listar");
    adminService.listar.mockRejectedValue(erro);

    const request = {
      query: { page: 1, limit: 10 },
    } as Request<unknown, unknown, unknown, ListarUsersQueryDto>;
    const { response } = criarResponseMock<RespostaPaginada<ListarUsersDto>>();

    await controller.listar(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  test("buscarPorId encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha ao buscar");
    adminService.buscarPorId.mockRejectedValue(erro);

    const request = { params: { id: "user-1" } } as Request<{ id: string }>;
    const { response } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.buscarPorId(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  test("alterarStatus ignora headers e usa usuario autenticado", async () => {
    const usuario = criarUsuarioResposta({ status: "INATIVO" });
    adminService.alterarStatus.mockResolvedValue(usuario);

    const request = {
      params: { id: "user-1" },
      body: { status: "INACTIVE" } satisfies AlterarStatusUserDto,
      usuario: { id: "admin-1", email: "admin@example.com", papel: "ADMINISTRADOR" },
      headers: {
        "x-user-id": ["outro-admin", "admin-1"],
        "x-user-papel": ["ALUNO", "ADMINISTRADOR"],
      },
    } as unknown as Request<{ id: string }, unknown, AlterarStatusUserDto>;
    const { response } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.alterarStatus(request, response, next);

    expect(adminService.alterarStatus).toHaveBeenCalledWith(
      "user-1",
      { status: "INACTIVE" },
      { id: "admin-1", perfil: "ADMIN" },
    );
  });

  test("alterarStatus normaliza contexto ausente ou nao admin", async () => {
    const usuario = criarUsuarioResposta({ status: "INATIVO" });
    adminService.alterarStatus.mockResolvedValue(usuario);

    const request = {
      params: { id: "user-1" },
      body: { status: "INACTIVE" } satisfies AlterarStatusUserDto,
      usuario: { id: "aluno-1", email: "aluno@example.com", papel: "ALUNO" },
    } as unknown as Request<{ id: string }, unknown, AlterarStatusUserDto>;
    const { response } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.alterarStatus(request, response, next);

    expect(adminService.alterarStatus).toHaveBeenCalledWith(
      "user-1",
      { status: "INACTIVE" },
      { id: "aluno-1", perfil: null },
    );
  });

  test("alterarStatus encaminha erro do service para o middleware", async () => {
    const erro = new Error("falha ao alterar status");
    adminService.alterarStatus.mockRejectedValue(erro);

    const request = {
      params: { id: "user-1" },
      body: { status: "INACTIVE" } satisfies AlterarStatusUserDto,
      headers: {},
    } as unknown as Request<{ id: string }, unknown, AlterarStatusUserDto>;
    const { response } = criarResponseMock<RespostaApiSucesso<RespostaUserDto>>();

    await controller.alterarStatus(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});
