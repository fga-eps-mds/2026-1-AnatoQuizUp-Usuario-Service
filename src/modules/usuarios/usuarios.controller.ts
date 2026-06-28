import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { PAPEIS } from "@/shared/constants/papeis";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type {
  AlunoVisivelDto,
  BuscarAlunosQueryDto,
  BuscarUsuarioPorIdParamsDto,
  BuscarUsuariosPorIdsQueryDto,
  ResumoUsuarioDto,
  UsuarioPublicoDto,
} from "./dto/usuario.types";
import type { UsuariosService } from "./usuarios.service";

// Controller HTTP de usuarios: buscas de alunos (paginada, visiveis, por ids e
// publica por id), delegando ao service e padronizando as respostas.
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * GET busca paginada de alunos, com filtro textual opcional.
   *
   * @param request Requisicao com filtro/paginacao na query.
   * @param response Resposta paginada com alunos resumidos.
   * @param next Encaminha erros ao middleware central.
   */
  buscarAlunos = async (
    request: Request<unknown, unknown, unknown, BuscarAlunosQueryDto>,
    response: Response<RespostaPaginada<ResumoUsuarioDto>>,
    next: NextFunction,
  ) => {
    try {
      const alunos = await this.usuariosService.buscarAlunos(request.query);

      return response.status(200).json(alunos);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET lista alunos visiveis (base do ranking); gestao pode incluir privados.
   *
   * @param request Requisicao com a flag incluirPrivados na query e o usuario logado.
   * @param response Resposta com a lista de alunos visiveis.
   * @param next Encaminha erros ao middleware central.
   */
  buscarVisiveis = async (
    request: Request<unknown, unknown, unknown, { incluirPrivados?: string }>,
    response: Response<RespostaApiSucesso<AlunoVisivelDto[]>>,
    next: NextFunction,
  ) => {
    try {
      // So professor/admin podem solicitar a inclusao de perfis privados.
      const papel = request.usuario?.papel;
      const ehGestao = papel === PAPEIS.PROFESSOR || papel === PAPEIS.ADMINISTRADOR;
      const incluirPrivados = ehGestao && request.query.incluirPrivados === "true";

      const alunos = await this.usuariosService.buscarAlunosVisiveis(incluirPrivados);

      return response.status(200).json({
        mensagem: MENSAGENS.usuariosEncontrados,
        dados: alunos,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET busca varios usuarios por ids (usado por outros servicos, ex.: ranking).
   *
   * @param request Requisicao com a lista de ids na query.
   * @param response Resposta com os usuarios resumidos.
   * @param next Encaminha erros ao middleware central.
   */
  buscarPorIds = async (
    request: Request<unknown, unknown, unknown, BuscarUsuariosPorIdsQueryDto>,
    response: Response<RespostaApiSucesso<ResumoUsuarioDto[]>>,
    next: NextFunction,
  ) => {
    try {
      const usuarios = await this.usuariosService.buscarUsuariosPorIds(request.query.ids);

      return response.status(200).json({
        mensagem: MENSAGENS.usuariosEncontrados,
        dados: usuarios,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET projecao publica de um usuario por id (dados minimos, sem campos sensiveis).
   *
   * @param request Requisicao com o id do usuario nos params.
   * @param response Resposta com a projecao publica do usuario.
   * @param next Encaminha erros ao middleware central.
   */
  buscarPorIdPublico = async (
    request: Request<BuscarUsuarioPorIdParamsDto>,
    response: Response<RespostaApiSucesso<UsuarioPublicoDto>>,
    next: NextFunction,
  ) => {
    try {
      const usuario = await this.usuariosService.buscarPorIdPublico(request.params.id);

      return response.status(200).json({
        mensagem: MENSAGENS.usuarioEncontrado,
        dados: usuario,
      });
    } catch (error) {
      return next(error);
    }
  };
}
