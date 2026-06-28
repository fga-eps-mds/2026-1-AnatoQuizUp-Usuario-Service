import request from "supertest";
import { aplicacao as app } from "../../../../src/config/app";
import { prisma } from "@/config/db";

describe("Integração: Cadastro de Aluno", () => {
  const emailsCriados: string[] = [];
  const tokenInterno = process.env.INTERNAL_TOKEN;

  const dadosValidosAluno = {
    nome: "Aluno Teste Integração",
    nickname: "alunoteste_123",
    email: "aluno.teste.int@anatoquizup.com",
    senha: "senhaSegura123",
    confirmacaoSenha: "senhaSegura123",
    instituicao: "Universidade de Brasília",
    curso: "Engenharia de Software",
    periodo: "11º semestre",
    dataNascimento: "2000-01-01",
    nacionalidade: "Brasileira",
    estado: "DF",
    cidade: "Brasília",
    escolaridade: "ENSINO_MEDIO", 
  };

  beforeAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        OR: [
          { email: dadosValidosAluno.email },
          { email: "outro.aluno@anatoquizup.com" },
          { nickname: dadosValidosAluno.nickname },
          { nickname: "outro_nickname" }
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

  describe("POST /api/v1/autenticacao/cadastro", () => {
    it("deve cadastrar um novo aluno com sucesso e retornar status ATIVO", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro")
        .set("X-Internal-Token", tokenInterno)
        .send(dadosValidosAluno);

      expect(response.status).toBe(201);
      expect(response.body.mensagem).toBe("Usuario cadastrado com sucesso."); 
      expect(response.body.dados).toHaveProperty("id");
      expect(response.body.dados).toHaveProperty("email", dadosValidosAluno.email);
      expect(response.body.dados).toHaveProperty("nickname", dadosValidosAluno.nickname);
      expect(response.body.dados).toHaveProperty("status", "ATIVO");
      expect(response.body.dados).toHaveProperty("papel", "ALUNO");

      emailsCriados.push(dadosValidosAluno.email);
    });

    it("deve retornar 409 (Conflito) se o email já estiver cadastrado", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosAluno,
          nickname: "outro_nickname", 
        });

      expect(response.status).toBe(409);
      expect(response.body.erro.codigo).toBe("CONFLITO");
      expect(response.body.erro.mensagem).toBe("Email ja cadastrado.");
    });

    it("deve retornar 409 (Conflito) se o nickname já estiver cadastrado", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosAluno,
          email: "outro.aluno@anatoquizup.com", 
        });

      expect(response.status).toBe(409);
      expect(response.body.erro.codigo).toBe("CONFLITO");
      expect(response.body.erro.mensagem).toBe("Ja existe um usuario cadastrado com este nickname.");
    });

    it("deve retornar erro de validação (400) se as senhas não conferirem", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosAluno,
          senha: "senhaSegura123",
          confirmacaoSenha: "senhaDiferente123",
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("Confirmacao de senha deve ser igual a senha");
    });
    
    it("deve retornar erro de validação (400) se a data de nascimento for inválida", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/cadastro")
        .set("X-Internal-Token", tokenInterno)
        .send({
          ...dadosValidosAluno,
          dataNascimento: "31-12-2000", 
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain("Data deve estar no formato yyyy-mm-dd");
    });
  });

  describe("GET /api/v1/autenticacao/alunos/nickname-disponivel", () => {
    it("deve retornar false se o nickname já estiver em uso", async () => {
      const response = await request(app)
        .get(`/api/v1/autenticacao/alunos/nickname-disponivel?nickname=${dadosValidosAluno.nickname}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados.disponivel).toBe(false);
    });

    it("deve retornar true se o nickname estiver livre", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/nickname-disponivel?nickname=nickname_livre")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados.disponivel).toBe(true);
    });
  });

  describe("GET /api/v1/autenticacao/alunos/email-disponivel", () => {
    it("deve retornar false se o email já estiver em uso", async () => {
      const response = await request(app)
        .get(`/api/v1/autenticacao/alunos/email-disponivel?email=${dadosValidosAluno.email}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados.disponivel).toBe(false);
    });

    it("deve retornar true se o email estiver livre", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/alunos/email-disponivel?email=email_livre@anatoquizup.com")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados.disponivel).toBe(true);
    });
  });
});