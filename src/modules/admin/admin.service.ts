import type { PerfilUsuario } from "@prisma/client";

import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  montarMetadadosPaginacao,
  resolverParametrosPaginacao,
} from "@/shared/utils/paginacao.util";

import type { ListarUsersDto, ListarUsersQueryDto } from "./dto/listar.users.types";
import {
  mapearStatusApiParaStatusBanco,
  type AlterarStatusUserDto,
  type ContextoAdminDto,
} from "./dto/alterar.status_user.types";
import {
  converterParaRespostaUser,
  type RespostaUserDto,
} from "./dto/resposta.user.types";
import type { UserRepository } from "./admin.repository";

// Service de administracao de usuarios: listagem, consulta e mudanca de status
// (aprovar/reprovar/ativar/inativar), com as regras de quem pode alterar quem.
export class AdminService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Lista usuarios de forma paginada para o painel administrativo.
   *
   * @param query Parametros de paginacao.
   * @returns Pagina de usuarios com metadados de paginacao.
   */
  async listar(query: ListarUsersQueryDto): Promise<RespostaPaginada<ListarUsersDto>> {
    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.userRepository.listar(paginacao);

    return {
      dados: data,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  /**
   * Busca um usuario pelo id para o painel administrativo.
   *
   * @param id Id do usuario.
   * @returns DTO do usuario.
   * @throws ErroAplicacao 404 quando o usuario nao existe.
   */
  async buscarPorId(id: string): Promise<RespostaUserDto> {
    const usuario = await this.userRepository.buscarPorId(id);

    if (!usuario) {
      throw new ErroAplicacao({
        codigoStatus: 404,
        codigo: CodigoDeErro.NAO_ENCONTRADO,
        mensagem: MENSAGENS.usuarioNaoEncontrado,
        detalhes: { id },
      });
    }

    return converterParaRespostaUser(usuario);
  }

  /**
   * Altera o status de um usuario, aplicando as regras de seguranca do admin.
   *
   * Regras: usuario precisa existir; contas ADMIN nao podem ser alteradas; um admin
   * nao pode se auto-desativar; e a transicao de status precisa ser valida. Quando
   * um professor PENDENTE e aprovado/reprovado, registra quem fez a aprovacao.
   *
   * @param id Id do usuario alvo.
   * @param input Novo status desejado (formato da API).
   * @param admin Contexto do administrador que executa a acao.
   * @returns DTO do usuario ja atualizado.
   * @throws ErroAplicacao 403/404/409 conforme a regra violada.
   */
  async alterarStatus(
    id: string,
    input: AlterarStatusUserDto,
    admin: ContextoAdminDto,
  ): Promise<RespostaUserDto> {
    // this.validarContextoAdmin(admin);

    const usuario = await this.userRepository.buscarPorId(id);

    // Alvo precisa existir.
    if (!usuario) {
      throw new ErroAplicacao({
        codigoStatus: 404,
        codigo: CodigoDeErro.NAO_ENCONTRADO,
        mensagem: MENSAGENS.usuarioNaoEncontrado,
        detalhes: { id },
      });
    }

    // Contas de administrador sao protegidas contra alteracao de status.
    if (usuario.perfil === "ADMIN") {
      throw new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.PROIBIDO,
        mensagem: MENSAGENS.usuarioAdminNaoPodeSerAlterado,
        detalhes: { id },
      });
    }

    const novoStatus = mapearStatusApiParaStatusBanco(input.status);

    // Impede que o admin desative a propria conta por engano.
    if (admin.id === usuario.id && novoStatus === "INATIVO") {
      throw new ErroAplicacao({
        codigoStatus: 403,
        codigo: CodigoDeErro.PROIBIDO,
        mensagem: MENSAGENS.usuarioAutoDesativacaoNaoPermitida,
        detalhes: { id },
      });
    }

    // Valida se a transicao de status pedida e permitida para aquele perfil.
    this.validarTransicaoStatus(usuario.status, novoStatus, usuario.perfil);

    // Aprovar/reprovar professor pendente registra o admin responsavel.
    const registrarAprovacao =
      usuario.status === "PENDENTE" &&
      usuario.perfil === "PROFESSOR" &&
      (novoStatus === "ATIVO" || novoStatus === "INATIVO");

    const usuarioAtualizado = await this.userRepository.atualizarStatus(
      id,
      novoStatus,
      registrarAprovacao ? admin.id ?? undefined : undefined,
    );

    return converterParaRespostaUser(usuarioAtualizado);
  }

  // private validarContextoAdmin(admin: ContextoAdminDto) {
  //   if (!admin.id || admin.perfil !== "ADMIN") {
  //     throw new ErroAplicacao({
  //       codigoStatus: 403,
  //       codigo: CodigoDeErro.PROIBIDO,
  //       mensagem: MENSAGENS.contextoAdminObrigatorio,
  //     });
  //   }
  // }

  /**
   * Valida se a transicao entre status e permitida pelas regras de negocio.
   *
   * Transicoes aceitas: PENDENTE->ATIVO/INATIVO apenas para PROFESSOR (fluxo de
   * aprovacao), ATIVO<->INATIVO (ativar/desativar). Qualquer outra combinacao e
   * rejeitada como conflito.
   *
   * @param statusAtual Status atual do usuario.
   * @param novoStatus Status desejado.
   * @param perfil Perfil do usuario alvo.
   * @throws ErroAplicacao 409 quando a transicao nao e permitida.
   */
  private validarTransicaoStatus(
    statusAtual: ListarUsersDto["status"],
    novoStatus: ListarUsersDto["status"],
    perfil: PerfilUsuario,
  ) {
    if (statusAtual === "PENDENTE") {
      // Apenas professores passam pelo fluxo de aprovacao (saem de PENDENTE).
      if (perfil !== "PROFESSOR") {
        throw new ErroAplicacao({
          codigoStatus: 409,
          codigo: CodigoDeErro.CONFLITO,
          mensagem: MENSAGENS.usuarioStatusInvalido,
          detalhes: { statusAtual, novoStatus, perfil },
        });
      }

      // Aprovacao (ATIVO) ou reprovacao (INATIVO) do professor pendente.
      if (novoStatus === "ATIVO" || novoStatus === "INATIVO") {
        return;
      }
    }

    // Desativar uma conta ativa.
    if (statusAtual === "ATIVO" && novoStatus === "INATIVO") {
      return;
    }

    // Reativar uma conta inativa.
    if (statusAtual === "INATIVO" && novoStatus === "ATIVO") {
      return;
    }

    // Qualquer outra transicao e invalida.
    throw new ErroAplicacao({
      codigoStatus: 409,
      codigo: CodigoDeErro.CONFLITO,
      mensagem: MENSAGENS.usuarioStatusInvalido,
      detalhes: { statusAtual, novoStatus, perfil },
    });
  }
}
