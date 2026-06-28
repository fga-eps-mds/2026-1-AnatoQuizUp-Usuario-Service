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

// Service de consultas de usuarios: orquestra paginacao e conversao para DTO,
// delegando o acesso a dados ao UsuariosRepository.
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  /**
   * Busca alunos de forma paginada, convertendo cada um para o DTO de resumo.
   *
   * @param query Filtro de busca e parametros de paginacao.
   * @returns Pagina de alunos resumidos com metadados de paginacao.
   */
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

  // Lista alunos visiveis (base do ranking); gestao pode incluir os privados.
  async buscarAlunosVisiveis(incluirPrivados = false): Promise<AlunoVisivelDto[]> {
    return this.usuariosRepository.buscarAlunosVisiveis(incluirPrivados);
  }

  // Resolve varios usuarios por id e converte para o DTO de resumo.
  async buscarUsuariosPorIds(ids: string[]): Promise<ResumoUsuarioDto[]> {
    const usuarios = await this.usuariosRepository.buscarAlunosPorIds(ids);
    return usuarios.map(converterParaResumoUsuario);
  }

  /**
   * Busca a projecao publica de um usuario por id.
   *
   * @param id Id do usuario.
   * @returns DTO publico do usuario.
   * @throws ErroAplicacao 404 quando o usuario nao existe.
   */
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
