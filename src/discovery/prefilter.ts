const POSITIVE: Array<[RegExp, number]> = [
  [/\bpricing\b/i, 4],
  [/\bfree tier\b/i, 4],
  [/\bsubscription\b/i, 4],
  [/\bcredits?\b/i, 3],
  [/\bquota\b/i, 3],
  [/\brate limits?\b/i, 3],
  [/\bprice (increase|decrease|cut|change)\b/i, 4],
  [/\blaunch(ed|es)?\b/i, 2],
  [/\bdeveloper plan\b/i, 2],
  [/\bpromotion\b|\bpromo\b/i, 2],
];

const NEGATIVE: Array<[RegExp, number]> = [
  [/\bstock price\b/i, -5],
  [/\bhiring\b|\bjobs?\b/i, -5],
  [/\btutorial\b/i, -4],
  [/\breview\b/i, -4],
  [/\bcourse\b/i, -4],
];

export function candidateScore(text: string): number {
  return [...POSITIVE, ...NEGATIVE]
    .reduce((score, [pattern, weight]) => score + (pattern.test(text) ? weight : 0), 0);
}

export function shouldInvestigate(text: string, threshold = 4) {
  return candidateScore(text) >= threshold;
}
