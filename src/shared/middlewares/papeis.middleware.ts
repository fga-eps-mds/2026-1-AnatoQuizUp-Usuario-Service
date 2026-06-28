import type { Request, Response, NextFunction } from "express";
import type { Papel } from "../constants/papeis";
import { CodigoDeErro } from "../errors/codigos-de-erro";
import { ErroAplicacao } from "../errors/erro-aplicacao";

/**
 * Cria um middleware de autorizacao por papel.
 *
 * Recebe a lista de papeis permitidos e bloqueia (403) quem nao estiver autenticado
 * ou cujo papel nao conste na lista. Deve rodar depois do middleware de autenticacao.
 *
 * @param papeisPermitidos Papeis que podem acessar a rota.
 * @returns Middleware Express de autorizacao.
 */
export const middlewarePapeis = (...papeisPermitidos: Papel[]) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const papel: Papel | undefined = request.usuario?.papel;
    // Sem papel = nao autenticado.
    if (!papel) {
      throw new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: "Usuário não autenticado",
      });
    }

    // Papel valido, mas sem permissao para esta rota.
    if (!papeisPermitidos.includes(papel)) {
      throw new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: "Acesso não autorizado",
      });
    }

    next();
  };
};
