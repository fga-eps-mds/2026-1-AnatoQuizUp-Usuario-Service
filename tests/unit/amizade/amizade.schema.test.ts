import {
  schemaBuscarAmizades,
  schemaBuscarAlunosAmizade,
  schemaSolicitarAmizade,
  schemaBuscarAmizadePorUsuarioId,
} from "@/modules/amizade/amizade.schema";

describe("schemas de amizade", () => {
  describe("schemaBuscarAmizades", () => {
    test("deve validar payload completo", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "usuario-1",
        page: 1,
        limit: 10,
      });

      expect(resultado.success).toBe(true);
    });

    test("deve rejeitar id vazio", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "",
      });

      expect(resultado.success).toBe(false);

      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("Id do usuario e obrigatorio");
      }
    });

    test("deve rejeitar id com apenas espaços (trim + min)", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "   ",
      });

      expect(resultado.success).toBe(false);
    });

    test("deve coercer page e limit", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "usuario-1",
        page: "2",
        limit: "20",
      });

      expect(resultado.success).toBe(true);

      if (resultado.success) {
        expect(resultado.data.page).toBe(2);
        expect(resultado.data.limit).toBe(20);
      }
    });

    test("deve rejeitar limit maior que 100", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "usuario-1",
        limit: 101,
      });

      expect(resultado.success).toBe(false);
    });

    test("deve rejeitar page menor que 1", () => {
      const resultado = schemaBuscarAmizades.safeParse({
        id: "usuario-1",
        page: 0,
      });

      expect(resultado.success).toBe(false);
    });
  });

  describe("schemaBuscarAlunosAmizade", () => {
    test("deve validar sem filtros", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({});

      expect(resultado.success).toBe(true);
    });

    test("deve validar com nome", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({
        nome: "Maria",
      });

      expect(resultado.success).toBe(true);
    });

    test("deve rejeitar nome vazio (trim + min)", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({
        nome: "",
      });

      expect(resultado.success).toBe(false);
    });

    test("deve coercer paginação", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({
        page: "3",
        limit: "15",
      });

      expect(resultado.success).toBe(true);

      if (resultado.success) {
        expect(resultado.data.page).toBe(3);
        expect(resultado.data.limit).toBe(15);
      }
    });

    test("deve rejeitar limit acima de 100", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({
        limit: 200,
      });

      expect(resultado.success).toBe(false);
    });

    test("deve rejeitar page decimal", () => {
      const resultado = schemaBuscarAlunosAmizade.safeParse({
        page: 1.2,
      });

      expect(resultado.success).toBe(false);
    });
  });

  describe("schemaSolicitarAmizade", () => {
    test("deve validar id válido", () => {
      const resultado = schemaSolicitarAmizade.safeParse({
        id: "usuario-1",
      });

      expect(resultado.success).toBe(true);
    });

    test("deve rejeitar id vazio e verificar mensagem", () => {
      const resultado = schemaSolicitarAmizade.safeParse({
        id: "",
      });

      expect(resultado.success).toBe(false);

      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("Id do usuario e obrigatorio");
      }
    });

    test("deve rejeitar id com espaços", () => {
      const resultado = schemaSolicitarAmizade.safeParse({
        id: "   ",
      });

      expect(resultado.success).toBe(false);
    });
  });

  describe("schemaBuscarAmizadePorUsuarioId", () => {
    test("deve validar payload completo", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        busca: "joao",
        page: 1,
        limit: 10,
      });

      expect(resultado.success).toBe(true);
    });

    test("deve validar sem busca", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
      });

      expect(resultado.success).toBe(true);
    });

    test("deve rejeitar id vazio e validar mensagem", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "",
      });

      expect(resultado.success).toBe(false);

      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe("Id do usuario e obrigatorio");
      }
    });

    test("deve rejeitar busca vazia (min 1 quando fornecida)", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        busca: "",
      });

      expect(resultado.success).toBe(false);
    });

    test("deve coercer paginação", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        page: "2",
        limit: "30",
      });

      expect(resultado.success).toBe(true);

      if (resultado.success) {
        expect(resultado.data.page).toBe(2);
        expect(resultado.data.limit).toBe(30);
      }
    });

    test("deve rejeitar limit acima de 100", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        limit: 101,
      });

      expect(resultado.success).toBe(false);
    });

    test("deve rejeitar page menor que 1", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        page: 0,
      });

      expect(resultado.success).toBe(false);
    });

    test("deve rejeitar page decimal", () => {
      const resultado = schemaBuscarAmizadePorUsuarioId.safeParse({
        id: "usuario-1",
        page: 1.7,
      });

      expect(resultado.success).toBe(false);
    });
  });
});
