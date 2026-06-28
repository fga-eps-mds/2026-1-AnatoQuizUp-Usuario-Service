import type { Papel } from "../constants/papeis";
import type { Status } from "../constants/status";

// Tipos de identidade de autenticacao usados pelo servico.

// Conteudo assinado dentro do JWT (payload).
export type PayloadAutenticacao = {
  id: string;
  email: string;
  papel: Papel;
  status: Status;
};

// Identidade anexada em request.usuario (formato em PT).
export type UsuarioAutenticado = {
  id: string;
  email: string;
  papel: Papel;
};

// Identidade anexada em request.user (formato em EN), mantido por compatibilidade.
export type UsuarioAutenticadoExpress = {
  userId: string;
  email: string;
  role: Papel;
};
