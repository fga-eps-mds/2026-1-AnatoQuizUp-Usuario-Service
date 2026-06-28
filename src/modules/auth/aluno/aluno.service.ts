import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import type { AlunoAuthRepository } from "@/modules/auth/aluno/aluno.repository";
import type {
  DisponibilidadeEmailAlunoDto,
  DisponibilidadeNicknameAlunoDto,
  RegistrarAlunoDto,
} from "@/modules/auth/aluno/dto/registrar.aluno.types";
import {
  converterParaRespostaAluno,
  type RespostaAlunoDto,
} from "@/modules/auth/aluno/dto/resposta.aluno.types";
import { MENSAGENS } from "@/shared/constants/mensagens";
import { PAPEIS, STATUS_USUARIO } from "@/shared/constants/papeis";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import { normalizarEspacos } from "@/shared/utils/formatacao.util";

// Service de cadastro/autenticacao de alunos: checa disponibilidade de nickname/email,
// registra novos alunos (com hash de senha) e normaliza os dados de entrada.

// Custo do bcrypt no hash da senha (maior = mais seguro e mais lento).
const BCRYPT_SALT_ROUNDS = 10;

// Remove espacos duplicados/extras de um texto livre.
function normalizarTexto(value: string) {
  return normalizarEspacos(value);
}

// Converte a data (YYYY-MM-DD) para Date em meia-noite UTC, evitando deslocar o dia.
function converterDataNascimento(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

// Nickname e email sao comparados sempre normalizados (sem espacos, minusculos).
function normalizarNickname(value: string) {
  return value.trim().toLowerCase();
}

function normalizarEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Detecta se um erro do Prisma e violacao de unicidade do campo informado.
 *
 * Cobre dois formatos: o erro tipado P2002 (com o campo em meta.target) e o P2010
 * (SQL cru), inspecionando o codigo 23505 do Postgres e o nome da constraint.
 * Permite traduzir corridas de concorrencia em erro de conflito amigavel.
 *
 * @param error Erro lancado pelo Prisma.
 * @param campo Campo unico que pode ter sido duplicado.
 * @returns true se o erro for de duplicidade desse campo.
 */
function ehErroDeCampoUnicoDuplicado(error: unknown, campo: "email" | "nickname") {
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

// Resposta da checagem de nickname: eco do valor normalizado + se esta livre.
export type RespostaDisponibilidadeNicknameDto = {
  nickname: string;
  disponivel: boolean;
};

// Resposta da checagem de email: eco do valor normalizado + se esta livre.
export type RespostaDisponibilidadeEmailDto = {
  email: string;
  disponivel: boolean;
};

export class AlunoAuthService {
  constructor(private readonly alunoAuthRepository: AlunoAuthRepository) {}

  /**
   * Verifica se um nickname esta disponivel para cadastro.
   *
   * @param input DTO com o nickname desejado.
   * @returns O nickname normalizado e se esta disponivel.
   */
  async verificarNicknameDisponivel(
    input: DisponibilidadeNicknameAlunoDto,
  ): Promise<RespostaDisponibilidadeNicknameDto> {
    const nickname = normalizarNickname(input.nickname);
    const alunoExistente = await this.alunoAuthRepository.buscarPorNickname(nickname);

    return {
      nickname,
      disponivel: !alunoExistente,
    };
  }

  /**
   * Verifica se um email esta disponivel para cadastro.
   *
   * @param input DTO com o email desejado.
   * @returns O email normalizado e se esta disponivel.
   */
  async verificarEmailDisponivel(
    input: DisponibilidadeEmailAlunoDto,
  ): Promise<RespostaDisponibilidadeEmailDto> {
    const email = normalizarEmail(input.email);
    const alunoExistente = await this.alunoAuthRepository.buscarPorEmail(email);

    return {
      email,
      disponivel: !alunoExistente,
    };
  }

  /**
   * Registra um novo aluno.
   *
   * Faz a checagem previa de email/nickname duplicados, gera o hash da senha e
   * persiste o aluno ja ATIVO. A verificacao de duplicidade tambem e repetida no
   * catch para cobrir corridas de concorrencia (dois cadastros simultaneos).
   *
   * @param input Dados de cadastro do aluno.
   * @returns DTO do aluno recem-criado.
   * @throws ErroAplicacao 409 quando email ou nickname ja existem.
   */
  async registrar(input: RegistrarAlunoDto): Promise<RespostaAlunoDto> {
    const email = normalizarEmail(input.email);
    const nickname = normalizarNickname(input.nickname);
    // Checagem previa de email para dar erro amigavel antes de tentar inserir.
    const alunoExistente = await this.alunoAuthRepository.buscarPorEmail(email);

    if (alunoExistente) {
      throw this.criarErroEmailDuplicado(email);
    }

    // Mesma checagem previa para o nickname.
    const alunoComNickname = await this.alunoAuthRepository.buscarPorNickname(nickname);

    if (alunoComNickname) {
      throw this.criarErroNicknameDuplicado(nickname);
    }

    // Nunca guarda a senha em texto puro: armazena apenas o hash.
    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_SALT_ROUNDS);

    try {
      const alunoCriado = await this.alunoAuthRepository.criar({
        nome: normalizarEspacos(input.nome),
        nickname,
        email,
        senhaHash,
        instituicao: normalizarTexto(input.instituicao),
        curso: normalizarTexto(input.curso),
        periodo: normalizarTexto(input.periodo),
        dataNascimento: converterDataNascimento(input.dataNascimento),
        nacionalidade: normalizarTexto(input.nacionalidade),
        cidade: normalizarTexto(input.cidade),
        estado: normalizarTexto(input.estado),
        escolaridade: input.escolaridade,
        papel: PAPEIS.ALUNO,
        status: STATUS_USUARIO.ATIVO,
      });

      return converterParaRespostaAluno(alunoCriado);
    } catch (error) {
      // Rede de seguranca contra concorrencia: traduz violacao de unicidade do banco.
      if (ehErroDeCampoUnicoDuplicado(error, "email")) {
        throw this.criarErroEmailDuplicado(email);
      }

      if (ehErroDeCampoUnicoDuplicado(error, "nickname")) {
        throw this.criarErroNicknameDuplicado(nickname);
      }

      // Qualquer outro erro sobe inalterado para o tratamento central.
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

  // Erro 409 padronizado para nickname ja cadastrado.
  private criarErroNicknameDuplicado(nickname: string) {
    return new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.nicknameJaCadastrado,
      detalhes: { nickname },
    });
  }
}
