import request from "supertest";
import bcrypt from "bcryptjs";
import { aplicacao as app } from "../../../../src/config/app";
import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";

describe("Integração: Rotas de Sessão (Autenticação)", () => {
  const idsUsuariosCriados: string[] = [];
  let accessTokenAtivo: string;
  let refreshTokenAtivo: string;

  const emailAtivo = "testesessao.ativo@anatoquizup.com";
  const emailPendente = "testesessao.pendente@anatoquizup.com";
  const emailInativo = "testesessao.inativo@anatoquizup.com";
  const senhaPlana = "senhaSegura123";

  const tokenInterno = process.env.INTERNAL_TOKEN;

  beforeAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: { in: [emailAtivo, emailPendente, emailInativo] }
      }
    });

    const senhaHash = await bcrypt.hash(senhaPlana, 10);

    const usuarioAtivo = await prisma.usuario.create({
      data: {
        nome: "Usuário Ativo",
        email: emailAtivo,
        senha: senhaHash,
        perfil: "ALUNO",
        status: "ATIVO",
      },
    });

    const usuarioPendente = await prisma.usuario.create({
      data: {
        nome: "Usuário Pendente",
        email: emailPendente,
        senha: senhaHash,
        perfil: "PROFESSOR",
        status: "PENDENTE",
      },
    });

    const usuarioInativo = await prisma.usuario.create({
      data: {
        nome: "Usuário Inativo",
        email: emailInativo,
        senha: senhaHash,
        perfil: "ALUNO",
        status: "INATIVO",
      },
    });

    idsUsuariosCriados.push(usuarioAtivo.id, usuarioPendente.id, usuarioInativo.id);
  });

  afterAll(async () => {
    if (idsUsuariosCriados.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE "usuarioId" IN (${Prisma.join(idsUsuariosCriados)})
      `;
    }

    if (idsUsuariosCriados.length > 0) {
      await prisma.usuario.deleteMany({
        where: { id: { in: idsUsuariosCriados } },
      });
    }
  });

  describe("POST /api/v1/autenticacao/login", () => {
    it("deve fazer login com sucesso e retornar accessToken e refreshToken", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/login")
        .set("X-Internal-Token", tokenInterno)
        .send({
          email: emailAtivo,
          senha: senhaPlana,
        });

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Login realizado com sucesso.");
      expect(response.body.dados).toHaveProperty("accessToken");
      expect(response.body.dados).toHaveProperty("refreshToken");

      accessTokenAtivo = response.body.dados.accessToken;
      refreshTokenAtivo = response.body.dados.refreshToken;
    });

    it("deve retornar erro 401 se a senha for incorreta", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/login")
        .set("X-Internal-Token", tokenInterno)
        .send({
          email: emailAtivo,
          senha: "senhaIncorreta",
        });

      expect(response.status).toBe(401);
      expect(response.body.erro.codigo).toBe("NAO_AUTORIZADO");
    });

    it("deve retornar erro 401 se o email não existir", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/login")
        .set("X-Internal-Token", tokenInterno)
        .send({
          email: "email-nao-existe@anatoquizup.com",
          senha: senhaPlana,
        });

      expect(response.status).toBe(401);
    });

    it("deve retornar erro 403 (CADASTRO_EM_ANALISE) para usuário pendente", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/login")
        .set("X-Internal-Token", tokenInterno)
        .send({
          email: emailPendente,
          senha: senhaPlana,
        });

      expect(response.status).toBe(403);
      expect(response.body.erro.codigo).toBe("CADASTRO_EM_ANALISE");
    });

    it("deve retornar erro 403 (CONTA_DESATIVADA) para usuário inativo", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/login")
        .set("X-Internal-Token", tokenInterno)
        .send({
          email: emailInativo,
          senha: senhaPlana,
        });

      expect(response.status).toBe(403);
      expect(response.body.erro.codigo).toBe("CONTA_DESATIVADA");
    });
  });

  describe("GET /api/v1/autenticacao/usuario-atual", () => {
    it("deve retornar os dados do usuário logado se o token for válido", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/usuario-atual")
        .set("Authorization", `Bearer ${accessTokenAtivo}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados.usuario).toHaveProperty("email", emailAtivo);
      expect(response.body.dados.usuario).toHaveProperty("nome", "Usuário Ativo");
      expect(response.body.dados.usuario).not.toHaveProperty("senhaHash");
    });

    it("deve retornar 401 se não enviar o token", async () => {
      const response = await request(app)
        .get("/api/v1/autenticacao/usuario-atual")
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/autenticacao/atualizar-token", () => {
    it("deve renovar a sessão rotacionando o refresh token", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/atualizar-token")
        .set("X-Internal-Token", tokenInterno)
        .send({
          refreshToken: refreshTokenAtivo,
        });

      expect(response.status).toBe(200);
      expect(response.body.dados).toHaveProperty("accessToken");
      expect(response.body.dados).toHaveProperty("refreshToken");

      expect(response.body.dados.refreshToken).not.toBe(refreshTokenAtivo);
      
      accessTokenAtivo = response.body.dados.accessToken;
      refreshTokenAtivo = response.body.dados.refreshToken;
    });

    it("deve retornar erro 401 se tentar usar o token antigo (revogado)", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/atualizar-token")
        .set("X-Internal-Token", tokenInterno)
        .send({
          refreshToken: "um-token-falso-qualquer",
        });

      expect(response.status).toBe(401);
      expect(response.body.erro.codigo).toBe("TOKEN_INVALIDO");
    });
  });

  describe("POST /api/v1/autenticacao/sair", () => {
    it("deve realizar o logout revogando o refresh token com sucesso (204)", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/sair")
        .set("Authorization", `Bearer ${accessTokenAtivo}`)
        .set("X-Internal-Token", tokenInterno)
        .send({
          refreshToken: refreshTokenAtivo,
        });

      expect(response.status).toBe(204); 
    });

    it("não deve permitir renovar o token após o logout (token foi revogado)", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/atualizar-token")
        .set("X-Internal-Token", tokenInterno)
        .send({
          refreshToken: refreshTokenAtivo,
        });

      expect(response.status).toBe(401);
      expect(response.body.erro.codigo).toBe("TOKEN_INVALIDO");
    });
  });
});