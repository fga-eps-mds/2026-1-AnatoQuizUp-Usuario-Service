import {
  PerfilUsuario,
  PrismaClient,
  StatusAmizade,
  StatusUsuario,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.amizade.deleteMany();
  await prisma.exemplo.deleteMany();

  await prisma.exemplo.createMany({
    data: [
      {
        nome: "Questao introdutoria",
        descricao: "Primeiro registro para validar a estrutura inicial da API.",
      },
      {
        nome: "Questao de anatomia basica",
        descricao: "Segundo registro usado no seed local.",
      },
    ],
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@anatoquizup.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  const senhaHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.usuario.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      nome: "Administrador",
      senha: senhaHash,
      perfil: PerfilUsuario.ADMIN,
      status: StatusUsuario.ATIVO,
    },
    create: {
      nome: "Administrador",
      email: adminEmail,
      senha: senhaHash,
      perfil: PerfilUsuario.ADMIN,
      status: StatusUsuario.ATIVO,
    },
  });

  const professorEmail = process.env.PROFESSOR_EMAIL ?? "professor@anatoquizup.com";
  const professorPassword = process.env.PROFESSOR_PASSWORD ?? "professor123";

  const senhaProfessorHash = await bcrypt.hash(professorPassword, 10);

  const professor = await prisma.usuario.upsert({
    where: { email: professorEmail },
    update: {
      nome: "Professor Seed",
      senha: senhaProfessorHash,
      perfil: PerfilUsuario.PROFESSOR,
      status: StatusUsuario.ATIVO,
      departamento: "Departamento de Anatomia",
      siape: "0000001",
    },
    create: {
      nome: "Professor Seed",
      email: professorEmail,
      senha: senhaProfessorHash,
      perfil: PerfilUsuario.PROFESSOR,
      status: StatusUsuario.ATIVO,
      departamento: "Departamento de Anatomia",
      siape: "0000001",
    },
  });

  const senhaAlunoHash = await bcrypt.hash("123456", 10);

  const aluno1 = await prisma.usuario.upsert({
    where: { email: "joao@seed.com" },
    update: {},
    create: {
      nome: "João Silva",
      nickname: "joaos",
      email: "joao@seed.com",
      senha: senhaAlunoHash,
      perfil: PerfilUsuario.ALUNO,
      status: StatusUsuario.ATIVO,
      curso: "Medicina",
      semestre: "5",
    },
  });

  const aluno2 = await prisma.usuario.upsert({
    where: { email: "maria@seed.com" },
    update: {},
    create: {
      nome: "Maria Souza",
      nickname: "maria",
      email: "maria@seed.com",
      senha: senhaAlunoHash,
      perfil: PerfilUsuario.ALUNO,
      status: StatusUsuario.ATIVO,
      curso: "Enfermagem",
      semestre: "3",
    },
  });

  const aluno3 = await prisma.usuario.upsert({
    where: { email: "pedro@seed.com" },
    update: {},
    create: {
      nome: "Pedro Santos",
      nickname: "pedrao",
      email: "pedro@seed.com",
      senha: senhaAlunoHash,
      perfil: PerfilUsuario.ALUNO,
      status: StatusUsuario.ATIVO,
      curso: "Fisioterapia",
      semestre: "7",
    },
  });

  const aluno4 = await prisma.usuario.upsert({
    where: { email: "ana@seed.com" },
    update: {},
    create: {
      nome: "Ana Costa",
      nickname: "aninha",
      email: "ana@seed.com",
      senha: senhaAlunoHash,
      perfil: PerfilUsuario.ALUNO,
      status: StatusUsuario.ATIVO,
      curso: "Nutrição",
      semestre: "2",
    },
  });

    const aluno5 = await prisma.usuario.upsert({
    where: { email: "clara@seed.com" },
    update: {},
    create: {
      nome: "Clara Oscuro",
      nickname: "clarinha",
      email: "clara@seed.com",
      senha: senhaAlunoHash,
      perfil: PerfilUsuario.ALUNO,
      status: StatusUsuario.ATIVO,
      curso: "Nutrição",
      semestre: "2",
      visivel:false,
    },
  });

  await prisma.amizade.createMany({
    data: [
      // amizade aceita
      {
        usuarioOrigemId: admin.id,
        usuarioDestinoId: aluno1.id,
        statusAmizade: StatusAmizade.ATIVO,
      },

      // solicitação enviada pelo admin
      {
        usuarioOrigemId: admin.id,
        usuarioDestinoId: aluno2.id,
        statusAmizade: StatusAmizade.PENDENTE,
      },

      // solicitação recebida pelo admin
      {
        usuarioOrigemId: aluno3.id,
        usuarioDestinoId: admin.id,
        statusAmizade: StatusAmizade.PENDENTE,
      },

      // solicitação recusada
      {
        usuarioOrigemId: admin.id,
        usuarioDestinoId: aluno4.id,
        statusAmizade: StatusAmizade.RECUSADO,
      },

      // amizade entre professor e aluno
      {
        usuarioOrigemId: professor.id,
        usuarioDestinoId: aluno1.id,
        statusAmizade: StatusAmizade.ATIVO,
      },

      {
        usuarioOrigemId: aluno1.id,
        usuarioDestinoId: aluno2.id,
        statusAmizade: StatusAmizade.ATIVO,
      }
    ],
    skipDuplicates: true,
  });

  console.log("Seed executado com sucesso.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Falha ao executar o seed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });