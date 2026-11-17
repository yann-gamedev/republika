export function campaignQuarter(turn: number): number {
  return ((turn - 1) % 4) + 1;
}

export function campaignYear(turn: number, startYear: number): number {
  return startYear + Math.floor((turn - 1) / 4);
}
