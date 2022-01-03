
export function isErrConnRefused(unk: unknown): unk is Error {
  if (!unk) return false;
  if (typeof unk !== 'object') return false;
  if ((unk as any).code !== 'ECONNREFUSED') return false;
  return true;
}
