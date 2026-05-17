import {
  schemaBuscarAlunos,
  schemaBuscarUsuariosPorIds,
} from "./usuarios.schemas";

describe("schemas usuarios", () => {
  test("schemaBuscarAlunos converte paginacao e normaliza busca", () => {
    expect(schemaBuscarAlunos.parse({
      busca: " joao ",
      page: "2",
      limit: "20",
    })).toEqual({
      busca: "joao",
      page: 2,
      limit: 20,
    });
  });

  test.each([
    ["busca vazia", { busca: "   " }],
    ["page invalida", { page: "0" }],
    ["limit maior que maximo", { limit: "101" }],
  ])("schemaBuscarAlunos rejeita %s", (_caso, query) => {
    expect(() => schemaBuscarAlunos.parse(query)).toThrow();
  });

  test("schemaBuscarUsuariosPorIds transforma string em lista de ids", () => {
    expect(schemaBuscarUsuariosPorIds.parse({ ids: " aluno-1,aluno-2 " })).toEqual({
      ids: ["aluno-1", "aluno-2"],
    });
  });

  test("schemaBuscarUsuariosPorIds rejeita ids ausentes ou duplicados", () => {
    expect(() => schemaBuscarUsuariosPorIds.parse({})).toThrow();
    expect(() => schemaBuscarUsuariosPorIds.parse({ ids: "aluno-1, aluno-1" })).toThrow();
  });
});
