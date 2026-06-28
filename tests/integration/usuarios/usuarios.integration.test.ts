import request from "supertest";
import jwt from "jsonwebtoken";
import { aplicacao as app } from "../../../src/config/app"; 
import { prisma } from "@/config/db";

describe("Integração: Rotas de Usuários", () => {
  const idsCriados: string[] = [];
  
  let tokenGestor: string;
  const tokenInterno = process.env.INTERNAL_TOKEN ;

  beforeAll(async () => {
    const aluno1 = await prisma.usuario.create({
      data: {
        nome: "Aluno Teste Integração 1",
        email: "aluno1.teste@anatoquizup.com",
        senha: "hash_qualquer",
        perfil: "ALUNO",
        status: "ATIVO",
      },
    });

    const aluno2 = await prisma.usuario.create({
      data: {
        nome: "Aluno Teste Integração 2",
        email: "aluno2.teste@anatoquizup.com",
        senha: "hash_qualquer",
        perfil: "ALUNO",
        status: "ATIVO",
      },
    });

    // Criamos um usuário gestor para gerar o token válido
    const gestor = await prisma.usuario.create({
      data: {
        nome: "Admin Teste",
        email: "admin.teste@anatoquizup.com",
        senha: "hash_qualquer",
        perfil: "ADMIN", // ou "PROFESSOR", dependendo do que o seu banco aceita
        status: "ATIVO",
      },
    });

    idsCriados.push(aluno1.id, aluno2.id, gestor.id);
    const jwtSecret = process.env.JWT_SECRET_KEY;
    tokenGestor = jwt.sign({ id: gestor.id, perfil: gestor.perfil }, jwtSecret, {
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

  describe("GET /api/v1/usuarios/alunos", () => {
    it("deve retornar uma lista paginada de alunos", async () => {
      const response = await request(app)
        .get("/api/v1/usuarios/alunos")
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("dados");
      expect(response.body).toHaveProperty("metadados");
      expect(Array.isArray(response.body.dados)).toBe(true);
    });

    it("deve filtrar alunos pelo nome (busca)", async () => {
      const response = await request(app)
        .get("/api/v1/usuarios/alunos?busca=Aluno Teste Integração 1")
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(
        response.body.dados.some((u: { nome: string }) => u.nome === "Aluno Teste Integração 1")
      ).toBe(true);
    });
  });

  describe("GET /api/v1/usuarios (Buscar por IDs)", () => {
    it("deve retornar usuários quando IDs válidos forem fornecidos", async () => {
      const idsQuery = `${idsCriados[0]},${idsCriados[1]}`;
      const response = await request(app)
        .get(`/api/v1/usuarios?ids=${idsQuery}`)
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Usuarios encontrados com sucesso."); 
      expect(response.body.dados).toHaveLength(2);
    });

    it("deve retornar erro do Zod (400) se houver IDs duplicados", async () => {
      const idsDuplicados = `${idsCriados[0]},${idsCriados[0]}`;
      const response = await request(app)
        .get(`/api/v1/usuarios?ids=${idsDuplicados}`)
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/usuarios/:id (Buscar por ID Público)", () => {
    it("deve retornar dados públicos do usuário com sucesso", async () => {
      const idTeste = idsCriados[0]; 
      const response = await request(app)
        .get(`/api/v1/usuarios/${idTeste}`)
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(response.body.dados).toHaveProperty("id", idTeste);
      expect(response.body.dados).toHaveProperty("nome", "Aluno Teste Integração 1");
      expect(response.body.dados).toHaveProperty("papel", "ALUNO");
      
      expect(response.body.dados).not.toHaveProperty("email");
    });

    it("deve retornar erro 404 se o usuário não existir", async () => {
      const idInexistente = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/v1/usuarios/${idInexistente}`)
        .set("Authorization", `Bearer ${tokenGestor}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(404);
      expect(response.body.erro).toHaveProperty("codigo", "NAO_ENCONTRADO");
    });
  });
});