/**
 * Calculate n-th root of val
 * Parameters:
 * k: is n-th (default sqare root)
 * limit: is maximum number of iterations (default: -1 no limit)
 */
export function nthRoot(val: bigint | number, k = 2n, limit = -1) {
  let o = 0n; // old approx value
  val = BigInt(val);
  let x = val;

  while (x ** k !== k && x !== o && --limit) {
    o = x;
    x = ((k - 1n) * x + val / x ** (k - 1n)) / k;
    if (limit < 0 && (x - o) ** 2n == 1n) break;
  }

  if ((val - (x - 1n) ** k) ** 2n < (val - x ** k) ** 2n) x = x - 1n;
  if ((val - (x + 1n) ** k) ** 2n < (val - x ** k) ** 2n) x = x + 1n;
  return x;
}
