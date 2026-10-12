export type Address = `0x${string}`;
export type ProjectKey = `${number}:${Address}`;
export type Lifecycle =
  "CURVE_OPEN" | "MIGRATION_READY" | "MIGRATING" | "OPERATING";
export type PriceStatus =
  "VALID" | "PROTECTED" | "PRICE_DISCOVERY" | "PRICE_INVALID";
export interface Curve {
  curvePrice: number;
  netReserve: number;
  targetReserve: 100000;
  soldInventory: number;
  remainingInventory: number;
  progress: number;
  participants: number;
  volume24h: number;
}
export interface Pool {
  pair: "X/USDT" | "X/NEXUS" | "NEXUS/USDT";
  liquidity: number;
}
export interface Migration {
  lastError?: string | null;
  state: "NOT_STARTED" | "READY" | "PENDING" | "COMPLETED";
  startedAt: string | null;
  completedAt: string | null;
  resultingPools: Pool[];
}
export interface OperatingSummary {
  change24h?: number | null;
  activePositionValue?: number | null;
  lastSettledReward?: number | null;
  updatedAt?: string;
  tokenPrice: number | null;
  marketCap: number | null;
  volume24h: number;
  liquidity: number;
  tvl: number;
  activeParticipants: number;
  totalStaked: number;
  treasuryBalance: number;
  polValue: number | null;
  burnedSupply: number;
}
export interface Project {
  isPlatformToken?: boolean;
  updatedAt?: string;
  links?: { label: string; url: string }[];
  projectId: string;
  chainId: number;
  tokenContract: Address;
  name: string;
  nameZh?: string;
  nameEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  symbol: string;
  logo: string;
  description: string;
  creatorWallet: Address;
  lifecycle: Lifecycle;
  priceStatus: PriceStatus;
  createdAt: string;
  curve: Curve;
  migration: Migration;
  operating: OperatingSummary | null;
}
export interface Position {
  id: string;
  projectKey: ProjectKey;
  principal: number;
  capacity: number;
  used: number;
  remaining: number;
  createdAt: string;
  status: "ACTIVE" | "COMPLETED";
}
export interface Stake {
  projectKey: ProjectKey;
  amount: number;
  coverage: number | null;
}
export interface Reward {
  projectKey: ProjectKey;
  settled: number;
  claimable: number;
  lifetimeEarned: number;
}
export interface Contribution {
  projectKey: ProjectKey;
  value: number;
  weight: number;
  activeNetwork: number;
  networkReward: number;
}
export interface Balance {
  chainId: number;
  asset: Address | "USDT";
  amount: number;
}
export interface User {
  wallet: Address;
  balances: Balance[];
  projectPositions: Position[];
  stakes: Stake[];
  rewards: Reward[];
  contributions: Contribution[];
}
export interface Activity {
  id: string;
  type:
    | "CREATE"
    | "BUY"
    | "SELL"
    | "PARTICIPATE"
    | "STAKE"
    | "UNSTAKE"
    | "CLAIM"
    | "CURVE_COMPLETED"
    | "MIGRATION_COMPLETED"
    | "REWARD_SETTLED"
    | "POSITION_COMPLETED"
    | "SUPPLY_BURNED"
    | "POL_UPDATED"
    | "LIFECYCLE";
  projectKey: ProjectKey;
  projectId: string;
  wallet: Address;
  timestamp: string;
  displayValues: Record<string, string>;
}
