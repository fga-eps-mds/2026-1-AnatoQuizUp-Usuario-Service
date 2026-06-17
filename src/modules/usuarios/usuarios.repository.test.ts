import { prisma } from "@/config/db";

import { UsuariosRepository } from "./usuarios.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    usuario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as jest.Mock;
const findManyMock = prisma.usuario.findMany as jest.Mock;
const findFirstMock = prisma.usuario.findFirst as jest.Mock;
const findUniqueMock = prisma.usuario.findUnique as jest.Mock;
const updateMock = prisma.usuario.update as jest.Mock;
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

  test("buscarIdPorNickname consulta usuario pelo nickname retornando apenas id", async () => {
    const usuario = { id: "aluno-1" };
    findUniqueMock.mockResolvedValue(usuario);

    await expect(repository.buscarIdPorNickname("joao")).resolves.toBe(usuario);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { nickname: "joao" },
      select: { id: true },
    });
  });

  test("atualizarDadosPessoais atualiza nome e nickname pelo id", async () => {
    const usuarioAtualizado = {
      id: "aluno-1",
      nome: "Joao Silva",
      nickname: "joao",
    };
    updateMock.mockResolvedValue(usuarioAtualizado);

    await expect(repository.atualizarDadosPessoais("aluno-1", {
      nome: "Joao Silva",
      nickname: "joao",
    })).resolves.toBe(usuarioAtualizado);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "aluno-1" },
      data: {
        nome: "Joao Silva",
        nickname: "joao",
      },
      select: selectResumoUsuario,
    });
  });

  test("buscarSenhaHashPorId consulta apenas o hash da senha", async () => {
    const usuario = { senha: "hash-atual" };
    findUniqueMock.mockResolvedValue(usuario);

    await expect(repository.buscarSenhaHashPorId("aluno-1")).resolves.toBe(usuario);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "aluno-1" },
      select: { senha: true },
    });
  });

  test("atualizarSenha persiste somente o novo hash da senha", async () => {
    updateMock.mockResolvedValue({});

    await expect(repository.atualizarSenha("aluno-1", "hash-novo")).resolves.toBeUndefined();

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "aluno-1" },
      data: { senha: "hash-novo" },
    });
  });
});
