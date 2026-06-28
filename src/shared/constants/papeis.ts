// Papeis e status de usuario no dominio. Definidos como const + tipo derivado para
// evitar strings soltas espalhadas pelo codigo.

// Papeis de acesso. ADMINISTRADOR corresponde ao "ADMIN" gravado no banco.
export const PAPEIS = {
  ALUNO: "ALUNO",
  PROFESSOR: "PROFESSOR",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type Papel = (typeof PAPEIS)[keyof typeof PAPEIS];

// Estados possiveis de uma conta no ciclo de cadastro/aprovacao.
export const STATUS_USUARIO = {
  PENDENTE: "PENDENTE",
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  RECUSADO: "RECUSADO",
} as const;

export type StatusUsuario = (typeof STATUS_USUARIO)[keyof typeof STATUS_USUARIO];
