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

export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

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

  buscarVisiveis = async (
    request: Request<unknown, unknown, unknown, { incluirPrivados?: string }>,
    response: Response<RespostaApiSucesso<AlunoVisivelDto[]>>,
    next: NextFunction,
  ) => {
    try {
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
