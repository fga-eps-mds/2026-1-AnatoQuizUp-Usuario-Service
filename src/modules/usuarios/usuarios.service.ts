import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  montarMetadadosPaginacao,
  resolverParametrosPaginacao,
} from "@/shared/utils/paginacao.util";

import type {
  AlunoVisivelDto,
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

  async buscarAlunosVisiveis(incluirPrivados = false): Promise<AlunoVisivelDto[]> {
    return this.usuariosRepository.buscarAlunosVisiveis(incluirPrivados);
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
}
