import type { Usuario } from "@prisma/client";

// Usuario na listagem admin: todos os campos do banco, menos a senha.
export type ListarUsersDto = Omit<Usuario, "senha">;

// Parametros de paginacao da listagem admin.
export type ListarUsersQueryDto = {
  page?: number;
  limit?: number;
};
