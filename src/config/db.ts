import { PrismaClient } from "@prisma/client";

// Cliente Prisma compartilhado pela aplicacao. Reaproveita a instancia via global
// fora de producao para evitar multiplas conexoes durante hot-reload em dev/teste.
declare global {
  var __prisma__: PrismaClient | undefined;
}

const prismaClient =
  global.__prisma__ ??
  new PrismaClient({
    log: ["warn", "error"],
  });

// So guarda no global fora de producao (em producao cada processo tem o seu cliente).
if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prismaClient;
}

export const prisma = prismaClient;

// Abre a conexao com o banco na subida do servidor.
export async function conectarBancoDeDados() {
  await prisma.$connect();
}

// Fecha a conexao no encerramento gracioso do servidor.
export async function desconectarBancoDeDados() {
  await prisma.$disconnect();
}
