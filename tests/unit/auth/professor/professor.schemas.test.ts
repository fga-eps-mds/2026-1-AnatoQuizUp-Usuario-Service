import { schemaRegistrarProfessor } from "@/modules/auth/professor/professor.schemas";

const dadosValidos = {
  nome: "Hilmer Rodrigues Neri",
  email: "hilmer@medicina.unb.br",
  siape: "1234567",
  instituicao: "UnB",
  departamento: "Anatomia",
  curso: "Medicina",
  senha: "senhaValida123",
  confirmacaoSenha: "senhaValida123",
};

describe("schemaRegistrarProfessor", () => {
  test("aceita cadastro valido com subdominio UnB", () => {
    const resultado = schemaRegistrarProfessor.safeParse(dadosValidos);

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.email).toBe("hilmer@medicina.unb.br");
    }
  });

  test("aceita email diretamente em unb.br", () => {
    const resultado = schemaRegistrarProfessor.safeParse({
      ...dadosValidos,
      email: "HILMER@UNB.BR",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.email).toBe("hilmer@unb.br");
    }
  });

  test("rejeita email fora do dominio UnB", () => {
    const resultado = schemaRegistrarProfessor.safeParse({
      ...dadosValidos,
      email: "hilmer@gmail.com",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["email"],
            message: "Email institucional UnB obrigatorio.",
          }),
        ]),
      );
    }
  });

  test("rejeita SIAPE com formato invalido", () => {
    const resultado = schemaRegistrarProfessor.safeParse({
      ...dadosValidos,
      siape: "123456",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["siape"],
            message: "SIAPE invalido.",
          }),
        ]),
      );
    }
  });

  test("rejeita senha curta", () => {
    const resultado = schemaRegistrarProfessor.safeParse({
      ...dadosValidos,
      senha: "1234567",
      confirmacaoSenha: "1234567",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["senha"],
          }),
        ]),
      );
    }
  });

  test("rejeita senhas diferentes", () => {
    const resultado = schemaRegistrarProfessor.safeParse({
      ...dadosValidos,
      confirmacaoSenha: "senhaDiferente123",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["confirmacaoSenha"],
            message: "Confirmacao de senha deve ser igual a senha.",
          }),
        ]),
      );
    }
  });
});
