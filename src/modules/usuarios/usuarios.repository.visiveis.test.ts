import { prisma } from "@/config/db";

import { UsuariosRepository } from "./usuarios.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    usuario: {
      findMany: jest.fn(),
    },
  },
}));

const findManyMock = prisma.usuario.findMany as jest.Mock;

const selectEsperado = {
  id: true,
  nome: true,
  nickname: true,
  curso: true,
  semestre: true,
};

describe("UsuariosRepository.buscarAlunosVisiveis", () => {
  let repository: UsuariosRepository;

  beforeEach(() => {
    repository = new UsuariosRepository();
    jest.clearAllMocks();
  });

  test("por padrao lista apenas alunos ativos e visiveis", async () => {
    findManyMock.mockResolvedValue([{ id: "a1" }]);

    const resultado = await repository.buscarAlunosVisiveis();

    expect(resultado).toEqual([{ id: "a1" }]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { perfil: "ALUNO", status: "ATIVO", visivel: true, excluidoEm: null },
      select: selectEsperado,
      orderBy: { nome: "asc" },
    });
  });

  test("inclui alunos privados quando incluirPrivados e true", async () => {
    findManyMock.mockResolvedValue([]);

    await repository.buscarAlunosVisiveis(true);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { perfil: "ALUNO", status: "ATIVO", excluidoEm: null },
      select: selectEsperado,
      orderBy: { nome: "asc" },
    });
  });
});
