import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type { ResumoUsuarioDto, UsuarioPublicoDto } from "./dto/usuario.types";
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
      buscarPorIdPublico: jest.fn(),
      atualizarDadosPessoais: jest.fn(),
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

  test("buscarPorIdPublico responde com payload publico minimo", async () => {
    const usuarioPublico: UsuarioPublicoDto = {
      id: "prof-1",
      nome: "Maria",
      papel: "PROFESSOR",
    };
    service.buscarPorIdPublico.mockResolvedValue(usuarioPublico);

    const request = {
      params: { id: "prof-1" },
    } as unknown as Request;
    const { response, status, json } = criarResponseMock<RespostaApiSucesso<UsuarioPublicoDto>>();

    await controller.buscarPorIdPublico(request, response, next);

    expect(service.buscarPorIdPublico).toHaveBeenCalledWith("prof-1");
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.usuarioEncontrado,
      dados: usuarioPublico,
    });
  });

  test("buscarPorIdPublico encaminha erro do service", async () => {
    const erro = new Error("falha");
    service.buscarPorIdPublico.mockRejectedValue(erro);

    const request = {
      params: { id: "x" },
    } as unknown as Request;
    const { response } = criarResponseMock<RespostaApiSucesso<UsuarioPublicoDto>>();

    await controller.buscarPorIdPublico(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  test("atualizarDadosPessoais usa usuario autenticado e responde com mensagem", async () => {
    service.atualizarDadosPessoais.mockResolvedValue({
      ...alunoResumo,
      nome: "Joao Novo",
      nickname: "joao_novo",
    });

    const request = {
      usuario: { id: "aluno-1", email: "joao@example.com", papel: "ALUNO" },
      body: { nome: "Joao Novo", nickname: "joao_novo" },
    } as unknown as Request;
    const { response, status, json } = criarResponseMock<RespostaApiSucesso<ResumoUsuarioDto>>();

    await controller.atualizarDadosPessoais(request, response, next);

    expect(service.atualizarDadosPessoais).toHaveBeenCalledWith("aluno-1", {
      nome: "Joao Novo",
      nickname: "joao_novo",
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      mensagem: MENSAGENS.dadosPessoaisAtualizados,
      dados: {
        ...alunoResumo,
        nome: "Joao Novo",
        nickname: "joao_novo",
      },
    });
  });

  test("atualizarDadosPessoais encaminha erro quando usuario autenticado nao existe", async () => {
    const request = {
      body: { nome: "Joao Novo" },
    } as unknown as Request;
    const { response } = criarResponseMock<RespostaApiSucesso<ResumoUsuarioDto>>();

    await controller.atualizarDadosPessoais(request, response, next);

    const erro = (next as jest.Mock).mock.calls[0][0];
    expect(erro).toBeInstanceOf(ErroAplicacao);
    expect(erro).toMatchObject({
      codigoStatus: 401,
      message: MENSAGENS.tokenInvalido,
    });
    expect(service.atualizarDadosPessoais).not.toHaveBeenCalled();
  });

  test("atualizarDadosPessoais encaminha erro do service", async () => {
    const erro = new Error("falha");
    service.atualizarDadosPessoais.mockRejectedValue(erro);

    const request = {
      usuario: { id: "aluno-1", email: "joao@example.com", papel: "ALUNO" },
      body: { nome: "Joao Novo" },
    } as unknown as Request;
    const { response } = criarResponseMock<RespostaApiSucesso<ResumoUsuarioDto>>();

    await controller.atualizarDadosPessoais(request, response, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});
