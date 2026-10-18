// Brand assets apply only to the original fixture identity and original placeholder.
// Duplicate symbols and creator-uploaded images must never inherit another logo.
export function fixtureBrand(identity: string, logo: string): number | null {
  if (!/^56:0x[0-9a-f]{40}$/i.test(identity)) return null;
  const offset = BigInt(identity.split(":")[1]) - 0x9a00n;
  if (offset < 0n || offset % 7919n !== 0n) return null;
  const index = Number(offset / 7919n);
  if (index > 28) return null;
  const symbols = [
    "LAN",
    "BRDG",
    "FLOW",
    "RIVER",
    "BLUE",
    "GLOW",
    "SHORE",
    "COVE",
    "GRAIN",
    "DAWN",
    "ISLE",
    "TIDE",
    "ORIG",
    "FIELD",
    "WAVE",
  ];
  const tiles = [0, 14, 9, 8, 6, 3, 10, 11, 7, 5, 15, 2, 12, 1, 4];
  const slot = index % 15;
  const legacy = [
    "青",
    "星",
    "川",
    "映",
    "蓝",
    "禾",
    "知",
    "云",
    "青",
    "朗",
    "森",
    "海",
    "归",
    "新",
    "映",
  ];
  return logo === symbols[slot][0] || logo === legacy[slot]
    ? tiles[slot]
    : null;
}
