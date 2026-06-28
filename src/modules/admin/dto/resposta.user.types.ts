import type { Usuario } from "@prisma/client";

import type { Nullable } from "@/shared/types/comuns.types";
import { converterParaIsoString } from "@/shared/utils/dados.util";

// DTO de usuario para o painel admin (campos completos, datas em ISO, sem senha).
export type RespostaUserDto = {
  id: string;
  nome: string;
  nickname: Nullable<string>;
  email: string;
  perfil: Usuario["perfil"];
  status: Usuario["status"];
  instituicao: Nullable<string>;
  curso: Nullable<string>;
  semestre: Nullable<string>;
  estado: Nullable<string>;
  cidade: Nullable<string>;
  nacionalidade: Nullable<string>;
  dataNascimento: Nullable<string>;
  nivelEducacional: Usuario["nivelEducacional"] | null;
  departamento: Nullable<string>;
  siape: Nullable<string>;
  aprovadoPorId: Nullable<string>;
  aprovadoEm: Nullable<string>;
  criadoEm: string;
  atualizadoEm: string;
  excluidoEm: Nullable<string>;
};

// Converte o registro do banco no DTO de resposta, normalizando datas para ISO.
export function converterParaRespostaUser(
  usuario: Omit<Usuario, "senha">,
): RespostaUserDto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    nickname: usuario.nickname,
    email: usuario.email,
    perfil: usuario.perfil,
    status: usuario.status,
    instituicao: usuario.instituicao,
    curso: usuario.curso,
    semestre: usuario.semestre,
    estado: usuario.estado,
    cidade: usuario.cidade,
    nacionalidade: usuario.nacionalidade,
    dataNascimento: usuario.dataNascimento
      ? converterParaIsoString(usuario.dataNascimento)
      : null,
    nivelEducacional: usuario.nivelEducacional,
    departamento: usuario.departamento,
    siape: usuario.siape,
    aprovadoPorId: usuario.aprovadoPorId,
    aprovadoEm: usuario.aprovadoEm ? converterParaIsoString(usuario.aprovadoEm) : null,
    criadoEm: converterParaIsoString(usuario.criadoEm),
    atualizadoEm: converterParaIsoString(usuario.atualizadoEm),
    excluidoEm: usuario.excluidoEm ? converterParaIsoString(usuario.excluidoEm) : null,
  };
}
