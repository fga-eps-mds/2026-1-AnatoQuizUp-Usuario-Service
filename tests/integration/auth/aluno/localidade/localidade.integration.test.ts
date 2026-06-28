import request from "supertest";
import { aplicacao as app } from "../../../../../src/config/app";

describe("Integração: Rotas de Localidades (Alunos)", () => {
  const tokenInterno = process.env.INTERNAL_TOKEN;

  describe("GET /api/v1/autenticacao/alunos/localidades/estados", () => {
    it("deve listar os estados brasileiros com sucesso", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/localidades/estados")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Estados listados com sucesso."); 
      expect(Array.isArray(response.body.dados)).toBe(true);
      expect(response.body.dados.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/autenticacao/alunos/localidades/estados/:uf/cidades", () => {
    it("deve listar as cidades ao informar uma UF válida (Ex: DF)", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/localidades/estados/DF/cidades")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Cidades listadas com sucesso."); 
      expect(Array.isArray(response.body.dados)).toBe(true);
      expect(response.body.dados.length).toBeGreaterThan(0);
      expect(response.body.dados[0]).toHaveProperty("nome");
      expect(response.body.dados[0]).toHaveProperty("uf", "DF");
    });

    it("deve aceitar a UF em minúsculo e transformar para maiúsculo pelo Zod", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/localidades/estados/sp/cidades")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.dados)).toBe(true);
      expect(response.body.dados[0]).toHaveProperty("uf", "SP"); 
    });

    it("deve retornar erro de validação (400) se a UF for inválida", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/localidades/estados/XX/cidades")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("ERRO_DE_VALIDACAO");
    });
  });
});