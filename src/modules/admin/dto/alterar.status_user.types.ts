import type { PerfilUsuario, StatusUsuario } from "@prisma/client";

// Tipos do fluxo de alteracao de status pelo admin, incluindo o mapeamento entre os
// status expostos na API (em ingles) e os status do banco (em portugues).

// Status como aceitos/expostos pela API.
export const STATUS_USUARIO_API = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type StatusUsuarioApi =
  (typeof STATUS_USUARIO_API)[keyof typeof STATUS_USUARIO_API];

export type AlterarStatusUserDto = {
  status: StatusUsuarioApi;
};

// Contexto do admin que executa a acao (id e se realmente e ADMIN).
export type ContextoAdminDto = {
  id: string | null;
  perfil: PerfilUsuario | null;
};

// Traduz o status da API (PENDING/ACTIVE/INACTIVE) para o enum do banco.
export function mapearStatusApiParaStatusBanco(status: StatusUsuarioApi): StatusUsuario {
  switch (status) {
    case STATUS_USUARIO_API.PENDING:
      return "PENDENTE";
    case STATUS_USUARIO_API.ACTIVE:
      return "ATIVO";
    case STATUS_USUARIO_API.INACTIVE:
      return "INATIVO";
  }
}
