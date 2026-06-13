import request from "supertest";
import { aplicacao as app } from "../../../../src/config/app";
import { prisma } from "@/config/db";

describe("Integração: Cadastro de Professor", () => {
  const emailsCriados: string[] = [];

  const tokenInterno = process.env.INTERNAL_TOKEN;

  beforeAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        OR: [
          { email: "prof.teste@unb.br" },
          { email: "outro.prof@unb.br" },
          { siape: "1234567" },
          { siape: "7654321" }
        ]
      }
    });
  });

  afterAll(async () => {
    if (emailsCriados.length > 0) {
      await prisma.usuario.deleteMany({
        where: { email: { in: emailsCriados } },
      });
    }
  });

  describe("POST /api/v1/autenticacao/cadastro/professor", () => {
    const dadosValidosProfessor = {
      nome: "Professor Teste Integração",
      email: "prof.teste@unb.br",
      siape: "1234567",
      instituicao: "UnB",
      departamento: "Departamento de Ciência da Computação",
      curso: "Engenharia de Software",
      senha: "senhaSegura123",
      confirmacaoSenha: "senhaSegura123",
    };

    it("deve cadastrar um novo professor com sucesso e retornar status PENDENTE", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send(dadosValidosProfessor);

      expect(response.status).toBe(201);
      
      expect(response.body.mensagem).toBe("Cadastro realizado. Aguarde aprovacao do administrador.");
      expect(response.body.dados.usuario).toHaveProperty("id");
      expect(response.body.dados.usuario).toHaveProperty("email", dadosValidosProfessor.email);
      expect(response.body.dados.usuario).toHaveProperty("siape", dadosValidosProfessor.siape);
      expect(response.body.dados.usuario).toHaveProperty("status", "PENDENTE");
      expect(response.body.dados.usuario).toHaveProperty("papel", "PROFESSOR");
      
      expect(response.body.dados.usuario).not.toHaveProperty("senhaHash");

      emailsCriados.push(dadosValidosProfessor.email);
    });

    it("deve retornar 409 (Conflito) se o email já estiver cadastrado", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          siape: "7654321", 
        });

      expect(response.status).toBe(409);
      expect(response.body.erro.codigo).toBe("CONFLITO");
      expect(response.body.erro.mensagem).toBe("Email ja cadastrado.");
    });

    it("deve retornar 409 (Conflito) se o SIAPE já estiver cadastrado", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          email: "outro.prof@unb.br",
        });

      expect(response.status).toBe(409);
      expect(response.body.erro.codigo).toBe("CONFLITO");
      expect(response.body.erro.mensagem).toBe("SIAPE ja cadastrado.");
    });

    it("deve retornar erro de validação (400) se o email não for da UnB (@unb.br)", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          email: "prof.teste@gmail.com",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("Email institucional UnB obrigatorio");
    });

    it("deve retornar erro de validação (400) se o SIAPE não tiver 7 dígitos", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          siape: "12345",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("SIAPE invalido");
    });

    it("deve retornar erro de validação (400) se as senhas não conferirem", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          senha: "senhaSegura123",
          confirmacaoSenha: "senhaDiferente",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("Confirmacao de senha deve ser igual a senha");
    });

    it("deve retornar erro de validação (400) se a instituição não for UnB", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro/professor")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosProfessor,
          instituicao: "UFG", 
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("Instituicao deve ser UnB");
    });
  });
});