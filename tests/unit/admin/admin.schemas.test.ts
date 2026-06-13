import {
  schemaAlterarStatusUser,
  schemaBuscarUserPorId,
  schemaListarUsers,
} from "../../../src/modules/admin/admin.schemas";
import {
  mapearStatusApiParaStatusBanco,
  STATUS_USUARIO_API,
} from "../../../src/modules/admin/dto/alterar.status_user.types";

describe("schemas admin", () => {
  test("schemaListarUsers converte parametros de paginacao", () => {
    expect(schemaListarUsers.parse({ page: "2", limit: "20" })).toEqual({
      page: 2,
      limit: 20,
    });
  });

  test.each([
    ["page menor que 1", { page: "0" }],
    ["limit menor que 1", { limit: "0" }],
    ["limit maior que 100", { limit: "101" }],
  ])("schemaListarUsers rejeita %s", (_caso, query) => {
    expect(() => schemaListarUsers.parse(query)).toThrow();
  });

  test("schemaBuscarUserPorId remove espacos do id", () => {
    expect(schemaBuscarUserPorId.parse({ id: " user-1 " })).toEqual({
      id: "user-1",
    });
  });

  test("schemaBuscarUserPorId rejeita id vazio", () => {
    expect(() => schemaBuscarUserPorId.parse({ id: "   " })).toThrow();
  });

  test.each([
    STATUS_USUARIO_API.PENDING,
    STATUS_USUARIO_API.ACTIVE,
    STATUS_USUARIO_API.INACTIVE,
  ])("schemaAlterarStatusUser aceita status %s", (status) => {
    expect(schemaAlterarStatusUser.parse({ status })).toEqual({ status });
  });

  test("schemaAlterarStatusUser rejeita status fora do contrato", () => {
    expect(() => schemaAlterarStatusUser.parse({ status: "RECUSADO" })).toThrow();
  });

  test.each([
    [STATUS_USUARIO_API.PENDING, "PENDENTE"],
    [STATUS_USUARIO_API.ACTIVE, "ATIVO"],
    [STATUS_USUARIO_API.INACTIVE, "INATIVO"],
  ] as const)("mapearStatusApiParaStatusBanco converte %s", (statusApi, statusBanco) => {
    expect(mapearStatusApiParaStatusBanco(statusApi)).toBe(statusBanco);
  });
});
