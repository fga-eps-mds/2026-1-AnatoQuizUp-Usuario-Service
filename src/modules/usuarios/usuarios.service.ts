import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaPaginada } from "@/shared/types/api.types";
import { normalizarEspacos } from "@/shared/utils/formatacao.util";
import {
  montarMetadadosPaginacao,
  resolverParametrosPaginacao,
} from "@/shared/utils/paginacao.util";
import {
  ehErroDeCampoUnicoDuplicado,
  ehRegistroNaoEncontrado,
} from "@/shared/utils/prisma-erros.util";

import type {
  AtualizarDadosPessoaisDto,
  BuscarAlunosQueryDto,
  ResumoUsuarioDto,
  UsuarioPublicoDto,
} from "./dto/usuario.types";
import {
  converterParaResumoUsuario,
  converterParaUsuarioPublico,
} from "./dto/usuario.types";
import type { UsuariosRepository } from "./usuarios.repository";

export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  async buscarAlunos(
    query: BuscarAlunosQueryDto,
  ): Promise<RespostaPaginada<ResumoUsuarioDto>> {
    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.usuariosRepository.buscarAlunos(query.busca, paginacao);

    return {
      dados: data.map(converterParaResumoUsuario),
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  async buscarUsuariosPorIds(ids: string[]): Promise<ResumoUsuarioDto[]> {
    const usuarios = await this.usuariosRepository.buscarAlunosPorIds(ids);
    return usuarios.map(converterParaResumoUsuario);
  }

  async buscarPorIdPublico(id: string): Promise<UsuarioPublicoDto> {
    const usuario = await this.usuariosRepository.buscarPorIdPublico(id);

    if (!usuario) {
      throw new ErroAplicacao({
        codigoStatus: 404,
        codigo: CodigoDeErro.NAO_ENCONTRADO,
        mensagem: MENSAGENS.usuarioNaoEncontrado,
      });
    }

    return converterParaUsuarioPublico(usuario);
  }

  async atualizarDadosPessoais(
    id: string,
    input: AtualizarDadosPessoaisDto,
  ): Promise<ResumoUsuarioDto> {
    const nome = input.nome !== undefined ? normalizarEspacos(input.nome) : undefined;
    const nickname = input.nickname !== undefined ? input.nickname.trim().toLowerCase() : undefined;

    if (nickname !== undefined) {
      const usuarioComNickname = await this.usuariosRepository.buscarIdPorNickname(nickname);

      if (usuarioComNickname && usuarioComNickname.id !== id) {
        throw this.criarErroNicknameDuplicado(nickname);
      }
    }

    try {
      const usuarioAtualizado = await this.usuariosRepository.atualizarDadosPessoais(id, {
        ...(nome !== undefined ? { nome } : {}),
        ...(nickname !== undefined ? { nickname } : {}),
      });

      return converterParaResumoUsuario(usuarioAtualizado);
    } catch (error) {
      if (nickname !== undefined && ehErroDeCampoUnicoDuplicado(error, "nickname")) {
        throw this.criarErroNicknameDuplicado(nickname);
      }

      if (ehRegistroNaoEncontrado(error)) {
        throw new ErroAplicacao({
          codigoStatus: 404,
          codigo: CodigoDeErro.NAO_ENCONTRADO,
          mensagem: MENSAGENS.usuarioNaoEncontrado,
          detalhes: { id },
        });
      }

      throw error;
    }
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
