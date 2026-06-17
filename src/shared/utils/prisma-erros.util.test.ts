import { Prisma } from "@prisma/client";

import {
  ehErroDeCampoUnicoDuplicado,
  ehRegistroNaoEncontrado,
} from "@/shared/utils/prisma-erros.util";

function criarErroPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.17.1",
    meta,
  });
}

describe("prisma-erros.util", () => {
  test("identifica erro unico P2002 por target em lista", () => {
    const erro = criarErroPrisma("P2002", { target: ["nickname"] });

    expect(ehErroDeCampoUnicoDuplicado(erro, "nickname")).toBe(true);
    expect(ehErroDeCampoUnicoDuplicado(erro, "email")).toBe(false);
  });

  test("identifica erro unico P2002 por target textual", () => {
    const erro = criarErroPrisma("P2002", { target: "usuarios_nickname_key" });

    expect(ehErroDeCampoUnicoDuplicado(erro, "nickname")).toBe(true);
  });

  test("identifica erro SQL 23505 por constraint", () => {
    const erro = criarErroPrisma("P2010", {
      code: "23505",
      message: 'duplicate key value violates unique constraint "usuarios_nickname_key"',
    });

    expect(ehErroDeCampoUnicoDuplicado(erro, "nickname")).toBe(true);
  });

  test("ignora erros que nao representam campo unico duplicado", () => {
    expect(ehErroDeCampoUnicoDuplicado(new Error("falha"), "nickname")).toBe(false);
    expect(ehErroDeCampoUnicoDuplicado(criarErroPrisma("P2010"), "nickname")).toBe(false);
  });

  test("identifica registro nao encontrado P2025", () => {
    expect(ehRegistroNaoEncontrado(criarErroPrisma("P2025"))).toBe(true);
    expect(ehRegistroNaoEncontrado(criarErroPrisma("P2002"))).toBe(false);
  });
});
