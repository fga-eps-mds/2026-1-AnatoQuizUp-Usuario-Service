// Converte uma Date para string ISO 8601, formato padrao das respostas da API.
export function converterParaIsoString(value: Date): string {
  return value.toISOString();
}
