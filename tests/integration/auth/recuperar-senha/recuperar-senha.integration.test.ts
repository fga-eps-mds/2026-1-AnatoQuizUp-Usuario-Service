import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { aplicacao as app } from "../../../../src/config/app";
import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";
import { enviarEmailRedefinicaoSenha } from "@/shared/services/emailService";

jest.mock("@/shared/services/emailService", () => ({
  enviarEmailRedefinicaoSenha: jest.fn(),
}));

describe("Integração: Rotas de Recuperação de Senha", () => {
  const idsUsuariosCriados: string[] = [];
  let usuarioId: string;
  let tokenValido: string;

  const emailTeste = "testerecuperacao@anatoquizup.com";
  const senhaAntiga = "senhaAntiga123";
  const senhaNova = "senhaNova123";

  const tokenInterno = process.env.INTERNAL_TOKEN;

  beforeAll(async () => {
    await prisma.usuario.deleteMany({
      where: { email: emailTeste },
    });

    const senhaHash = await bcrypt.hash(senhaAntiga, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome: "Usuário Recuperação",
        email: emailTeste,
        senha: senhaHash,
        perfil: "ALUNO",
        status: "ATIVO",
      },
    });

    usuarioId = usuario.id;
    idsUsuariosCriados.push(usuarioId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (idsUsuariosCriados.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM tokens_redefinicao_senha WHERE "usuarioId" IN (${Prisma.join(idsUsuariosCriados)})
      `;
      await prisma.usuario.deleteMany({
        where: { id: { in: idsUsuariosCriados } },
      });
    }
  });

  describe("POST /api/v1/autenticacao/recuperar-senha", () => {
    it("deve retornar 200, criar token e enviar email se o usuário existir", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/recuperar-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({ email: emailTeste });

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Se o email existir no sistema, enviamos instrucoes.");

      expect(enviarEmailRedefinicaoSenha).toHaveBeenCalledTimes(1);
      expect(enviarEmailRedefinicaoSenha).toHaveBeenCalledWith(
        emailTeste,
        expect.any(String)
      );

      const tokensBanco = await prisma.$queryRaw<{ token: string }[]>`
        SELECT token FROM tokens_redefinicao_senha 
        WHERE "usuarioId" = ${usuarioId} 
        ORDER BY "criadoEm" DESC LIMIT 1
      `;
      
      expect(tokensBanco.length).toBe(1);
      tokenValido = tokensBanco[0].token;
    });

    it("deve retornar 200 silenciosamente (sem enviar email) se o email não existir", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/recuperar-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({ email: "naoexiste.recuperacao@anatoquizup.com" });

      expect(response.status).toBe(200);
      expect(enviarEmailRedefinicaoSenha).not.toHaveBeenCalled();
    });

    it("deve retornar 400 se o email for inválido", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/recuperar-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({ email: "email-invalido" });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/autenticacao/redefinir-senha", () => {
    it("deve retornar 400 se a nova senha tiver menos de 8 caracteres", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/redefinir-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({
          token: tokenValido,
          senha: "curta",
        });

      expect(response.status).toBe(400);
    });

    it("deve retornar 400 se o token for inválido", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/redefinir-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({
          token: "token-falso-inventado",
          senha: senhaNova,
        });

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("TOKEN_INVALIDO");
    });

    it("deve redefinir a senha com sucesso com um token válido", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/redefinir-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({
          token: tokenValido,
          senha: senhaNova,
        });

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Senha redefinida com sucesso.");

      const usuarioAtualizado = await prisma.usuario.findUnique({
        where: { id: usuarioId },
      });
      const senhaAlterada = await bcrypt.compare(senhaNova, usuarioAtualizado!.senha);
      expect(senhaAlterada).toBe(true);
    });

    it("deve retornar 400 se tentar usar o mesmo token que já foi usado", async () => {
      const response = await request(app)
        .post("/api/v1/autenticacao/redefinir-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({
          token: tokenValido,
          senha: "outraSenhaQualquer",
        });

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("TOKEN_INVALIDO");
    });

    it("deve retornar 400 se o token estiver expirado", async () => {
      const tokenExpirado = randomUUID();
      const dataPassada = new Date(Date.now() - 2 * 60 * 60 * 1000); 

      await prisma.$executeRaw`
        INSERT INTO tokens_redefinicao_senha (id, token, "usuarioId", "expiraEm", "criadoEm")
        VALUES (${randomUUID()}, ${tokenExpirado}, ${usuarioId}, ${dataPassada}, NOW())
      `;

      const response = await request(app)
        .post("/api/v1/autenticacao/redefinir-senha")
        .set("X-Internal-Token", tokenInterno)
        .send({
          token: tokenExpirado,
          senha: senhaNova,
        });

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("TOKEN_INVALIDO");
    });
  });
});