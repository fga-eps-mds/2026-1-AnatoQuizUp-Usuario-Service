import request from "supertest";
import jwt from "jsonwebtoken";
import { aplicacao as app } from "../../../src/config/app"; 
import { prisma } from "@/config/db";

describe("Integração: Rotas de Amizade", () => {
  const idsUsuariosCriados: string[] = [];

  let tokenAlunoA: string;
  let tokenAlunoB: string;
  let tokenAlunoC: string;

  let alunoAId: string;
  let alunoBId: string;
  let alunoCId: string;

  let solicitacaoId: string;

  const tokenInterno = process.env.INTERNAL_TOKEN;
  const jwtSecret = process.env.JWT_SECRET_KEY;

  beforeAll(async () => {
    const alunoA = await prisma.usuario.create({
      data: {
        nome: "Aluno A",
        email: "aluno.a@anatoquizup.com",
        senha: "hash",
        perfil: "ALUNO",
        status: "ATIVO",
        visivel: true,
      },
    });

    const alunoB = await prisma.usuario.create({
      data: {
        nome: "Aluno B",
        email: "aluno.b@anatoquizup.com",
        senha: "hash",
        perfil: "ALUNO",
        status: "ATIVO",
        visivel: true,
      },
    });

    const alunoC = await prisma.usuario.create({
      data: {
        nome: "Aluno Invisível",
        email: "aluno.c@anatoquizup.com",
        senha: "hash",
        perfil: "ALUNO",
        status: "ATIVO",
        visivel: false, 
      },
    });

    alunoAId = alunoA.id;
    alunoBId = alunoB.id;
    alunoCId = alunoC.id;
    idsUsuariosCriados.push(alunoAId, alunoBId, alunoCId);

    tokenAlunoA = jwt.sign({ id: alunoA.id, perfil: alunoA.perfil, papel: "ALUNO" }, jwtSecret, { expiresIn: "1h" });
    tokenAlunoB = jwt.sign({ id: alunoB.id, perfil: alunoB.perfil, papel: "ALUNO" }, jwtSecret, { expiresIn: "1h" });
    tokenAlunoC = jwt.sign({ id: alunoC.id, perfil: alunoC.perfil, papel: "ALUNO" }, jwtSecret, { expiresIn: "1h" });
  });

  afterAll(async () => {
    await prisma.amizade.deleteMany({
      where: {
        OR: [
          { usuarioOrigemId: { in: idsUsuariosCriados } },
          { usuarioDestinoId: { in: idsUsuariosCriados } }
        ]
      }
    });

    await prisma.usuario.deleteMany({
      where: { id: { in: idsUsuariosCriados } },
    });
  });

  describe("Visibilidade e Busca de Amigos", () => {
    it("deve buscar possíveis amigos (ALUNO B), mas não listar quem está invisível (ALUNO C)", async () => {
      const response = await request(app)
        .get("/api/v1/amizade/busca")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      
      const achouB = response.body.dados.some((u: { id: string }) => u.id === alunoBId);
      const achouC = response.body.dados.some((u: { id: string }) => u.id === alunoCId);
      
      expect(achouB).toBe(true);
      expect(achouC).toBe(false);
    });

    it("deve alterar a própria visibilidade com sucesso", async () => {
      const response = await request(app)
        .patch("/api/v1/amizade/visibilidade")
        .set("Authorization", `Bearer ${tokenAlunoC}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ visivel: true }); 

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Visibilidade alterada com sucesso");
    });
  });

  describe("Envio de Solicitações", () => {
    it("deve retornar erro 400 ao tentar enviar solicitação para si mesmo", async () => {
      const response = await request(app)
        .post("/api/v1/amizade")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ id: alunoAId });

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("SOLICITACAO_PARA_SI_MESMO");
    });

    it("deve enviar solicitação de amizade do Aluno A para o Aluno B com sucesso", async () => {
      const response = await request(app)
        .post("/api/v1/amizade")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ id: alunoBId });

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Solicitação enviada com sucesso");
      
      solicitacaoId = response.body.solicitacao.id; 
    });

    it("deve retornar erro 400 ao tentar enviar solicitação para quem já tem convite pendente", async () => {
      const response = await request(app)
        .post("/api/v1/amizade")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ id: alunoBId });

      expect(response.status).toBe(400);
      expect(response.body.erro.codigo).toBe("SOLICITACAO_JA_ENVIADA");
    });
  });

  describe("Listagem e Processamento de Convites", () => {
    it("deve listar o convite nos 'Enviados' do Aluno A", async () => {
      const response = await request(app)
        .get("/api/v1/amizade/convites/enviados")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(
        response.body.dados.some((c: { id: string }) => c.id === solicitacaoId)
      ).toBe(true);
    });

    it("deve listar o convite nos 'Recebidos' do Aluno B", async () => {
      const response = await request(app)
        .get("/api/v1/amizade/convites/recebidos")
        .set("Authorization", `Bearer ${tokenAlunoB}`) 
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(
        response.body.dados.some((c: { id: string }) => c.id === solicitacaoId)
      ).toBe(true);
    });

    it("deve aceitar o convite (Aluno B aceita solicitação de Aluno A)", async () => {
      const response = await request(app)
        .patch("/api/v1/amizade/aceitar")
        .set("Authorization", `Bearer ${tokenAlunoB}`) 
        .set("X-Internal-Token", tokenInterno)
        .send({ id: solicitacaoId }); 

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Solicitação processada com sucesso");
    });
  });

  describe("Lista de Amigos e Desfazer Amizade", () => {
    it("deve listar o Aluno B na lista de amigos do Aluno A", async () => {
      const response = await request(app)
        .get("/api/v1/amizade")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno);

      expect(response.status).toBe(200);
      expect(
        response.body.dados.some((a: { usuarioDestinoId: string }) => a.usuarioDestinoId === alunoBId)
      ).toBe(true);
    });

    it("deve desfazer a amizade com sucesso", async () => {
      const response = await request(app)
        .delete("/api/v1/amizade")
        .set("Authorization", `Bearer ${tokenAlunoA}`)
        .set("X-Internal-Token", tokenInterno)
        .send({ id: solicitacaoId });

      expect(response.status).toBe(200);
      expect(response.body.mensagem).toBe("Amizade desfeita com sucesso");
    });
  });
});