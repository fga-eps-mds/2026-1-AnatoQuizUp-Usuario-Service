import { Prisma } from "@prisma/client";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

import type { UsuariosRepository } from "./usuarios.repository";
import { UsuariosService } from "./usuarios.service";

const alunoResumo = {
  id: "aluno-1",
  nome: "Joao Silva",
  nickname: "joao",
  email: "joao@example.com",
  perfil: "ALUNO" as const,
  status: "ATIVO" as const,
  instituicao: "UnB",
  curso: "Medicina",
  semestre: "2026.1",
};

function criarErroCampoUnico(campo: string) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.17.1",
    meta: {
      target: [campo],
    },
  });
}

function criarErroCampoUnicoSql(campo: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code: "P2010",
    clientVersion: "6.17.1",
    meta: {
      code: "23505",
      message: `duplicate key value violates unique constraint "usuarios_${campo}_key"`,
    },
  });
}

function criarErroPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.17.1",
  });
}

describe("UsuariosService", () => {
  let repository: jest.Mocked<UsuariosRepository>;
  let service: UsuariosService;

  beforeEach(() => {
    repository = {
      buscarAlunos: jest.fn(),
      buscarAlunosPorIds: jest.fn(),
      buscarIdPorNickname: jest.fn(),
      atualizarDadosPessoais: jest.fn(),
      buscarPorIdPublico: jest.fn(),
    } as unknown as jest.Mocked<UsuariosRepository>;
    service = new UsuariosService(repository);
    jest.clearAllMocks();
  });

  test("buscarAlunos monta resposta paginada", async () => {
    repository.buscarAlunos.mockResolvedValue({
      data: [alunoResumo],
      total: 1,
    });

    const resposta = await service.buscarAlunos({ busca: "joao", page: 1, limit: 10 });

    expect(repository.buscarAlunos).toHaveBeenCalledWith("joao", {
      page: 1,
      limit: 10,
      skip: 0,
    });
    expect(resposta).toEqual({
      dados: [alunoResumo],
      metadados: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  test("buscarUsuariosPorIds retorna alunos resumidos", async () => {
    repository.buscarAlunosPorIds.mockResolvedValue([alunoResumo]);

    await expect(service.buscarUsuariosPorIds(["aluno-1"])).resolves.toEqual([alunoResumo]);

    expect(repository.buscarAlunosPorIds).toHaveBeenCalledWith(["aluno-1"]);
  });

  describe("buscarPorIdPublico", () => {
    test("retorna payload publico minimo convertendo ADMIN para ADMINISTRADOR", async () => {
      repository.buscarPorIdPublico.mockResolvedValue({
        id: "admin-1",
        nome: "Admin",
        perfil: "ADMIN",
      });

      await expect(service.buscarPorIdPublico("admin-1")).resolves.toEqual({
        id: "admin-1",
        nome: "Admin",
        papel: "ADMINISTRADOR",
      });
    });

    test("retorna papel PROFESSOR sem conversao", async () => {
      repository.buscarPorIdPublico.mockResolvedValue({
        id: "prof-1",
        nome: "Maria",
        perfil: "PROFESSOR",
      });

      await expect(service.buscarPorIdPublico("prof-1")).resolves.toEqual({
        id: "prof-1",
        nome: "Maria",
        papel: "PROFESSOR",
      });
    });

    test("lanca 404 quando usuario nao existe", async () => {
      repository.buscarPorIdPublico.mockResolvedValue(null);

      await expect(service.buscarPorIdPublico("inexistente")).rejects.toBeInstanceOf(
        ErroAplicacao,
      );
      await expect(service.buscarPorIdPublico("inexistente")).rejects.toMatchObject({
        codigoStatus: 404,
      });
    });

    test("nao expoe email nem dados sensiveis no payload", async () => {
      repository.buscarPorIdPublico.mockResolvedValue({
        id: "prof-1",
        nome: "Maria",
        perfil: "PROFESSOR",
      });

      const resposta = await service.buscarPorIdPublico("prof-1");

      expect(resposta).not.toHaveProperty("email");
      expect(resposta).not.toHaveProperty("senha");
      expect(resposta).not.toHaveProperty("instituicao");
      expect(resposta).not.toHaveProperty("status");
      expect(Object.keys(resposta).sort()).toEqual(["id", "nome", "papel"]);
    });
  });

  describe("atualizarDadosPessoais", () => {
    test("atualiza nome e nickname normalizados", async () => {
      repository.buscarIdPorNickname.mockResolvedValue(null);
      repository.atualizarDadosPessoais.mockResolvedValue({
        ...alunoResumo,
        nome: "Joao Silva Novo",
        nickname: "joao_novo",
      });

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nome: " Joao   Silva Novo ",
        nickname: " Joao_Novo ",
      })).resolves.toEqual({
        ...alunoResumo,
        nome: "Joao Silva Novo",
        nickname: "joao_novo",
      });

      expect(repository.buscarIdPorNickname).toHaveBeenCalledWith("joao_novo");
      expect(repository.atualizarDadosPessoais).toHaveBeenCalledWith("aluno-1", {
        nome: "Joao Silva Novo",
        nickname: "joao_novo",
      });
    });

    test("atualiza apenas nome sem consultar nickname", async () => {
      repository.atualizarDadosPessoais.mockResolvedValue({
        ...alunoResumo,
        nome: "Joao Novo",
      });

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nome: " Joao   Novo ",
      })).resolves.toEqual({
        ...alunoResumo,
        nome: "Joao Novo",
      });

      expect(repository.buscarIdPorNickname).not.toHaveBeenCalled();
      expect(repository.atualizarDadosPessoais).toHaveBeenCalledWith("aluno-1", {
        nome: "Joao Novo",
      });
    });

    test("permite manter nickname do proprio usuario", async () => {
      repository.buscarIdPorNickname.mockResolvedValue({ id: "aluno-1" });
      repository.atualizarDadosPessoais.mockResolvedValue(alunoResumo);

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nickname: "joao",
      })).resolves.toEqual(alunoResumo);

      expect(repository.atualizarDadosPessoais).toHaveBeenCalledWith("aluno-1", {
        nickname: "joao",
      });
    });

    test("rejeita nickname usado por outro usuario", async () => {
      repository.buscarIdPorNickname.mockResolvedValue({ id: "aluno-2" });

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nickname: "joao",
      })).rejects.toMatchObject({
        codigoStatus: 409,
        message: MENSAGENS.nicknameJaCadastrado,
        detalhes: { nickname: "joao" },
      });

      expect(repository.atualizarDadosPessoais).not.toHaveBeenCalled();
    });

    test("converte corrida de unicidade P2002 em conflito", async () => {
      repository.buscarIdPorNickname.mockResolvedValue(null);
      repository.atualizarDadosPessoais.mockRejectedValue(criarErroCampoUnico("nickname"));

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nickname: "joao",
      })).rejects.toMatchObject({
        codigoStatus: 409,
        message: MENSAGENS.nicknameJaCadastrado,
        detalhes: { nickname: "joao" },
      });
    });

    test("converte erro SQL de unicidade em conflito", async () => {
      repository.buscarIdPorNickname.mockResolvedValue(null);
      repository.atualizarDadosPessoais.mockRejectedValue(criarErroCampoUnicoSql("nickname"));

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nickname: "joao",
      })).rejects.toMatchObject({
        codigoStatus: 409,
        message: MENSAGENS.nicknameJaCadastrado,
        detalhes: { nickname: "joao" },
      });
    });

    test("converte usuario inexistente em 404", async () => {
      repository.atualizarDadosPessoais.mockRejectedValue(criarErroPrisma("P2025"));

      await expect(service.atualizarDadosPessoais("aluno-inexistente", {
        nome: "Joao Silva",
      })).rejects.toMatchObject({
        codigoStatus: 404,
        message: MENSAGENS.usuarioNaoEncontrado,
        detalhes: { id: "aluno-inexistente" },
      });
    });

    test("repropaga erro inesperado", async () => {
      const erro = new Error("falha inesperada");
      repository.atualizarDadosPessoais.mockRejectedValue(erro);

      await expect(service.atualizarDadosPessoais("aluno-1", {
        nome: "Joao Silva",
      })).rejects.toBe(erro);
    });
  });
});
