import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type {
  AtualizarDadosPessoaisDto,
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

  atualizarDadosPessoais = async (
    request: Request<unknown, unknown, AtualizarDadosPessoaisDto>,
    response: Response<RespostaApiSucesso<ResumoUsuarioDto>>,
    next: NextFunction,
  ) => {
    try {
      if (!request.usuario) {
        throw new ErroAplicacao({
          codigoStatus: 401,
          codigo: CodigoDeErro.TOKEN_INVALIDO,
          mensagem: MENSAGENS.tokenInvalido,
        });
      }

      const usuario = await this.usuariosService.atualizarDadosPessoais(
        request.usuario.id,
        request.body,
      );

      return response.status(200).json({
        mensagem: MENSAGENS.dadosPessoaisAtualizados,
        dados: usuario,
      });
    } catch (error) {
      return next(error);
    }
  };
}
