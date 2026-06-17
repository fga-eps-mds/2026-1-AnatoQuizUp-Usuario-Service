import {
  schemaAlterarSenha,
  schemaAtualizarDadosPessoais,
  schemaBuscarAlunos,
  schemaBuscarUsuarioPorId,
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

  test("schemaBuscarUsuarioPorId remove espacos do id", () => {
    expect(schemaBuscarUsuarioPorId.parse({ id: " professor-1 " })).toEqual({
      id: "professor-1",
    });
  });

  test("schemaBuscarUsuarioPorId rejeita id vazio", () => {
    expect(() => schemaBuscarUsuarioPorId.parse({ id: "   " })).toThrow();
    expect(() => schemaBuscarUsuarioPorId.parse({})).toThrow();
  });

  describe("schemaAtualizarDadosPessoais", () => {
    test("aceita nome e nickname validos", () => {
      expect(schemaAtualizarDadosPessoais.parse({
        nome: " Joao Silva ",
        nickname: " Joao_Silva ",
      })).toEqual({
        nome: "Joao Silva",
        nickname: "joao_silva",
      });
    });

    test("aceita apenas nome", () => {
      expect(schemaAtualizarDadosPessoais.parse({ nome: " Maria Souza " })).toEqual({
        nome: "Maria Souza",
      });
    });

    test("aceita apenas nickname e normaliza para minusculas", () => {
      expect(schemaAtualizarDadosPessoais.parse({ nickname: " MARIA_2026 " })).toEqual({
        nickname: "maria_2026",
      });
    });

    test("rejeita body vazio ou apenas campos fora do contrato", () => {
      expect(() => schemaAtualizarDadosPessoais.parse({})).toThrow();
      expect(() => schemaAtualizarDadosPessoais.parse({
        email: "joao@example.com",
      })).toThrow();
    });

    test("rejeita nickname invalido", () => {
      expect(() => schemaAtualizarDadosPessoais.parse({
        nickname: "123-invalido",
      })).toThrow();
    });

    test("rejeita nome com caracteres invalidos", () => {
      expect(() => schemaAtualizarDadosPessoais.parse({
        nome: "Joao 123",
      })).toThrow();
    });
  });

  describe("schemaAlterarSenha", () => {
    test("aceita body valido", () => {
      expect(schemaAlterarSenha.parse({
        senhaAtual: "senhaAtual123",
        novaSenha: "novaSenha123",
        confirmacaoNovaSenha: "novaSenha123",
      })).toEqual({
        senhaAtual: "senhaAtual123",
        novaSenha: "novaSenha123",
        confirmacaoNovaSenha: "novaSenha123",
      });
    });

    test("rejeita nova senha menor que 8 caracteres", () => {
      expect(() => schemaAlterarSenha.parse({
        senhaAtual: "senhaAtual123",
        novaSenha: "1234567",
        confirmacaoNovaSenha: "1234567",
      })).toThrow();
    });

    test("rejeita confirmacao diferente da nova senha no campo de confirmacao", () => {
      const resultado = schemaAlterarSenha.safeParse({
        senhaAtual: "senhaAtual123",
        novaSenha: "novaSenha123",
        confirmacaoNovaSenha: "outraSenha123",
      });

      expect(resultado.success).toBe(false);

      if (resultado.success) {
        throw new Error("Schema deveria rejeitar confirmacao divergente.");
      }

      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["confirmacaoNovaSenha"],
          }),
        ]),
      );
    });

    test("rejeita nova senha igual a senha atual no campo novaSenha", () => {
      const resultado = schemaAlterarSenha.safeParse({
        senhaAtual: "mesmaSenha123",
        novaSenha: "mesmaSenha123",
        confirmacaoNovaSenha: "mesmaSenha123",
      });

      expect(resultado.success).toBe(false);

      if (resultado.success) {
        throw new Error("Schema deveria rejeitar reuso da senha atual.");
      }

      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["novaSenha"],
          }),
        ]),
      );
    });

    test("rejeita senha atual vazia", () => {
      expect(() => schemaAlterarSenha.parse({
        senhaAtual: "",
        novaSenha: "novaSenha123",
        confirmacaoNovaSenha: "novaSenha123",
      })).toThrow();
    });
  });
});
