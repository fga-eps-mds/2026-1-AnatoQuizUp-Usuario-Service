import bcrypt from "bcryptjs";

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
import { ehErroDeCampoUnicoDuplicado } from "@/shared/utils/prisma-erros.util";

const BCRYPT_SALT_ROUNDS = 10;

function normalizarTexto(value: string) {
  return normalizarEspacos(value);
}

function converterDataNascimento(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizarNickname(value: string) {
  return value.trim().toLowerCase();
}

function normalizarEmail(value: string) {
  return value.trim().toLowerCase();
}

export type RespostaDisponibilidadeNicknameDto = {
  nickname: string;
  disponivel: boolean;
};

export type RespostaDisponibilidadeEmailDto = {
  email: string;
  disponivel: boolean;
};

export class AlunoAuthService {
  constructor(private readonly alunoAuthRepository: AlunoAuthRepository) {}

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

  async registrar(input: RegistrarAlunoDto): Promise<RespostaAlunoDto> {
    const email = normalizarEmail(input.email);
    const nickname = normalizarNickname(input.nickname);
    const alunoExistente = await this.alunoAuthRepository.buscarPorEmail(email);

    if (alunoExistente) {
      throw this.criarErroEmailDuplicado(email);
    }

    const alunoComNickname = await this.alunoAuthRepository.buscarPorNickname(nickname);

    if (alunoComNickname) {
      throw this.criarErroNicknameDuplicado(nickname);
    }

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
      if (ehErroDeCampoUnicoDuplicado(error, "email")) {
        throw this.criarErroEmailDuplicado(email);
      }

      if (ehErroDeCampoUnicoDuplicado(error, "nickname")) {
        throw this.criarErroNicknameDuplicado(nickname);
      }

      throw error;
    }
  }

  private criarErroEmailDuplicado(email: string) {
    return new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.emailJaCadastrado,
      detalhes: { email },
    });
  }

  private criarErroNicknameDuplicado(nickname: string) {
    return new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.nicknameJaCadastrado,
      detalhes: { nickname },
    });
  }
}
