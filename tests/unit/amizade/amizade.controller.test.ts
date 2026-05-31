import type { Request, Response, NextFunction } from "express";

import { AmizadesController } from "@/modules/amizade/amizade.controller";
import type { AmizadesService } from "@/modules/amizade/amizade.service";
import type { MetadadosPaginacao } from "@/shared/types/api.types";

function criarResponseMock<T>() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  return {
    response: { status } as unknown as Response<T>,
    status,
    json,
  };
}

describe("Testa Amizades Controller", () => {
  let controller: AmizadesController;
  let amizadeService: jest.Mocked<AmizadesService>;

  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    amizadeService = {
      listarAmigos: jest.fn(),
      buscarAmigos: jest.fn(),
      enviarSolicitacao: jest.fn(),
      listarConvites: jest.fn(),
      processarSolicitacao: jest.fn(),
      desfazerAmizade: jest.fn(),
      mudarVisibilidade: jest.fn(),
    } as unknown as jest.Mocked<AmizadesService>;

    controller = new AmizadesController(amizadeService);

    jest.clearAllMocks();
  });

  describe("listarAmigos", () => {
    test("deve listar amigos com sucesso", async () => {
      const request = {
        query: { page: "1", limit: "10" },
        usuario: { id: "usuario-1" },
      } as unknown as Request;

      const { response, status } = criarResponseMock();

      await controller.listarAmigos(request, response, next);

      expect(amizadeService.listarAmigos).toHaveBeenCalledWith(request.query, "usuario-1");

      expect(status).toHaveBeenCalledWith(200);
    });

    test("deve usar string vazia quando usuario não existir", async () => {
      amizadeService.listarAmigos.mockResolvedValue({
        dados: [],
        metadados: {} as MetadadosPaginacao,
      });

      const request = {
        query: {},
      } as Request;

      const { response } = criarResponseMock();

      await controller.listarAmigos(request, response, next);

      expect(amizadeService.listarAmigos).toHaveBeenCalledWith({}, "");
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.listarAmigos.mockRejectedValue(erro);

      const request = {} as Request;
      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.listarAmigos(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("buscarAmigos", () => {
    test("deve buscar amigos com sucesso", async () => {
      const request = {
        query: { nome: "João" },
        usuario: { id: "usuario-1" },
      } as unknown as Request;

      const { response, status } = criarResponseMock();

      await controller.buscarAmigos(request, response, next);

      expect(amizadeService.buscarAmigos).toHaveBeenCalledWith(request.query, "usuario-1");

      expect(status).toHaveBeenCalledWith(200);
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.buscarAmigos.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.buscarAmigos(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("enviarSolicitacao", () => {
    test("deve enviar solicitação com sucesso", async () => {
      const body = {
        usuarioId: "usuario-2",
      };

      const solicitacaoMock = {
        id: "solicitacao-1",
      };

      amizadeService.enviarSolicitacao.mockResolvedValue(solicitacaoMock);

      const request = {
        body,
        usuario: {
          id: "usuario-1",
        },
      } as Request;

      const { response, status, json } = criarResponseMock();

      await controller.enviarSolicitacao(request, response, next);

      expect(amizadeService.enviarSolicitacao).toHaveBeenCalledWith(body, "usuario-1");

      expect(status).toHaveBeenCalledWith(200);

      expect(json).toHaveBeenCalledWith({
        mensagem: "Solicitação enviada com sucesso",
        solicitacao: solicitacaoMock,
      });
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.enviarSolicitacao.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.enviarSolicitacao(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("listarConvites", () => {
    test("deve listar convites com sucesso", async () => {
      const request = {
        query: { page: "1" },
        path: "/amizades/recebidos",
        usuario: {
          id: "usuario-1",
        },
      } as unknown as Request;

      const { response, status } = criarResponseMock();

      await controller.listarConvites(request, response, next);

      expect(amizadeService.listarConvites).toHaveBeenCalledWith(
        request.query,
        request.path,
        "usuario-1",
      );

      expect(status).toHaveBeenCalledWith(200);
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.listarConvites.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.listarConvites(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("processarSolicitacao", () => {
    test("deve processar solicitação com sucesso", async () => {
      const body = {
        solicitacaoId: "1",
      };

      const request = {
        body,
        path: "/aceitar",
        usuario: {
          id: "usuario-1",
        },
      } as Request;

      const { response, status, json } = criarResponseMock();

      await controller.processarSolicitacao(request, response, next);

      expect(amizadeService.processarSolicitacao).toHaveBeenCalledWith(
        body,
        "usuario-1",
        "/aceitar",
      );

      expect(status).toHaveBeenCalledWith(200);

      expect(json).toHaveBeenCalledWith({
        mensagem: "Solicitação processada com sucesso",
      });
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.processarSolicitacao.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.processarSolicitacao(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("desfazerAmizade", () => {
    test("deve desfazer amizade com sucesso", async () => {
      const body = {
        amigoId: "amigo-1",
      };

      const request = {
        body,
        usuario: {
          id: "usuario-1",
        },
      } as Request;

      const { response, status, json } = criarResponseMock();

      await controller.desfazerAmizade(request, response, next);

      expect(amizadeService.desfazerAmizade).toHaveBeenCalledWith(body, "usuario-1");

      expect(status).toHaveBeenCalledWith(200);

      expect(json).toHaveBeenCalledWith({
        mensagem: "Amizade desfeita com sucesso",
      });
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.desfazerAmizade.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.desfazerAmizade(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });

  describe("mudarVisibilidade", () => {
    test("deve alterar visibilidade com sucesso", async () => {
      const request = {
        usuario: {
          id: "usuario-1",
        },
      } as Request;

      const { response, status, json } = criarResponseMock();

      await controller.mudarVisibilidade(request, response, next);

      expect(amizadeService.mudarVisibilidade).toHaveBeenCalledWith("usuario-1");

      expect(status).toHaveBeenCalledWith(200);

      expect(json).toHaveBeenCalledWith({
        mensagem: "Visibilidade alterada com sucesso",
      });
    });

    test("deve chamar next quando ocorrer erro", async () => {
      const erro = new Error("erro");

      amizadeService.mudarVisibilidade.mockRejectedValue(erro);

      const request = {} as Request;

      const { response } = criarResponseMock();
      const nextMock = jest.fn();

      await controller.mudarVisibilidade(request, response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(erro);
    });
  });
});
