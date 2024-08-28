export function roundUp(num: number, precision: number): number {
  precision = Math.pow(10, precision);
  return Math.ceil(num * precision) / precision;
}
