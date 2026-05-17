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

describe("UsuariosService", () => {
  let repository: jest.Mocked<UsuariosRepository>;
  let service: UsuariosService;

  beforeEach(() => {
    repository = {
      buscarAlunos: jest.fn(),
      buscarAlunosPorIds: jest.fn(),
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
});
