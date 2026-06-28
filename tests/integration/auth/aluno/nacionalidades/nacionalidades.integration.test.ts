import request from "supertest";
import { aplicacao as app } from "../../../../../src/config/app";

describe("Integração: Rotas de Nacionalidades (Alunos)", () => {
  const tokenInterno = process.env.INTERNAL_TOKEN;

  describe("GET /api/v1/autenticacao/alunos/nacionalidades", () => {
    it("deve listar as nacionalidades com sucesso", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/nacionalidades")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      
      expect(response.body.mensagem).toBe("Nacionalidades listadas com sucesso."); 
      expect(Array.isArray(response.body.dados)).toBe(true);
      expect(response.body.dados.length).toBeGreaterThan(0);
    });
  });
});