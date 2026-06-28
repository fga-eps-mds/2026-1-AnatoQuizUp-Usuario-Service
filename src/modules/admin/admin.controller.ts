import type { NextFunction, Request, Response } from "express";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { PAPEIS } from "@/shared/constants/papeis";
import type { RespostaApiSucesso, RespostaPaginada } from "@/shared/types/api.types";

import type {
  AlterarStatusUserDto,
  ContextoAdminDto,
} from "./dto/alterar.status_user.types";
import type { ListarUsersDto, ListarUsersQueryDto } from "./dto/listar.users.types";
import type { RespostaUserDto } from "./dto/resposta.user.types";
import type { AdminService } from "./admin.service";

// Controller HTTP de administracao: listar/buscar usuarios e alterar status,
// extraindo o contexto do admin logado e delegando as regras ao AdminService.
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET lista paginada de usuarios para o painel administrativo.
   *
   * @param request Requisicao com parametros de paginacao na query.
   * @param response Resposta paginada de usuarios.
   * @param next Encaminha erros ao middleware central.
   */
  listar = async (
    request: Request<unknown, unknown, unknown, ListarUsersQueryDto>,
    response: Response<RespostaPaginada<ListarUsersDto>>,
    next: NextFunction,
  ) => {
    try {
      const admin = await this.adminService.listar(request.query);

      return response.status(200).json(admin);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * GET detalhe de um usuario por id (painel administrativo).
   *
   * @param request Requisicao com o id do usuario nos params.
   * @param response Resposta com o usuario encontrado.
   * @param next Encaminha erros ao middleware central.
   */
  buscarPorId = async (
    request: Request<{ id: string }>,
    response: Response<RespostaApiSucesso<RespostaUserDto>>,
    next: NextFunction,
  ) => {
    try {
      const usuario = await this.adminService.buscarPorId(request.params.id);

      return response.status(200).json({
        mensagem: MENSAGENS.usuarioEncontrado,
        dados: usuario,
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * PATCH altera o status de um usuario (aprovar/ativar/inativar).
   *
   * @param request Requisicao com o id nos params, o novo status no body e o admin logado.
   * @param response Resposta com o usuario ja atualizado.
   * @param next Encaminha erros ao middleware central.
   */
  alterarStatus = async (
    request: Request<{ id: string }, unknown, AlterarStatusUserDto>,
    response: Response<RespostaApiSucesso<RespostaUserDto>>,
    next: NextFunction,
  ) => {
    try {
      // Passa o contexto do admin logado para o service aplicar as regras de permissao.
      const contextoAdmin = this.extrairContextoAdmin(request);
      const usuario = await this.adminService.alterarStatus(
        request.params.id,
        request.body,
        contextoAdmin,
      );

      return response.status(200).json({
        mensagem: MENSAGENS.usuarioStatusAlterado,
        dados: usuario,
      });
    } catch (error) {
      return next(error);
    }
  };

  // Deriva o contexto do admin (id + se e ADMIN) a partir do usuario autenticado.
  private extrairContextoAdmin(
    request: Request,
  ): ContextoAdminDto {
    const usuario = request.usuario;

    return {
      id: usuario?.id ?? null,
      perfil: usuario?.papel === PAPEIS.ADMINISTRADOR ? "ADMIN" : null,
    };
  }
}
