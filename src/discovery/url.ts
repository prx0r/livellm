const DROP_PARAMS = new Set([
  "ref", "source", "fbclid", "gclid", "mc_cid", "mc_eid"
]);

export function canonicalUrl(input: string): string {
  const u = new URL(input);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");

  for (const key of [...u.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || DROP_PARAMS.has(key.toLowerCase())) {
      u.searchParams.delete(key);
    }
  }

  [...u.searchParams.entries()]
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv))
    .forEach(([k]) => {
      const values = u.searchParams.getAll(k);
      u.searchParams.delete(k);
      values.sort().forEach(v => u.searchParams.append(k, v));
    });

  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}
