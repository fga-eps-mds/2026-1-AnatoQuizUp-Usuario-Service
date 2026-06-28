// Contratos genericos de resposta da API, compartilhados pelo servico inteiro.

// Envelope de sucesso: mensagem + payload tipado em "dados".
export type RespostaApiSucesso<T> = {
  mensagem: string;
  dados: T;
};

// Metadados de paginacao retornados nas listagens.
export type MetadadosPaginacao = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// Resposta paginada: lista de itens + metadados.
export type RespostaPaginada<T> = {
  dados: T[];
  metadados: MetadadosPaginacao;
};

// Envelope de erro: formato unico devolvido pelo middleware de erros.
export type RespostaApiErro = {
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: unknown;
  };
};
