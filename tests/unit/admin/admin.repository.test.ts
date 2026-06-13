import { prisma } from "@/config/db";

import { UserRepository } from "../../../src/modules/admin/admin.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    usuario: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as jest.Mock;
const findManyMock = prisma.usuario.findMany as jest.Mock;
const countMock = prisma.usuario.count as jest.Mock;
const findUniqueMock = prisma.usuario.findUnique as jest.Mock;
const updateMock = prisma.usuario.update as jest.Mock;

describe("UserRepository", () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
    jest.clearAllMocks();
  });

  test("listar busca usuarios paginados sem senha", async () => {
    const usuarios = [{ id: "user-1", nome: "Maria" }];
    findManyMock.mockReturnValue("findMany-operation");
    countMock.mockReturnValue("count-operation");
    transactionMock.mockResolvedValue([usuarios, 1]);

    await expect(repository.listar({ page: 2, limit: 10, skip: 10 })).resolves.toEqual({
      data: usuarios,
      total: 1,
    });

    expect(findManyMock).toHaveBeenCalledWith({
      omit: { senha: true },
      skip: 10,
      take: 10,
      orderBy: {
        criadoEm: "desc",
      },
    });
    expect(countMock).toHaveBeenCalledWith();
    expect(transactionMock).toHaveBeenCalledWith(["findMany-operation", "count-operation"]);
  });

  test("buscarPorId consulta usuario sem senha", async () => {
    const usuario = { id: "user-1", nome: "Maria" };
    findUniqueMock.mockResolvedValue(usuario);

    await expect(repository.buscarPorId("user-1")).resolves.toBe(usuario);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      omit: { senha: true },
    });
  });

  test("atualizarStatus altera apenas o status quando nao ha aprovador", async () => {
    const usuario = { id: "user-1", status: "INATIVO" };
    updateMock.mockResolvedValue(usuario);

    await expect(repository.atualizarStatus("user-1", "INATIVO")).resolves.toBe(usuario);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        status: "INATIVO",
      },
      omit: { senha: true },
    });
  });

  test("atualizarStatus registra aprovador quando informado", async () => {
    const usuario = { id: "user-1", status: "ATIVO", aprovadoPorId: "admin-1" };
    updateMock.mockResolvedValue(usuario);

    await expect(repository.atualizarStatus("user-1", "ATIVO", "admin-1")).resolves.toBe(usuario);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        status: "ATIVO",
        aprovadoPorId: "admin-1",
        aprovadoEm: expect.any(Date),
      },
      omit: { senha: true },
    });
  });
});
