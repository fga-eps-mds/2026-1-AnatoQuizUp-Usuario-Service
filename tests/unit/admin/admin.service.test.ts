import type { Usuario } from "@prisma/client";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { ErroAplicacao } from "@/shared/errors/erro-aplicacao";

import { AdminService } from "../../../src/modules/admin/admin.service";
import type { UserRepository } from "../../../src/modules/admin/admin.repository";
import type { ContextoAdminDto } from "../../../src/modules/admin/dto/alterar.status_user.types";

function criarUsuarioSemSenha(overrides: Partial<Omit<Usuario, "senha">> = {}): Omit<Usuario, "senha"> {
  return {
    id: "user-1",
    nome: "Maria",
    nickname: "maria",
    email: "maria@example.com",
    perfil: "ALUNO",
    status: "ATIVO",
    instituicao: null,
    curso: null,
    semestre: null,
    estado: null,
    cidade: null,
    nacionalidade: null,
    dataNascimento: null,
    nivelEducacional: null,
    departamento: null,
    siape: null,
    aprovadoPorId: null,
    aprovadoEm: null,
    criadoEm: new Date("2026-04-27T03:28:54.851Z"),
    atualizadoEm: new Date("2026-04-27T03:28:47.821Z"),
    excluidoEm: null,
    ...overrides,
  };
}

