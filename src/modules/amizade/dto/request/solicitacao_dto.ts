// Body das acoes de amizade: o "id" aponta para o usuario-destino ou a solicitacao,
// conforme a operacao (enviar, aceitar, recusar, desfazer).
export type SolicitacaoDto = {
  id?: string;
};
