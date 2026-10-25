// Raw token values remain decimal strings across JSON and SQLite boundaries.
export function formatTokens(raw: string, decimals: number) {
  const amount = BigInt(raw), unit = 10n ** BigInt(decimals);
  const whole = (amount / unit).toLocaleString("en-US");
  const fraction = (amount % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
export function tokenPercent(raw: string, supply: string) {
  return BigInt(supply) > 0n ? Number(BigInt(raw) * 10000n / BigInt(supply)) / 100 : 0;
}
