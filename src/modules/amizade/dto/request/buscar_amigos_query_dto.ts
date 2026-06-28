// Filtros (nome/nickname) e paginacao da busca por possiveis amigos.
export type BuscarAmigosQueryDto = {
  nome?: string;
  nickname?: string;
  page?: number;
  limit?: number;
};
