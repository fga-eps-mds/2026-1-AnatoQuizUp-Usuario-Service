import { prisma } from "@/config/db";

import { ProfessorAuthRepository } from "../../../../src/modules/auth/professor/professor.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(() => "professor-1"),
}));

const queryRawMock = prisma.$queryRaw as jest.Mock;

describe("ProfessorAuthRepository", () => {
  let repository: ProfessorAuthRepository;

  beforeEach(() => {
    repository = new ProfessorAuthRepository();
    jest.clearAllMocks();
  });

  test("buscarPorEmail retorna registro encontrado", async () => {
    const professor = { id: "professor-1", email: "hilmer@unb.br" };
    queryRawMock.mockResolvedValueOnce([professor]);

    await expect(repository.buscarPorEmail("hilmer@unb.br")).resolves.toBe(professor);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  test("buscarPorEmail retorna null quando nao encontra", async () => {
    queryRawMock.mockResolvedValueOnce([]);

    await expect(repository.buscarPorEmail("hilmer@unb.br")).resolves.toBeNull();
  });

  test("buscarPorSiape retorna registro encontrado", async () => {
    const professor = { id: "professor-1", siape: "1234567" };
    queryRawMock.mockResolvedValueOnce([professor]);

    await expect(repository.buscarPorSiape("1234567")).resolves.toBe(professor);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  test("buscarPorSiape retorna null quando nao encontra", async () => {
    queryRawMock.mockResolvedValueOnce([]);

    await expect(repository.buscarPorSiape("1234567")).resolves.toBeNull();
  });

  test("criar insere professor e converte campos de resposta", async () => {
    const criadoEm = new Date("2026-05-10T10:00:00.000Z");
    const registroBanco = {
      id: "professor-1",
      nome: "Hilmer Rodrigues Neri",
      email: "hilmer@unb.br",
      instituicao: "UnB",
      departamento: "Anatomia",
      curso: "Medicina",
      siape: "1234567",
      perfil: "PROFESSOR",
      status: "PENDENTE",
      criadoEm,
      atualizadoEm: criadoEm,
    };
    queryRawMock.mockResolvedValueOnce([registroBanco]);

    await expect(
      repository.criar({
        nome: "Hilmer Rodrigues Neri",
        email: "hilmer@unb.br",
        senhaHash: "senha-hash",
        instituicao: "UnB",
        departamento: "Anatomia",
        curso: "Medicina",
        siape: "1234567",
        papel: "PROFESSOR",
        status: "PENDENTE",
      }),
    ).resolves.toEqual({
      id: "professor-1",
      nome: "Hilmer Rodrigues Neri",
      email: "hilmer@unb.br",
      instituicao: "UnB",
      departamento: "Anatomia",
      curso: "Medicina",
      siape: "1234567",
      papel: "PROFESSOR",
      status: "PENDENTE",
      criadoEm,
      atualizadoEm: criadoEm,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
