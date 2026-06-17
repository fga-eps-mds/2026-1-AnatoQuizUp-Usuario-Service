import { Prisma } from "@prisma/client";

export function ehErroDeCampoUnicoDuplicado(error: unknown, campo: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2002") {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.includes(campo);
    }

    return String(target ?? "").includes(campo);
  }

  if (error.code !== "P2010" || typeof error.meta !== "object" || error.meta === null) {
    return false;
  }

  const meta = error.meta as Record<string, unknown>;
  const mensagem = String(meta.message ?? "");

  return meta.code === "23505" && mensagem.includes(`usuarios_${campo}_key`);
}

export function ehRegistroNaoEncontrado(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
