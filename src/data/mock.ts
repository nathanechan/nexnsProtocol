import type { Activity, Address, Project, User } from "../domain/models";
import { projectKey } from "../domain/identity";
const address = (digit: string): Address => `0x${digit.repeat(40)}` as Address;
const lifecycles = [
  "CURVE_OPEN",
  "MIGRATION_READY",
  "MIGRATING",
  "OPERATING",
  "OPERATING",
] as const;
const foundationProjects: Project[] = lifecycles.map((lifecycle, i) => ({
  projectId: `NX-${String(i + 1).padStart(4, "0")}`,
  chainId: 56,
  tokenContract: address(String(i + 1)),
  name: ["澄海经济", "云脉网络", "序光协议", "澄海经济", "远境生态"][i],
  symbol: ["SEA", "CLOUD", "LUMA", "SEA", "HZN"][i],
  logo: ["澄", "云", "序", "澄", "远"][i],
  description: "连接参与者与长期价值的链上项目。",
  creatorWallet: address(i < 2 ? "a" : "b"),
  lifecycle,
  priceStatus: i === 2 ? "PRICE_DISCOVERY" : i === 4 ? "PROTECTED" : "VALID",
  createdAt: "2026-10-01T00:00:00Z",
  curve: {
    curvePrice: i === 0 ? 0.08 : 0.5,
    netReserve: i === 0 ? 20000 : 100000,
    targetReserve: 100000,
    soldInventory: i === 0 ? 400000 : 800000,
    remainingInventory: i === 0 ? 400000 : 0,
    progress: i === 0 ? 0.2 : 1,
    participants: 36 + i * 12,
    volume24h: i === 0 ? 2340 : 0,
  },
  migration: {
    state:
      i === 0
        ? "NOT_STARTED"
        : i === 1
          ? "READY"
          : i === 2
            ? "PENDING"
            : "COMPLETED",
    startedAt: i >= 2 ? "2026-10-09T04:00:00Z" : null,
    completedAt: i >= 3 ? "2026-10-09T04:00:12Z" : null,
    resultingPools:
      i >= 3
        ? [
            { pair: "X/USDT", liquidity: 98000 },
            { pair: "X/NEXUS", liquidity: 98000 },
          ]
        : [],
  },
  operating:
    i >= 3
      ? {
          tokenPrice: 0.49,
          marketCap: 490000,
          volume24h: 12400,
          liquidity: 196000,
          tvl: 224000,
          activeParticipants: 42,
          totalStaked: 36000,
          treasuryBalance: 28000,
          polValue: 196000,
          burnedSupply: 1200,
          change24h: i === 3 ? 0.0124 : -0.0083,
          activePositionValue: 28000,
          lastSettledReward: 638.42,
          updatedAt: "2026-10-11T08:00:00Z",
        }
      : null,
}));
// Static protocol reference snapshots, not a trading engine.
const snapshots = [
  [137400, 4928.617548, 0.04117435],
  [213800, 8356.13226, 0.048881575],
  [287600, 12305.322608, 0.058581195],
  [345200, 15948.992792, 0.068308528],
  [427800, 22320.776375, 0.08711381],
  [486400, 27941.176471, 0.105597156],
  [543700, 34654.853719, 0.130004819],
  [598200, 42564.394478, 0.162013081],
  [631900, 48447.443073, 0.188102683],
  [674300, 57284.852604, 0.230952814],
  [712800, 67143.933685, 0.283941033],
  [744600, 77064.789899, 0.342780345],
  [768200, 85794.058521, 0.399131311],
  [781300, 91262.702955, 0.436617345],
  [793700, 96922.701185, 0.477186596],
];
const names = [
  "青岚",
  "星桥",
  "川流",
  "映川",
  "蓝序",
  "禾光",
  "知岸",
  "云境",
  "青禾",
  "朗川",
  "森屿",
  "海序",
  "归元",
  "新域",
  "映海",
];
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
const fixtureAddress = (n: number): Address =>
  `0x${n.toString(16).padStart(40, "0")}`;
