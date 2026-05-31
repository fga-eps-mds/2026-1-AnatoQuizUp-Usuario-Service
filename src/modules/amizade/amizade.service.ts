import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  resolverParametrosPaginacao,
  montarMetadadosPaginacao,
} from "@/shared/utils/paginacao.util";
import type { AmizadesRepository } from "./amizade.repository";
import type { ListarAmigosQueryDto } from "./dto/request/listar_amigos_query_dto";
import type { ResumoAmigoDto, ResumoAmizadeDto } from "./dto/response/resumo_amigo_dto";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import { MENSAGENS } from "@/shared/constants/mensagens";
import type { BuscarAmigosQueryDto } from "./dto/request/buscar_amigos_query_dto";
import type { SolicitacaoDto } from "./dto/request/solicitacao_dto";
import type { Amizade } from "@prisma/client";
import type { UsuariosRepository } from "../usuarios/usuarios.repository";

export class AmizadesService {
  constructor(
    private readonly amizadesRepository: AmizadesRepository,
    private readonly usuariosRepository: UsuariosRepository
  ) {}

  async listarAmigos(
    query: ListarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmizadeDto>> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.listarAmigos(usuario_id, paginacao);

    const amigos = data.map((amizade)=>{
      const amigo = amizade.usuarioOrigemId === usuario_id ? amizade.usuarioDestino : amizade.usuarioOrigem;
      return {
        id: amizade.id,
        criadoEm: amizade.criadoEm,
        atualizadoEm: amizade.atualizadoEm,
        excluidoEm: amizade.excluidoEm,
        usuarioOrigemId: amizade.usuarioOrigemId,
        usuarioDestinoId: amizade.usuarioDestinoId,
        statusAmizade: amizade.statusAmizade,
        amigo,
      }
    });
    
    return {
      dados: amigos,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  
  async buscarAmigos(
    query: BuscarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmigoDto>> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const nome_busca = query.nome;
    if (nome_busca === "" || nome_busca === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmNomeDeUsuario,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.buscarAmigos(usuario_id, nome_busca, paginacao);

    
    return {
      dados: data,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  
  async enviarSolicitacao(
    data: SolicitacaoDto,
    usuario_id: string | undefined,
  ): Promise<Amizade> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const id_destino = data.id;
    if (id_destino === "" || id_destino === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmNomeDeUsuario,
      });
    }

    const solicitacao_ja_existe = await this.amizadesRepository.buscarSolicitacao(usuario_id, id_destino);

    if(solicitacao_ja_existe) {
      if(solicitacao_ja_existe.statusAmizade === "PENDENTE" || solicitacao_ja_existe.statusAmizade === "RECUSADO"){

        throw new ErroAplicacao({
          codigoStatus: 400,
          codigo: CodigoDeErro.SOLICITACAO_JA_ENVIADA,
          mensagem: MENSAGENS.solicitacaoDeAmizadeJaEnviada,
        });
      }
      else{
          throw new ErroAplicacao({
            codigoStatus: 400,
            codigo: CodigoDeErro.JA_SAO_AMIGOS,
            mensagem: MENSAGENS.jaSaoAmigos,
          });
      }
    }

    const envio = await this.amizadesRepository.enviarSolicitacao(usuario_id, id_destino);
    
    return envio;
  }

  async listarConvitesRecebidos(
    query: ListarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmizadeDto>> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.listarConvitesRecebidos(usuario_id, paginacao);

    const convites_recebidos = data.map((convite)=>{
      return {
        id: convite.id,
        criadoEm: convite.criadoEm,
        atualizadoEm: convite.atualizadoEm,
        excluidoEm: convite.excluidoEm,
        usuarioOrigemId: convite.usuarioOrigemId,
        usuarioDestinoId: convite.usuarioDestinoId,
        statusAmizade: convite.statusAmizade,
        amigo: convite.usuarioOrigem,
      }
    });
    
    return {
      dados: convites_recebidos,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

    async listarConvitesEnviados(
    query: ListarAmigosQueryDto,
    usuario_id: string | undefined,
  ): Promise<RespostaPaginada<ResumoAmizadeDto>> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.amizadesRepository.listarConvitesEnviados(usuario_id, paginacao);

    const convites_recebidos = data.map((convite)=>{
      return {
        id: convite.id,
        criadoEm: convite.criadoEm,
        atualizadoEm: convite.atualizadoEm,
        excluidoEm: convite.excluidoEm,
        usuarioOrigemId: convite.usuarioOrigemId,
        usuarioDestinoId: convite.usuarioDestinoId,
        statusAmizade: convite.statusAmizade,
        amigo: convite.usuarioDestino,
      }
    });
    
    return {
      dados: convites_recebidos,
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  async aceitarSolicitacao(
    data: SolicitacaoDto,
    usuario_id: string | undefined,
  ): Promise<Amizade> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const solicitacao_id = data.id;
    if (solicitacao_id === "" || solicitacao_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmaSolicitacao,
      });
    }

    const solicitacao = await this.amizadesRepository.buscarPorSolicitacaoId(solicitacao_id);

    if(!solicitacao){
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });      
    }

    const aceite = await this.amizadesRepository.aceitarSolicitacao(solicitacao_id);
    
    return aceite;
  }

  async recusarSolicitacao(
    data: SolicitacaoDto,
    usuario_id: string | undefined,
  ): Promise<Amizade> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const solicitacao_id = data.id;
    if (solicitacao_id === "" || solicitacao_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmaSolicitacao,
      });
    }

    const solicitacao = await this.amizadesRepository.buscarPorSolicitacaoId(solicitacao_id);

    if(!solicitacao){
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });      
    }

    const aceite = await this.amizadesRepository.recusarSolicitacao(solicitacao_id);
    
    return aceite;
  } 

  
  async desfazerAmizade(
    data: SolicitacaoDto,
    usuario_id: string | undefined,
  ): Promise<Amizade> {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }

    const amizade_id = data.id;
    if (amizade_id === "" || amizade_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.REQUISICAO_INVALIDA,
        mensagem: MENSAGENS.fornecaUmaSolicitacao,
      });
    }

    const amizade = await this.amizadesRepository.buscarPorSolicitacaoId(amizade_id);

    if(!amizade){
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });      
    }
    else if(amizade.statusAmizade !== "ATIVO"){
      throw new ErroAplicacao({
        codigoStatus: 400,
        codigo: CodigoDeErro.SOLICITACAO_NAO_ENCONTRADA,
        mensagem: MENSAGENS.solicitacaoDeAmizadeNaoEncontrada,
      });   
    }
    else if(amizade.usuarioDestinoId !== usuario_id && amizade.usuarioOrigemId !== usuario_id){
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.desfazerAmizadeRecusado,
      });
    }

    const amizade_desfeita = await this.amizadesRepository.desfazerAmizade(amizade_id);
    
    return amizade_desfeita;
  }
  
  async mudarVisibilidade(
    usuario_id: string | undefined,
  ) {
    if (usuario_id === "" || usuario_id === undefined) {
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });
    }
    const usuario = await this.usuariosRepository.buscarAlunoPorId(usuario_id);

    if(!usuario){
      throw new ErroAplicacao({
        codigoStatus: 401,
        codigo: CodigoDeErro.NAO_AUTORIZADO,
        mensagem: MENSAGENS.usuarioAutenticadoEncontrado,
      });     
    }
    const futura_visibilidade = usuario.visivel == true ? false : true;
    const visibilidade_alterada = await this.amizadesRepository.mudarVisibilidade(usuario_id, futura_visibilidade);
    
    return visibilidade_alterada;
  }
}
