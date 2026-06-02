import type { Amizade } from "@prisma/client";

export type ResumoAmigoDto = {
  id: string;
  nome: string;
  nickname: string | null;
  curso: string | null;
  semestre: string | null;
};

export type ResumoAmizadeDto = Amizade & {
  amigo: ResumoAmigoDto;
};
