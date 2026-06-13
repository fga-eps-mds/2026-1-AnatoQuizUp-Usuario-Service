import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

import type { UsuariosRepository } from "../../../src/modules/usuarios/usuarios.repository";
import { UsuariosService } from "../../../src/modules/usuarios/usuarios.service";

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

describe("UsuariosService", () => {
  let repository: jest.Mocked<UsuariosRepository>;
  let service: UsuariosService;

  beforeEach(() => {
    repository = {
      buscarAlunos: jest.fn(),
      buscarAlunosPorIds: jest.fn(),
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
});