describe("AdminService", () => {
  let userRepository: jest.Mocked<UserRepository>;
  let service: AdminService;
  const adminContexto: ContextoAdminDto = { id: "admin-1", perfil: "ADMIN" };

  beforeEach(() => {
    userRepository = {
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizarStatus: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    service = new AdminService(userRepository);
    jest.clearAllMocks();
  });

  test("listar monta resposta paginada", async () => {
    const usuarios = [criarUsuarioSemSenha()];
    userRepository.listar.mockResolvedValue({
      data: usuarios,
      total: 1,
    });

    const resposta = await service.listar({ page: 1, limit: 10 });

    expect(userRepository.listar).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      skip: 0,
    });
    expect(resposta.metadados).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(resposta.dados).toEqual(usuarios);
  });

  test("buscarPorId retorna resposta do usuário convertido", async () => {
    userRepository.buscarPorId.mockResolvedValue(criarUsuarioSemSenha());

    const resposta = await service.buscarPorId("user-1");

    expect(resposta).toMatchObject({
      id: "user-1",
      nome: "Maria",
      email: "maria@example.com",
      status: "ATIVO",
      criadoEm: "2026-04-27T03:28:54.851Z",
    });
  });

  test("buscarPorId lança erro 404 quando usuário não existe", async () => {
    userRepository.buscarPorId.mockResolvedValue(null);

    await expect(service.buscarPorId("missing")).rejects.toMatchObject({
      codigoStatus: 404,
      message: MENSAGENS.usuarioNaoEncontrado,
    } satisfies Partial<ErroAplicacao>);
  });

  test("alterarStatus aprova professor pendente", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "PROFESSOR", status: "PENDENTE" }),
    );
    userRepository.atualizarStatus.mockResolvedValue(
      criarUsuarioSemSenha({
        perfil: "PROFESSOR",
        status: "ATIVO",
        aprovadoPorId: "admin-1",
        aprovadoEm: new Date("2026-04-27T04:00:00.000Z"),
      }),
    );

    const resposta = await service.alterarStatus(
      "user-1",
      { status: "ACTIVE" },
      adminContexto,
    );

    expect(userRepository.atualizarStatus).toHaveBeenCalledWith("user-1", "ATIVO", "admin-1");
    expect(resposta.status).toBe("ATIVO");
    expect(resposta.aprovadoPorId).toBe("admin-1");
  });

  test("alterarStatus rejeita professor pendente mantendo histórico", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "PROFESSOR", status: "PENDENTE" }),
    );
    userRepository.atualizarStatus.mockResolvedValue(
      criarUsuarioSemSenha({
        perfil: "PROFESSOR",
        status: "INATIVO",
        aprovadoPorId: "admin-1",
        aprovadoEm: new Date("2026-04-27T04:00:00.000Z"),
      }),
    );

    const resposta = await service.alterarStatus(
      "user-1",
      { status: "INACTIVE" },
      adminContexto,
    );

    expect(userRepository.atualizarStatus).toHaveBeenCalledWith("user-1", "INATIVO", "admin-1");
    expect(resposta.status).toBe("INATIVO");
  });

  test("alterarStatus desativa usuário ativo", async () => {
    userRepository.buscarPorId.mockResolvedValue(criarUsuarioSemSenha({ status: "ATIVO" }));
    userRepository.atualizarStatus.mockResolvedValue(
      criarUsuarioSemSenha({ status: "INATIVO" }),
    );

    const resposta = await service.alterarStatus(
      "user-1",
      { status: "INACTIVE" },
      adminContexto,
    );

    expect(userRepository.atualizarStatus).toHaveBeenCalledWith("user-1", "INATIVO", undefined);
    expect(resposta.status).toBe("INATIVO");
  });

  test("alterarStatus reativa usuário inativo", async () => {
    userRepository.buscarPorId.mockResolvedValue(criarUsuarioSemSenha({ status: "INATIVO" }));
    userRepository.atualizarStatus.mockResolvedValue(
      criarUsuarioSemSenha({ status: "ATIVO" }),
    );

    const resposta = await service.alterarStatus(
      "user-1",
      { status: "ACTIVE" },
      adminContexto,
    );

    expect(userRepository.atualizarStatus).toHaveBeenCalledWith("user-1", "ATIVO", undefined);
    expect(resposta.status).toBe("ATIVO");
  });

  test("alterarStatus não permite admin desativar a si mesmo", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ id: "admin-1", status: "ATIVO", perfil: "ALUNO" }),
    );

    await expect(
      service.alterarStatus("admin-1", { status: "INACTIVE" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 403,
      message: MENSAGENS.usuarioAutoDesativacaoNaoPermitida,
    } satisfies Partial<ErroAplicacao>);
  });

  test("alterarStatus não permite alterar outro ADMIN", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ id: "admin-2", perfil: "ADMIN", status: "ATIVO" }),
    );

    await expect(
      service.alterarStatus("admin-2", { status: "INACTIVE" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 403,
      message: MENSAGENS.usuarioAdminNaoPodeSerAlterado,
    } satisfies Partial<ErroAplicacao>);
  });

  test("alterarStatus rejeita transição inválida", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "ALUNO", status: "PENDENTE" }),
    );

    await expect(
      service.alterarStatus("user-1", { status: "ACTIVE" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 409,
      message: MENSAGENS.usuarioStatusInvalido,
    } satisfies Partial<ErroAplicacao>);
  });
  test("buscarPorId converte campos opcionais de data preenchidos", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({
        dataNascimento: new Date("2000-01-01T00:00:00.000Z"),
        aprovadoEm: new Date("2026-04-27T04:00:00.000Z"),
        excluidoEm: new Date("2026-04-28T04:00:00.000Z"),
      }),
    );

    const resposta = await service.buscarPorId("user-1");

    expect(resposta).toMatchObject({
      dataNascimento: "2000-01-01T00:00:00.000Z",
      aprovadoEm: "2026-04-27T04:00:00.000Z",
      excluidoEm: "2026-04-28T04:00:00.000Z",
    });
  });

  test("alterarStatus lanca erro 404 quando usuario nao existe", async () => {
    userRepository.buscarPorId.mockResolvedValue(null);

    await expect(
      service.alterarStatus("missing", { status: "INACTIVE" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 404,
      message: MENSAGENS.usuarioNaoEncontrado,
    } satisfies Partial<ErroAplicacao>);
  });

  test("alterarStatus rejeita transicao sem mudanca", async () => {
    userRepository.buscarPorId.mockResolvedValue(criarUsuarioSemSenha({ status: "ATIVO" }));

    await expect(
      service.alterarStatus("user-1", { status: "ACTIVE" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 409,
      message: MENSAGENS.usuarioStatusInvalido,
    } satisfies Partial<ErroAplicacao>);
  });

  test("alterarStatus aprova professor pendente sem aprovador quando contexto nao tem id", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "PROFESSOR", status: "PENDENTE" }),
    );
    userRepository.atualizarStatus.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "PROFESSOR", status: "ATIVO" }),
    );

    const resposta = await service.alterarStatus(
      "user-1",
      { status: "ACTIVE" },
      { id: null, perfil: "ADMIN" },
    );

    expect(userRepository.atualizarStatus).toHaveBeenCalledWith("user-1", "ATIVO", undefined);
    expect(resposta.status).toBe("ATIVO");
  });

  test("alterarStatus rejeita professor pendente continuar pendente", async () => {
    userRepository.buscarPorId.mockResolvedValue(
      criarUsuarioSemSenha({ perfil: "PROFESSOR", status: "PENDENTE" }),
    );

    await expect(
      service.alterarStatus("user-1", { status: "PENDING" }, adminContexto),
    ).rejects.toMatchObject({
      codigoStatus: 409,
      message: MENSAGENS.usuarioStatusInvalido,
    } satisfies Partial<ErroAplicacao>);
  });
});
