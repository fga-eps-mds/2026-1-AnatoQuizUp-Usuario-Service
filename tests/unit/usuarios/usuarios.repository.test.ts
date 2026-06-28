import { prisma } from "@/config/db";

import { UsuariosRepository } from "../../../src/modules/usuarios/usuarios.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    usuario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as jest.Mock;
const findManyMock = prisma.usuario.findMany as jest.Mock;
const findFirstMock = prisma.usuario.findFirst as jest.Mock;
const countMock = prisma.usuario.count as jest.Mock;

const selectResumoUsuario = {
  id: true,
  nome: true,
  nickname: true,
  email: true,
  perfil: true,
  status: true,
  instituicao: true,
  curso: true,
  semestre: true,
};

describe("UsuariosRepository", () => {
  let repository: UsuariosRepository;

  beforeEach(() => {
    repository = new UsuariosRepository();
    jest.clearAllMocks();
  });

  test("buscarAlunos consulta alunos ativos com filtro textual e paginacao", async () => {
    const alunos = [{ id: "aluno-1", nome: "Joao" }];
    findManyMock.mockReturnValue("findMany-operation");
    countMock.mockReturnValue("count-operation");
    transactionMock.mockResolvedValue([alunos, 1]);

    await expect(repository.buscarAlunos("joao", { page: 1, limit: 10, skip: 0 }))
      .resolves
      .toEqual({ data: alunos, total: 1 });

    const where = {
      perfil: "ALUNO",
      status: "ATIVO",
      excluidoEm: null,
      OR: [
        { nome: { contains: "joao", mode: "insensitive" } },
        { email: { contains: "joao", mode: "insensitive" } },
        { nickname: { contains: "joao", mode: "insensitive" } },
      ],
    };

    expect(findManyMock).toHaveBeenCalledWith({
      where,
      select: selectResumoUsuario,
      skip: 0,
      take: 10,
      orderBy: { nome: "asc" },
    });
    expect(countMock).toHaveBeenCalledWith({ where });
    expect(transactionMock).toHaveBeenCalledWith(["findMany-operation", "count-operation"]);
  });

  test("buscarAlunosPorIds consulta apenas alunos nao excluidos", async () => {
    const alunos = [{ id: "aluno-1", nome: "Joao" }];
    findManyMock.mockResolvedValue(alunos);

    await expect(repository.buscarAlunosPorIds(["aluno-1", "aluno-2"])).resolves.toBe(alunos);

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["aluno-1", "aluno-2"] },
        perfil: "ALUNO",
        excluidoEm: null,
      },
      select: selectResumoUsuario,
      orderBy: { nome: "asc" },
    });
  });

  test("buscarPorIdPublico retorna apenas id, nome e perfil de usuarios nao excluidos", async () => {
    const usuario = { id: "professor-1", nome: "Maria", perfil: "PROFESSOR" };
    findFirstMock.mockResolvedValue(usuario);

    await expect(repository.buscarPorIdPublico("professor-1")).resolves.toBe(usuario);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "professor-1",
        excluidoEm: null,
      },
      select: {
        id: true,
        nome: true,
        perfil: true,
      },
    });
  });

  test("buscarPorIdPublico retorna null quando usuario nao existe", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(repository.buscarPorIdPublico("inexistente")).resolves.toBeNull();
  });
});
