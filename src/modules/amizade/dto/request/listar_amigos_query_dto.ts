// Filtros (nome/nickname) e paginacao aceitos na listagem de amigos e convites.
export type ListarAmigosQueryDto = {
  nome?: string;
  nickname?: string;
  page?: number;
  limit?: number;
};
