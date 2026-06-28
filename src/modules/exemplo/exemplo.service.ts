import { MENSAGENS } from "@/shared/constants/mensagens";
import { CodigoDeErro } from "@/shared/errors/codigos-de-erro";
import type { CriarExemploDto } from "@/modules/exemplo/dto/criar.exemplo.types";
import type { ListarExemplosDto } from "@/modules/exemplo/dto/listar.exemplos.types";
import {
  converterParaRespostaExemplo,
  type RespostaExemploDto,
} from "@/modules/exemplo/dto/resposta.exemplo.types";
import { ErroAplicacao } from "@/shared/errors/erro-aplicacao";
import type { ExemploRepository } from "@/modules/exemplo/exemplo.repository";
import type { RespostaPaginada } from "@/shared/types/api.types";
import {
  montarMetadadosPaginacao,
  resolverParametrosPaginacao,
} from "@/shared/utils/paginacao.util";
import { normalizarEspacos } from "@/shared/utils/formatacao.util";

// Service do modulo de exemplo (CRUD de referencia, base para novos modulos).
export class ExemploService {
  constructor(private readonly exemploRepository: ExemploRepository) {}

  // Cria um exemplo, normalizando os textos antes de persistir.
  async criar(input: CriarExemploDto): Promise<RespostaExemploDto> {
    const exemploCriado = await this.exemploRepository.criar({
      nome: normalizarEspacos(input.nome),
      descricao: input.descricao ? normalizarEspacos(input.descricao) : undefined,
    });

    return converterParaRespostaExemplo(exemploCriado);
  }

  // Lista exemplos de forma paginada, convertendo cada registro para o DTO de resposta.
  async listar(query: ListarExemplosDto): Promise<RespostaPaginada<RespostaExemploDto>> {
    const paginacao = resolverParametrosPaginacao(query);
    const { data, total } = await this.exemploRepository.listar(paginacao);

    return {
      dados: data.map(converterParaRespostaExemplo),
      metadados: montarMetadadosPaginacao(paginacao, total),
    };
  }

  // Busca um exemplo por id; lanca 404 quando nao encontrado.
  async buscarPorId(id: string): Promise<RespostaExemploDto> {
    const exemplo = await this.exemploRepository.buscarPorId(id);

    if (!exemplo) {
      throw new ErroAplicacao({
        codigoStatus: 404,
        codigo: CodigoDeErro.NAO_ENCONTRADO,
        mensagem: MENSAGENS.exemploNaoEncontrado,
        detalhes: { id },
      });
    }

    return converterParaRespostaExemplo(exemplo);
  }
}
