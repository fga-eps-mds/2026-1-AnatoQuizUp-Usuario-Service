import { AmizadesService } from "@/modules/amizade/amizade.service";
import type { AmizadesRepository } from "@/modules/amizade/amizade.repository";
import type { UsuariosRepository } from "@/modules/usuarios/usuarios.repository";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { MENSAGENS } from "@/shared/constants/mensagens";

function criarRepositoryMock() {
  return {
    listarAmigos: jest.fn<AmizadesRepository["listarAmigos"]>(),
    buscarAmigos: jest.fn<AmizadesRepository["buscarAmigos"]>(),
    buscarSolicitacao: jest.fn<AmizadesRepository["buscarSolicitacao"]>(),
    enviarSolicitacao: jest.fn<AmizadesRepository["enviarSolicitacao"]>(),
    listarConvites: jest.fn<AmizadesRepository["listarConvites"]>(),
    buscarPorSolicitacaoId: jest.fn<AmizadesRepository["buscarPorSolicitacaoId"]>(),
    processarSolicitacao: jest.fn<AmizadesRepository["processarSolicitacao"]>(),
    desfazerAmizade: jest.fn<AmizadesRepository["desfazerAmizade"]>(),
    mudarVisibilidade: jest.fn<AmizadesRepository["mudarVisibilidade"]>(),
  } as unknown as jest.Mocked<AmizadesRepository>;
}

function criarUsuariosRepositoryMock() {
  return {
    buscarAlunoPorId: jest.fn<UsuariosRepository["buscarAlunoPorId"]>(),
  } as unknown as jest.Mocked<UsuariosRepository>;
}

function criarAmizade(status: "PENDENTE" | "ATIVO" | "RECUSADO" = "ATIVO") {
  const agora = new Date();

  return {
    id: "amizade-id",
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null,
    usuarioOrigemId: "origem-id",
    usuarioDestinoId: "destino-id",
    statusAmizade: status,
  };
}

function criarResumoUsuario(id: string) {
  return {
    id,
    nome: "Usuário",
    nickname: "usuario",
    curso: "Medicina",
    semestre: "5",
  };
}

function criarAlunoVisibilidade(
  overrides: Partial<Awaited<ReturnType<UsuariosRepository["buscarAlunoPorId"]>>> = {},
) {
  return {
    id: "destino-id",
    nome: "Usuário Destino",
    nickname: "destino",
    email: "destino@aluno.unb.br",
    perfil: "ALUNO" as const,
    status: "ATIVO" as const,
    instituicao: "UnB",
    curso: "Medicina",
    semestre: "5",
    visivel: true,
    ...overrides,
  };
}

