import type {
  RespostaCidadeDto,
  RespostaEstadoDto,
} from "@/modules/auth/aluno/localidades/dto/resposta.localidade.types";
import {
  CIDADES_CAPITAIS_POR_UF,
  ESTADOS_BRASIL,
  type UfBrasileira,
} from "@/shared/constants/localidades";

// Service de localidades: serve estados e cidades a partir de constantes estaticas
// (sem banco), usado para preencher os selects do formulario de cadastro.
export class AlunoLocalidadesService {
  // Retorna a lista completa de estados brasileiros.
  listarEstados(): RespostaEstadoDto[] {
    return ESTADOS_BRASIL;
  }

  // Retorna as cidades (capitais) de uma UF, ja no formato { nome, uf }.
  listarCidadesPorUf(uf: UfBrasileira): RespostaCidadeDto[] {
    return CIDADES_CAPITAIS_POR_UF[uf].map((nome) => ({ nome, uf }));
  }
}
