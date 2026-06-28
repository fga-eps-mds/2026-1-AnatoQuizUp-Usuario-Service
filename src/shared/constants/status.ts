// Status de usuario (alias usado no fluxo de sessao). Mesmos valores de STATUS_USUARIO.
export const STATUS = {
  PENDENTE: "PENDENTE",
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  RECUSADO: "RECUSADO",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];
