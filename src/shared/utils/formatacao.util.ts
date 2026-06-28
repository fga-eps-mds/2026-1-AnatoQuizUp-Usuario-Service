// Normaliza espacos de um texto livre: remove os das pontas e colapsa sequencias
// de espacos internos em um unico espaco (ex.: "  Joao   Silva " -> "Joao Silva").
export function normalizarEspacos(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
