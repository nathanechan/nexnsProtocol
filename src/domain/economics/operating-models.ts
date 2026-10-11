import type { Address, ProjectKey, PriceStatus } from "../../domain/models";
export interface PositionLot {
  id: string;
  wallet: Address;
  projectKey: ProjectKey;
  principal: string;
  capacity: string;
  used: string;
  settledGross: string;
  createdAt: string;
  completedAt: string | null;
  status: "ACTIVE" | "COMPLETED";
}
export interface ProtocolMember {
  wallet: Address;
  sponsor: Address | null;
  bound: boolean;
  staked: string;
  lots: PositionLot[];
  claimable: string;
  lifetimeEarned: string;
  lifetimeClaimed: string;
  participationEarned: string;
  networkEarned: string;
}
export interface PricePair {
  direct: string | null;
  indirect: string | null;
  status: PriceStatus;
}
export interface HourSnapshot {
  hour: number;
  members: Record<string, ProtocolMember>;
  prices: PricePair;
}
export interface SettlementRecord {
  day: string;
  completedAt: string;
  gross: string;
  participation: string;
  network: string;
  grossValue: string;
  minted: string;
  dailyLimit: string;
  members: Record<
    string,
    { gross: string; participation: string; network: string; value: string }
  >;
  status: "FINALIZED" | "NO_REWARD";
}
export interface ClaimRecord {
  id: string;
  wallet: Address;
  gross: string;
  received: string;
  timestamp: string;
  status: "COMPLETED";
}
export interface OperatingBook {
  publicResults?: {
    id: string;
    timestamp: string;
    treasury: string;
    pol: string | null;
    liquidity: string;
    burned: string;
  }[];
  projectIdentity: ProjectKey;
  root: Address;
  day: string;
  hour: number;
  displayStartedAt?: string;
  members: Record<string, ProtocolMember>;
  prices: PricePair;
  snapshots: HourSnapshot[];
  settlements: SettlementRecord[];
  claims: ClaimRecord[];
  lifetimeMinted: string;
  creatorAccrued: string;
  platformAccrued: string;
  claimDust: string;
  burned: string;
  base: {
    activePrincipal: string;
    participants: number;
    staked: string;
    treasury: string;
    tvl: string;
    burned: string;
    marketCap: string | null;
  };
  revision: number;
}
export type OperatingPreset =
  | "low"
  | "mid"
  | "full"
  | "multi"
  | "contribution"
  | "nearCapacity"
  | "claimable";
