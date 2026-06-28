import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import type { RegistrarProfessorDto } from "@/modules/auth/professor/dto/registrar.professor.types";
import {
  converterParaRespostaProfessor,
  type RespostaProfessorDto,
} from "@/modules/auth/professor/dto/resposta.professor.types";
import type { ProfessorAuthRepository } from "@/modules/auth/professor/professor.repository";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { PAPEIS, STATUS_USUARIO } from "@/shared/constants/papeis";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import { normalizarEspacos } from "@/shared/utils/formatacao.util";

// Service de cadastro de professor. Diferente do aluno, o professor entra PENDENTE
// (aguardando aprovacao de um admin) e tem SIAPE unico alem do email.

// Custo do hash bcrypt da senha.
const BCRYPT_SALT_ROUNDS = 10;

// Normaliza email (sem espacos, minusculo) para comparacao consistente.
function normalizarEmail(value: string) {
  return value.trim().toLowerCase();
}

// Remove espacos extras de textos livres.
function normalizarTexto(value: string) {
  return normalizarEspacos(value);
}

/**
 * Detecta violacao de unicidade do Prisma para email ou siape.
 *
 * Cobre o erro tipado P2002 e o P2010 (SQL cru, codigo 23505 do Postgres),
 * permitindo converter corridas de concorrencia em erro de conflito amigavel.
 *
 * @param error Erro lancado pelo Prisma.
 * @param campo Campo unico que pode ter sido duplicado.
 * @returns true se for duplicidade desse campo.
 */
function ehErroDeCampoUnicoDuplicado(error: unknown, campo: "email" | "siape") {
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

export class ProfessorAuthService {
  constructor(private readonly professorAuthRepository: ProfessorAuthRepository) {}

  /**
   * Registra um novo professor com status PENDENTE (aguarda aprovacao do admin).
   *
   * Faz checagem previa de email e SIAPE duplicados, gera o hash da senha e fixa a
   * instituicao como "UnB". O catch repete a checagem para cobrir concorrencia.
   *
   * @param input Dados de cadastro do professor.
   * @returns DTO do professor recem-criado (pendente).
   * @throws ErroAplicacao 409 quando email ou SIAPE ja existem.
   */
  async registrar(input: RegistrarProfessorDto): Promise<RespostaProfessorDto> {
    const email = normalizarEmail(input.email);
    const siape = input.siape.trim();

    // Checagem previa de email para erro amigavel antes de inserir.
    const usuarioComEmail = await this.professorAuthRepository.buscarPorEmail(email);

    if (usuarioComEmail) {
      throw this.criarErroEmailDuplicado(email);
    }

    // Checagem previa de SIAPE (matricula funcional unica do professor).
    const usuarioComSiape = await this.professorAuthRepository.buscarPorSiape(siape);

    if (usuarioComSiape) {
      throw this.criarErroSiapeDuplicado(siape);
    }

    // Guarda apenas o hash da senha.
    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_SALT_ROUNDS);

    try {
      const professorCriado = await this.professorAuthRepository.criar({
        nome: normalizarTexto(input.nome),
        email,
        senhaHash,
        instituicao: "UnB",
        departamento: normalizarTexto(input.departamento),
        curso: normalizarTexto(input.curso),
        siape,
        papel: PAPEIS.PROFESSOR,
        status: STATUS_USUARIO.PENDENTE,
      });

      return converterParaRespostaProfessor(professorCriado);
    } catch (error) {
      // Rede de seguranca contra concorrencia: traduz violacao de unicidade do banco.
      if (ehErroDeCampoUnicoDuplicado(error, "email")) {
        throw this.criarErroEmailDuplicado(email);
      }

      if (ehErroDeCampoUnicoDuplicado(error, "siape")) {
        throw this.criarErroSiapeDuplicado(siape);
      }

      throw error;
    }
  }

  // Erro 409 padronizado para email ja cadastrado.
  private criarErroEmailDuplicado(email: string) {
    return new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.emailJaCadastrado,
      detalhes: { email },
    });
  }

  // Erro 409 padronizado para SIAPE ja cadastrado.
  private criarErroSiapeDuplicado(siape: string) {
    return new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.siapeJaCadastrado,
      detalhes: { siape },
    });
  }
}
