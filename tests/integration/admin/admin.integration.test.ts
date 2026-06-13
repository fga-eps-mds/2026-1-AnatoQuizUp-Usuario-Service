import request from "supertest";
import jwt from "jsonwebtoken";
import { aplicacao as app } from "../../../src/config/app"; 
import { prisma } from "@/config/db";

describe("Integração: Rotas de Admin (Gestão de Usuários)", () => {
  const idsCriados: string[] = [];
  let tokenAdmin: string;
  let adminId: string;
  
  let profPendenteId: string;
  let alunoAtivoId: string;
  let outroAdminId: string;

  const tokenInterno = process.env.INTERNAL_TOKEN;

  beforeAll(async () => {
    const admin = await prisma.usuario.create({
      data: {
        nome: "Admin Principal",
        email: "admin.principal@anatoquizup.com",
        senha: "hash",
        perfil: "ADMIN",
        status: "ATIVO",
      },
    });
    adminId = admin.id;

    const profPendente = await prisma.usuario.create({
      data: {
        nome: "Professor Pendente",
        email: "prof.pendente@anatoquizup.com",
        senha: "hash",
        perfil: "PROFESSOR",
        status: "PENDENTE",
      },
    });
    profPendenteId = profPendente.id;

    const alunoAtivo = await prisma.usuario.create({
      data: {
        nome: "Aluno Ativo",
        email: "aluno.ativo@anatoquizup.com",
        senha: "hash",
        perfil: "ALUNO",
        status: "ATIVO",
      },
    });
    alunoAtivoId = alunoAtivo.id;

    const outroAdmin = await prisma.usuario.create({
      data: {
        nome: "Outro Admin",
        email: "outro.admin@anatoquizup.com",
        senha: "hash",
        perfil: "ADMIN",
        status: "ATIVO",
      },
    });
    outroAdminId = outroAdmin.id;

    idsCriados.push(admin.id, profPendente.id, alunoAtivo.id, outroAdmin.id);

    const jwtSecret = process.env.JWT_SECRET_KEY;
    tokenAdmin = jwt.sign({ id: admin.id, perfil: admin.perfil, papel: "ADMINISTRADOR" }, jwtSecret, {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    if (idsCriados.length > 0) {
      await prisma.usuario.deleteMany({
        where: { id: { in: idsCriados } },
      });
    }
  });

  describe("GET /api/v1/admin/usuarios", () => {
    it("deve listar usuários com sucesso e omitir as senhas", async () => {
      const response = await request(app)
        .get("/api/v1/admin/usuarios")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("dados");
      expect(response.body).toHaveProperty("metadados");
      
      const primeiroUsuario = response.body.dados[0];
      expect(primeiroUsuario).not.toHaveProperty("senha");
    });
  });

  describe("GET /api/v1/admin/usuarios/:id", () => {
    it("deve buscar um usuário específico por ID", async () => {
      const response = await request(app)
        .get(`/api/v1/admin/usuarios/${alunoAtivoId}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados).toHaveProperty("id", alunoAtivoId);
      expect(response.body.dados).toHaveProperty("email", "aluno.ativo@anatoquizup.com");
      expect(response.body.dados).not.toHaveProperty("senha");
    });

    it("deve retornar 404 se o usuário não for encontrado", async () => {
      const idInexistente = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/v1/admin/usuarios/${idInexistente}`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(404);
      expect(response.body.erro).toHaveProperty("codigo", "NAO_ENCONTRADO");
    });
  });

  describe("PATCH /api/v1/admin/usuarios/:id/status", () => {
    it("deve aprovar um PROFESSOR PENDENTE, alterando para ACTIVE e registrando o aprovador", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/usuarios/${profPendenteId}/status`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ status: "ACTIVE" });

      expect(response.status).toBe(200);
      expect(response.body.dados).toHaveProperty("status", "ATIVO");
      expect(response.body.dados).toHaveProperty("aprovadoPorId", adminId);
      expect(response.body.dados.aprovadoEm).not.toBeNull();
    });

    it("deve desativar um ALUNO ATIVO mudando para INACTIVE", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/usuarios/${alunoAtivoId}/status`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ status: "INACTIVE" });

      expect(response.status).toBe(200);
      expect(response.body.dados).toHaveProperty("status", "INATIVO");
    });

    it("deve retornar 403 ao tentar alterar o status de outro ADMIN", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/usuarios/${outroAdminId}/status`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ status: "INACTIVE" });

      expect(response.status).toBe(403);
      expect(response.body.erro).toHaveProperty("codigo", "PROIBIDO");
    });

    it("deve retornar 403 se o próprio Admin tentar se desativar", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/usuarios/${adminId}/status`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ status: "INACTIVE" });

      expect(response.status).toBe(403);
      expect(response.body.erro).toHaveProperty("codigo", "PROIBIDO");
    });

    it("deve retornar 400 (Erro de Validação) se enviar um status inválido", async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/usuarios/${alunoAtivoId}/status`)
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ status: "STATUS_BATATA" });

      expect(response.status).toBe(400);
    });
  });
});