describe("AmizadesService", () => {
  let repository: jest.Mocked<AmizadesRepository>;
  let usuariosRepository: jest.Mocked<UsuariosRepository>;
  let service: AmizadesService;

  beforeEach(() => {
    repository = criarRepositoryMock();
    usuariosRepository = criarUsuariosRepositoryMock();

    service = new AmizadesService(repository, usuariosRepository);

    jest.clearAllMocks();
  });

  describe("listarAmigos", () => {
    test("deve lançar erro quando usuário não informado", async () => {
      await expect(service.listarAmigos({}, undefined)).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve listar amigos corretamente", async () => {
      repository.listarAmigos.mockResolvedValue({
        total: 1,
        data: [
          {
            ...criarAmizade(),
            usuarioOrigem: criarResumoUsuario("origem-id"),
            usuarioDestino: criarResumoUsuario("destino-id"),
          },
        ],
      });

      const resultado = await service.listarAmigos({}, "origem-id");

      expect(repository.listarAmigos).toHaveBeenCalledTimes(1);

      expect(resultado.dados).toHaveLength(1);

      expect(resultado.dados[0]).toMatchObject({
        id: "amizade-id",
        amigo: expect.objectContaining({
          id: "destino-id",
        }),
      });
      expect(resultado.metadados).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe("buscarAmigos", () => {
    test("deve lançar erro quando usuário não informado", async () => {
      await expect(service.buscarAmigos({ nome: "teste" }, undefined)).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve buscar amigos por nome", async () => {
      repository.buscarAmigos.mockResolvedValue({
        data: [criarResumoUsuario("1")],
        total: 1,
      });

      const resultado = await service.buscarAmigos({ nome: "Usuário" }, "usuario-id");

      expect(repository.buscarAmigos).toHaveBeenCalledWith(
        "usuario-id",
        { nome: "Usuário" },
        {
          limit: 10,
          page: 1,
          skip: 0,
        },
      );

      expect(resultado.dados).toHaveLength(1);
    });

    test("deve buscar amigos por nickname", async () => {
      repository.buscarAmigos.mockResolvedValue({
        data: [criarResumoUsuario("1")],
        total: 1,
      });

      const resultado = await service.buscarAmigos({ nickname: "Usuário" }, "usuario-id");

      expect(repository.buscarAmigos).toHaveBeenCalledWith(
        "usuario-id",
        { nickname: "Usuário" },
        {
          limit: 10,
          page: 1,
          skip: 0,
        },
      );

      expect(resultado.dados).toHaveLength(1);
    });
  });

  describe("enviarSolicitacao", () => {
    test("deve lançar erro quando usuário não informado", async () => {
      await expect(service.enviarSolicitacao({ id: "destino" }, "")).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve lançar erro quando destino não informado", async () => {
      await expect(service.enviarSolicitacao({ id: "" }, "usuario-id")).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        message: MENSAGENS.fornecaUmNomeDeUsuario,
      });
    });

    test("deve lançar erro ao enviar solicitação para si mesmo", async () => {
      await expect(
        service.enviarSolicitacao({ id: "usuario-id" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_PARA_SI_MESMO,
        message: MENSAGENS.solicitacaoParaSiMesmo,
      });

      expect(repository.buscarSolicitacao).not.toHaveBeenCalled();
      expect(repository.enviarSolicitacao).not.toHaveBeenCalled();
    });

    test("deve lançar erro para solicitação pendente", async () => {
      repository.buscarSolicitacao.mockResolvedValue(criarAmizade("PENDENTE"));
      await expect(
        service.enviarSolicitacao({ id: "destino" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_JA_ENVIADA,
        message: MENSAGENS.solicitacaoDeAmizadeJaEnviada,
      });
    });

    test("deve lançar erro para solicitação recusada existente", async () => {
      repository.buscarSolicitacao.mockResolvedValue(criarAmizade("RECUSADO"));

      await expect(
        service.enviarSolicitacao({ id: "destino" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_JA_ENVIADA,
        message: MENSAGENS.solicitacaoDeAmizadeJaEnviada,
      });
    });

    test("deve lançar erro quando já são amigos", async () => {
      repository.buscarSolicitacao.mockResolvedValue(criarAmizade("ATIVO"));

      await expect(
        service.enviarSolicitacao({ id: "destino" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.JA_SAO_AMIGOS,
        message: MENSAGENS.jaSaoAmigos,
      });
    });

    test("deve lançar erro quando usuário destino não existe ou não é aluno", async () => {
      repository.buscarSolicitacao.mockResolvedValue(null);
      usuariosRepository.buscarAlunoPorId.mockResolvedValue(null);

      await expect(
        service.enviarSolicitacao({ id: "destino-id" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 404,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        message: MENSAGENS.usuarioDestinoIndisponivel,
      });

      expect(usuariosRepository.buscarAlunoPorId).toHaveBeenCalledWith("destino-id");
      expect(repository.enviarSolicitacao).not.toHaveBeenCalled();
    });

    test("deve lançar erro quando usuário destino está inativo", async () => {
      repository.buscarSolicitacao.mockResolvedValue(null);
      usuariosRepository.buscarAlunoPorId.mockResolvedValue(
        criarAlunoVisibilidade({ status: "INATIVO" }),
      );

      await expect(
        service.enviarSolicitacao({ id: "destino-id" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        message: MENSAGENS.usuarioDestinoInativo,
      });

      expect(repository.enviarSolicitacao).not.toHaveBeenCalled();
    });

    test("deve lançar erro quando usuário destino está invisível", async () => {
      repository.buscarSolicitacao.mockResolvedValue(null);
      usuariosRepository.buscarAlunoPorId.mockResolvedValue(
        criarAlunoVisibilidade({ visivel: false }),
      );

      await expect(
        service.enviarSolicitacao({ id: "destino-id" }, "usuario-id"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.USUARIO_DESTINO_INDISPONIVEL,
        message: MENSAGENS.usuarioDestinoIndisponivel,
      });

      expect(repository.enviarSolicitacao).not.toHaveBeenCalled();
    });

    test("deve enviar solicitação", async () => {
      repository.buscarSolicitacao.mockResolvedValue(null);
      usuariosRepository.buscarAlunoPorId.mockResolvedValue(criarAlunoVisibilidade());

      repository.enviarSolicitacao.mockResolvedValue(criarAmizade("PENDENTE"));

      await service.enviarSolicitacao({ id: "destino-id" }, "usuario-id");

      expect(usuariosRepository.buscarAlunoPorId).toHaveBeenCalledWith("destino-id");
      expect(repository.enviarSolicitacao).toHaveBeenCalledWith("usuario-id", "destino-id");
    });
  });

  describe("listarConvites", () => {
    test("deve listar convites recebidos", async () => {
      repository.listarConvites.mockResolvedValue({
        total: 1,
        data: [
          {
            ...criarAmizade("PENDENTE"),
            usuarioOrigem: criarResumoUsuario("origem-id"),
          },
        ],
      });

      const resultado = await service.listarConvites({}, "/convites/recebidos", "usuario-id");

      expect(repository.listarConvites).toHaveBeenCalledWith(
        "usuario-id",
        {
          page: 1,
          limit: 10,
          skip: 0,
        },
        "recebidos",
      );

      expect(resultado.dados).toHaveLength(1);
    });

    test("deve listar convites enviados", async () => {
      repository.listarConvites.mockResolvedValue({
        total: 1,
        data: [
          {
            ...criarAmizade("PENDENTE"),
            usuarioDestino: criarResumoUsuario("destino-id"),
          },
        ],
      });

      await service.listarConvites({}, "/convites/enviados", "usuario-id");

      expect(repository.listarConvites).toHaveBeenCalledWith(
        "usuario-id",
        {
          page: 1,
          limit: 10,
          skip: 0,
        },
        "enviados",
      );
    });
  });

  describe("processarSolicitacao", () => {
    test("deve lançar erro quando usuário não informado", async () => {
      await expect(
        service.processarSolicitacao({ id: "1" }, undefined, "/aceitar"),
      ).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve lançar erro quando solicitação não informada", async () => {
      await expect(
        service.processarSolicitacao({ id: "" }, "usuario-id", "/aceitar"),
      ).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        message: MENSAGENS.fornecaUmaSolicitacao,
      });
    });

    test("deve lançar erro quando solicitação não existe", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue(null);

      await expect(
        service.processarSolicitacao({ id: "1" }, "usuario-id", "/aceitar"),
      ).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        message: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });
    });

    test("deve aceitar solicitação", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue(criarAmizade("PENDENTE"));

      repository.processarSolicitacao.mockResolvedValue(criarAmizade("ATIVO"));

      await service.processarSolicitacao({ id: "1" }, "usuario-id", "/aceitar");

      expect(repository.processarSolicitacao).toHaveBeenCalledWith("1", "aceitar");
    });

    test("deve recusar solicitação", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue(criarAmizade("PENDENTE"));

      repository.processarSolicitacao.mockResolvedValue(criarAmizade("RECUSADO"));

      await service.processarSolicitacao({ id: "1" }, "usuario-id", "/recusar");

      expect(repository.processarSolicitacao).toHaveBeenCalledWith("1", "recusar");
    });
  });

  describe("desfazerAmizade", () => {
    test("deve lançar erro quando amizade não é ativa", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue(criarAmizade("RECUSADO"));

      await expect(service.desfazerAmizade({ id: "1" }, "usuario-id")).rejects.toMatchObject({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        message: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });
    });

    test("deve lançar erro quando usuário não participa da amizade", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue({
        ...criarAmizade("ATIVO"),
        usuarioOrigemId: "a",
        usuarioDestinoId: "b",
      });

      await expect(service.desfazerAmizade({ id: "1" }, "usuario-id")).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.desfazerAmizadeRecusado,
      });
    });

    test("deve desfazer amizade", async () => {
      repository.buscarPorSolicitacaoId.mockResolvedValue({
        ...criarAmizade("ATIVO"),
        usuarioOrigemId: "usuario-id",
      });

      repository.desfazerAmizade.mockResolvedValue(criarAmizade("ATIVO"));

      await service.desfazerAmizade({ id: "1" }, "usuario-id");

      expect(repository.desfazerAmizade).toHaveBeenCalledWith("1");
    });
  });

  describe("mudarVisibilidade", () => {
    test("deve lançar erro quando usuário não informado", async () => {
      await expect(service.mudarVisibilidade(undefined)).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve lançar erro quando usuário não encontrado", async () => {
      usuariosRepository.buscarAlunoPorId.mockResolvedValue(null);

      await expect(service.mudarVisibilidade("usuario-id")).rejects.toMatchObject({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        message: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    });

    test("deve inverter visibilidade", async () => {
      usuariosRepository.buscarAlunoPorId.mockResolvedValue({
        id: "usuario-id",
        visivel: true,
      });

      repository.mudarVisibilidade.mockResolvedValue({});

      await service.mudarVisibilidade("usuario-id");

      expect(repository.mudarVisibilidade).toHaveBeenCalledWith("usuario-id", false);
    });
  });
});
