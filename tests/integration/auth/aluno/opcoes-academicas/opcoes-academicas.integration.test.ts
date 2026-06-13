import request from "supertest";
import { aplicacao as app } from "../../../../../src/config/app";

describe("Integração: Rotas de Opções Acadêmicas (Alunos)", () => {
  const tokenInterno = process.env.INTERNAL_TOKEN;

  describe("GET /api/v1/autenticacao/alunos/opcoes-academicas", () => {
    it("deve listar as opções acadêmicas com sucesso", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/opcoes-academicas")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      
      expect(response.body.mensagem).toBe("Opcoes academicas listadas com sucesso."); 
      
      expect(response.body.dados).toHaveProperty("escolaridades");
      expect(response.body.dados).toHaveProperty("instituicoes");
      expect(response.body.dados).toHaveProperty("cursos");
      expect(response.body.dados).toHaveProperty("periodos");
      expect(response.body.dados).toHaveProperty("naoSeAplica");

      expect(Array.isArray(response.body.dados.escolaridades)).toBe(true);
      expect(Array.isArray(response.body.dados.instituicoes)).toBe(true);
      expect(Array.isArray(response.body.dados.cursos)).toBe(true);
      expect(Array.isArray(response.body.dados.periodos)).toBe(true);
      expect(typeof response.body.dados.naoSeAplica).toBe("string");
    });
  });
});