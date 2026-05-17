import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type {
  BuscarAlunosQueryDto,
  BuscarUsuariosPorIdsQueryDto,
  ResumoUsuarioDto,
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
}