const expanded: Project[] = Array.from({ length: 29 }, (_, i) => {
  const curve = i < 15;
  const j = curve ? i : i - 15;
  const base = structuredClone(foundationProjects[curve ? 0 : 3]);
  const [sold, reserve, referencePrice] = snapshots[j];
  const liquidity = 176842 + j * 18317 + (j % 3) * 2719;
  const principal = 28314 + j * 9217;
  const createdAt = `2026-10-${String(2 + (j % 9)).padStart(2, "0")}T${String(2 + (j % 15)).padStart(2, "0")}:18:00Z`;
  return {
    ...base,
    projectId: `NX-${String(i + 6).padStart(4, "0")}`,
    tokenContract: fixtureAddress(0x9a00 + i * 7919),
    name: `${names[j]}经济`,
    symbol: symbols[j],
    logo: names[j][0],
    description: "连接参与者与长期价值的链上项目。",
    creatorWallet: fixtureAddress(0xd200 + (j % 4) * 1049),
    createdAt,
    priceStatus: curve
      ? "VALID"
      : j === 5
        ? "PRICE_INVALID"
        : j === 9
          ? "PROTECTED"
          : "VALID",
    curve: curve
      ? {
          ...base.curve,
          soldInventory: sold,
          remainingInventory: 800000 - sold,
          netReserve: reserve,
          curvePrice: referencePrice,
          progress: reserve / 100000,
          participants: 47 + j * 29 + (j % 3) * 13,
          volume24h: 1642.38 + j * 2173.61,
        }
      : base.curve,
    migration: curve
      ? base.migration
      : {
          ...base.migration,
          startedAt: createdAt,
          completedAt: new Date(Date.parse(createdAt) + 28812000).toISOString(),
          resultingPools: [
            { pair: "X/USDT", liquidity: liquidity * 0.51 },
            { pair: "X/NEXUS", liquidity: liquidity * 0.49 },
          ],
        },
    operating: curve
      ? null
      : {
          tokenPrice: j === 5 ? null : 0.3187 + j * 0.0713,
          change24h: j === 5 ? null : (j % 2 ? -1 : 1) * (0.0037 + j * 0.0021),
          marketCap: j === 5 ? null : 318700 + j * 71300,
          volume24h: 7834.27 + j * 3181.43,
          liquidity,
          tvl: liquidity + principal,
          activePositionValue: principal,
          activeParticipants: 61 + j * 17,
          totalStaked: 26412 + j * 5317,
          treasuryBalance: principal,
          polValue: j === 5 ? null : liquidity,
          burnedSupply: 1438 + j * 317,
          lastSettledReward: j === 5 ? null : 427.83 + j * 87.21,
          updatedAt: "2026-10-11T08:00:00Z",
        },
  };
});
export const platformProject: Project = {
  ...structuredClone(foundationProjects[3]),
  projectId: "NX-PLATFORM",
  tokenContract: address("f"),
  name: "NEXNS",
  symbol: "NEXNS",
  logo: "N",
  isPlatformToken: true,
  description: "NEXNS 平台代币，连接项目与协议生态。",
  migration: {
    ...foundationProjects[3].migration,
    resultingPools: [{ pair: "NEXUS/USDT", liquidity: 196000 }],
  },
};
export const mockProjects: Project[] = [
  ...foundationProjects,
  ...expanded,
  platformProject,
];
export const mockActivities: Activity[] = Array.from({ length: 8 }, (_, i) => {
  const p = mockProjects[[5, 0, 1, 3, 4, 3, 3, 3][i]];
  const types = [
    "CREATE",
    "BUY",
    "CURVE_COMPLETED",
    "MIGRATION_COMPLETED",
    "PARTICIPATE",
    "STAKE",
    "REWARD_SETTLED",
    "CLAIM",
  ] as const;
  const details = [
    "经济体已创建",
    "买入 2,418.36 X",
    "曲线发行已完成",
    "流动性已建立",
    "新增参与 1,250 USDT",
    "质押更新 840 X",
    "昨日奖励已结算",
    "领取完成，实际到账 124.83 X",
  ];
  const timestamp =
    types[i] === "CREATE"
      ? p.createdAt
      : types[i] === "MIGRATION_COMPLETED"
        ? p.migration.completedAt!
        : `2026-10-11T${String(7 - Math.floor(i / 3)).padStart(2, "0")}:${String(58 - i * 6).padStart(2, "0")}:00Z`;
  return {
    id: `EV-${i}`,
    type: types[i],
    projectId: p.projectId,
    projectKey: projectKey(p.chainId, p.tokenContract),
    wallet: p.creatorWallet,
    timestamp,
    displayValues: { summary: details[i] },
  };
}).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
export const mockUser: User = {
  wallet: address("c"),
  balances: [{ chainId: 56, asset: "USDT", amount: 10000 }],
  projectPositions: [],
  stakes: [],
  rewards: [],
  contributions: [],
};
