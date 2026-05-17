import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  montarMetadadosPaginacao,
  resolverParametrosPaginacao,
} from "@/shared/utils/paginacao.util";

import type {
  BuscarAlunosQueryDto,
  ResumoUsuarioDto,
} from "./dto/usuario.types";
import { converterParaResumoUsuario } from "./dto/usuario.types";
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
}
