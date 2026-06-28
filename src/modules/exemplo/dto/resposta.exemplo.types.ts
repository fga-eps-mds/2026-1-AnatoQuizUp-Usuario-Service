import type { Exemplo } from "@prisma/client";

import type { Nullable } from "@/shared/types/comuns.types";
import { converterParaIsoString } from "@/shared/utils/dados.util";

// Exemplo no formato de resposta da API (datas como string ISO).
export type RespostaExemploDto = {
  id: string;
  nome: string;
  descricao: Nullable<string>;
  createdAt: string;
  updatedAt: string;
};

// Converte o registro do banco no DTO de resposta, serializando as datas.
export function converterParaRespostaExemplo(exemplo: Exemplo): RespostaExemploDto {
  return {
    id: exemplo.id,
    nome: exemplo.nome,
    descricao: exemplo.descricao,
    createdAt: converterParaIsoString(exemplo.createdAt),
    updatedAt: converterParaIsoString(exemplo.updatedAt),
  };
}
