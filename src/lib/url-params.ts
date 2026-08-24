export function optionalNumber(params: URLSearchParams, name: string): number | null {
  const value = params.get(name);
  if (value === null || value.trim() === '') return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}