import { prisma } from "@/config/db";
import { AmizadesRepository } from "@/modules/amizade/amizade.repository";

jest.mock("@/config/db", () => ({
  prisma: {
    $transaction: jest.fn(),

    amizade: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },

    usuario: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as jest.Mock;

describe("AmizadesRepository", () => {
  let repository: AmizadesRepository;

  beforeEach(() => {
    repository = new AmizadesRepository();
    jest.clearAllMocks();
  });

  describe("listarAmigos", () => {
    test("deve listar amigos sem filtro de nome", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.listarAmigos("usuario-1", {}, { skip: 0, limit: 10, page: 1 });

      expect(prisma.amizade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statusAmizade: "ATIVO",
            excluidoEm: null,
            OR: expect.any(Array),
          }),
        }),
      );

      expect(prisma.amizade.count).toHaveBeenCalled();
    });

    test("deve aplicar filtro por nome", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.listarAmigos("usuario-1", { nome: "joao" }, { skip: 0, limit: 10, page: 1 });

      expect(prisma.amizade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe("buscarAmigos", () => {
    test("deve buscar amigos filtrando por nome", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.buscarAmigos("usuario-1", "ana", { skip: 0, limit: 5, page: 1 });

      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nome: {
              contains: "ana",
              mode: "insensitive",
            },
            id: { not: "usuario-1" },
          }),
        }),
      );

      expect(prisma.usuario.count).toHaveBeenCalled();
    });
  });

  describe("buscarSolicitacao", () => {
    test("deve buscar solicitação entre usuários", async () => {
      await repository.buscarSolicitacao("u1", "u2");

      expect(prisma.amizade.findUnique).toHaveBeenCalledWith({
        where: {
          usuarioOrigemId_usuarioDestinoId: {
            usuarioOrigemId: "u1",
            usuarioDestinoId: "u2",
          },
        },
      });
    });
  });

  describe("buscarPorSolicitacaoId", () => {
    test("deve buscar solicitação por id válida", async () => {
      await repository.buscarPorSolicitacaoId("sol-1");

      expect(prisma.amizade.findUnique).toHaveBeenCalledWith({
        where: {
          id: "sol-1",
          excluidoEm: null,
        },
      });
    });
  });

  describe("enviarSolicitacao", () => {
    test("deve criar solicitação de amizade", async () => {
      await repository.enviarSolicitacao("u1", "u2");

      expect(prisma.amizade.create).toHaveBeenCalledWith({
        data: {
          usuarioOrigemId: "u1",
          usuarioDestinoId: "u2",
        },
      });
    });
  });

  describe("listarConvites", () => {
    test("deve listar convites recebidos", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.listarConvites("u1", { skip: 0, limit: 10, page: 1 }, "recebidos");

      expect(prisma.amizade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioDestinoId: "u1",
            statusAmizade: "PENDENTE",
          }),
          include: expect.objectContaining({
            usuarioOrigem: expect.any(Object),
          }),
        }),
      );
    });

    test("deve listar convites enviados", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.listarConvites("u1", { skip: 0, limit: 10, page: 1 }, "enviados");

      expect(prisma.amizade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioOrigemId: "u1",
            statusAmizade: "PENDENTE",
          }),
          include: expect.objectContaining({
            usuarioDestino: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("listarConvitesEnviados", () => {
    test("deve listar convites enviados diretamente", async () => {
      transactionMock.mockResolvedValue([[], 0]);

      await repository.listarConvitesEnviados("u1", {
        skip: 0,
        limit: 10,
        page: 1,
      });

      expect(prisma.amizade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioOrigemId: "u1",
            statusAmizade: "PENDENTE",
          }),
        }),
      );
    });
  });

  describe("processarSolicitacao", () => {
    test("deve aceitar solicitação", async () => {
      await repository.processarSolicitacao("sol-1", "aceitar");

      expect(prisma.amizade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "sol-1",
            excluidoEm: null,
          },
          data: {
            statusAmizade: "ATIVO",
          },
        }),
      );
    });

    test("deve recusar solicitação", async () => {
      await repository.processarSolicitacao("sol-1", "recusar");

      expect(prisma.amizade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            statusAmizade: "RECUSADO",
          },
        }),
      );
    });
  });

  describe("desfazerAmizade", () => {
    test("deve marcar amizade como excluída", async () => {
      await repository.desfazerAmizade("sol-1");

      expect(prisma.amizade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "sol-1",
            excluidoEm: null,
          },
          data: {
            excluidoEm: expect.any(Date),
          },
        }),
      );
    });
  });

  describe("mudarVisibilidade", () => {
    test("deve atualizar visibilidade do usuário", async () => {
      await repository.mudarVisibilidade("u1", false);

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "u1",
            excluidoEm: null,
          },
          data: {
            visivel: false,
          },
        }),
      );
    });
  });

  describe("tratamento de erro", () => {
    test("deve propagar erro do prisma com mensagem original", async () => {
      prisma.amizade.update.mockRejectedValue(new Error("AMIZADE_NOT_FOUND"));

      await expect(repository.processarSolicitacao("invalido", "aceitar")).rejects.toThrow(
        "AMIZADE_NOT_FOUND",
      );
    });
  });
});
