import {
  makeBook,
  operatingActions,
  userSummary,
  type OperatingActions,
} from "./operating-actions";
import { validateOperatingBook } from "./validate-operating";
import { creatorCurveRevenue } from "../product/read-model";
import type { OperatingBook } from "../domain/economics/operating-models";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  mockActivities,
  mockProjects,
  mockUser,
  platformProject,
} from "../data/mock";
import { projectKey } from "../domain/identity";
import type {
  Activity,
  Address,
  Project,
  ProjectKey,
  User,
} from "../domain/models";
import {
  validateIdentity,
  validateLinks,
  type CreateInput,
} from "../domain/create";
import {
  decimal,
  displayAmount,
  displayNumber,
  parseAmount,
  UNIT,
} from "../domain/economics/amount";
import {
  CURVE_INVENTORY,
  RESERVE_TARGET,
  graduation,
  ledgerState,
  priceAtSold,
  quoteBuy,
  quoteSell,
  reserveAtSold,
  soldAtReserve,
  validateCurve,
  rollingVolume,
  type CurveLedger,
  type CurveQuote,
} from "../domain/economics/curve";
export const STORAGE_KEY = "nexus-simulation-v3";
export const balanceKey = (chainId: number, asset: Address | "USDT") =>
  `${chainId}:${asset.toLowerCase()}`;
export type Scenario =
  | "fresh"
  | "half"
  | "seventyFive"
  | "ninety"
  | "near"
  | "ready"
  | "processing"
  | "operating";
export interface SimulationData {
  projects: Record<ProjectKey, Project>;
  curves: Record<ProjectKey, CurveLedger>;
  exactBalances: Record<string, string>;
  currentUser: User;
  activities: Activity[];
  sequence: number;
  revision: number;
  hydrated: boolean;
  failNextTrade: boolean;
  operatingBooks: Record<ProjectKey, OperatingBook>;
  failNextOperating: boolean;
}
export interface SimulationState extends SimulationData, OperatingActions {
  replaceProject: (project: Project) => void;
  updateMetadata: (
    key: ProjectKey,
    metadata: { logo: string; links: { label: string; url: string }[] },
  ) => void;
  reset: () => void;
  createProject: (input: CreateInput) => ProjectKey;
  trade: (
    key: ProjectKey,
    side: "buy" | "sell",
    input: string,
    expected?: CurveQuote,
  ) => CurveQuote;
  startMigration: (key: ProjectKey) => void;
  completeMigration: (key: ProjectKey) => void;
  failMigration: (key: ProjectKey) => void;
  seedScenario: (key: ProjectKey, scenario: Scenario) => void;
  fundDemo: () => void;
  setTradeFailure: () => void;
  hydrate: (storage: Storage) => void;
  refreshVolumes: () => void;
}
const now = () => new Date().toISOString();
function projectWithCurve(project: Project, ledger: CurveLedger): Project {
  const state = ledgerState(ledger);
  return {
    ...project,
    updatedAt: ledger.updatedAt,
    curve: {
      ...project.curve,
      netReserve: displayNumber(state.reserve),
      soldInventory: displayNumber(state.sold),
      remainingInventory: displayNumber(CURVE_INVENTORY - state.sold),
      curvePrice: displayNumber(priceAtSold(state.sold)),
      progress: displayNumber((state.reserve * UNIT) / RESERVE_TARGET),
      volume24h: displayNumber(BigInt(ledger.volume)),
      participants: ledger.seedParticipants + ledger.buyers.length,
    },
  };
}
function seed(): SimulationData {
  const projects = {} as Record<ProjectKey, Project>;
  const curves = {} as Record<ProjectKey, CurveLedger>;
  for (const p of mockProjects) {
    const key = projectKey(p.chainId, p.tokenContract);
    const sold = parseAmount(String(p.curve.soldInventory));
    const ledger: CurveLedger = {
      reserve: reserveAtSold(sold).toString(),
      sold: sold.toString(),
      volume: parseAmount(String(p.curve.volume24h)).toString(),
      buyers: [],
      seedParticipants: p.curve.participants,
      completedAt:
        p.lifecycle === "CURVE_OPEN"
          ? null
          : (p.migration.startedAt ?? p.createdAt),
      updatedAt: "2026-10-11T08:00:00Z",
    };
    curves[key] = ledger;
    projects[key] = projectWithCurve(structuredClone(p), ledger);
  }
  const currentUser = structuredClone(mockUser);
  return {
    projects,
    curves,
    currentUser,
    exactBalances: Object.fromEntries(
      currentUser.balances.map((b) => [
        balanceKey(b.chainId, b.asset),
        parseAmount(String(b.amount)).toString(),
      ]),
    ),
    activities: structuredClone(mockActivities),
    sequence: 1000,
    revision: 0,
    hydrated: false,
    failNextTrade: false,
    operatingBooks: Object.fromEntries(
      Object.entries(projects)
        .filter(([, p]) => p.lifecycle === "OPERATING")
        .map(([key, p]) => [key, makeBook(p)]),
    ),
    failNextOperating: false,
  };
}
function event(
  state: SimulationData,
  p: Project,
  type: Activity["type"],
  summary: string,
  fields: Record<string, string> = {},
): Activity {
  return {
    id: `SIM-${state.sequence}`,
    projectKey: projectKey(p.chainId, p.tokenContract),
    projectId: p.projectId,
    type,
    wallet: state.currentUser.wallet,
    timestamp: now(),
    displayValues: { summary, ...fields },
  };
}
function syncBalances(user: User, exact: Record<string, string>): User {
  return {
    ...user,
    balances: Object.entries(exact).map(([key, amount]) => {
      const separator = key.indexOf(":");
      const asset = key.slice(separator + 1);
      return {
        chainId: Number(key.slice(0, separator)),
        asset: asset === "usdt" ? "USDT" : (asset as Address),
        amount: displayNumber(BigInt(amount)),
      };
    }),
  };
}
function requireProject(state: SimulationData, key: ProjectKey) {
  const p = state.projects[key];
  if (!p) throw new Error("未找到项目");
  return p;
}
export function createSimulationStore() {
  return createStore<SimulationState>()((set, get) => ({
    ...seed(),
    ...operatingActions(set, get),
    updateMetadata: (key, metadata) => {
      const state = get();
      const p = requireProject(state, key);
      if (
        p.creatorWallet.toLowerCase() !== state.currentUser.wallet.toLowerCase()
      )
        throw new Error("只有创建者可以更新项目资料");
      if (Object.keys(metadata).some((k) => !["logo", "links"].includes(k)))
        throw new Error("仅允许更新 Logo 和链接");
      if (
        !metadata.logo.trim() ||
        metadata.logo.length > 400000 ||
        !Array.isArray(metadata.links) ||
        metadata.links.length > 6
      )
        throw new Error("项目标识或链接无效");
      if (
        metadata.logo.startsWith("data:") &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          metadata.logo,
        )
      )
        throw new Error("Logo 仅支持 PNG、JPEG 或 WebP 图片");
      if (!metadata.logo.startsWith("data:") && [...metadata.logo].length > 4)
        throw new Error("文字标识最多 4 个字符");
      if (
        Object.keys(validateLinks(metadata.links)).length ||
        metadata.links.some((l) => !l.label.trim() || l.label.length > 32)
      )
        throw new Error("请输入有效的项目链接");
      set({
        projects: {
          ...state.projects,
          [key]: {
            ...p,
            logo: metadata.logo.trim(),
            links: metadata.links
              .filter((l) => l.url.trim())
              .map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
            updatedAt: now(),
          },
        },
        revision: state.revision + 1,
      });
    },
    replaceProject: (project) =>
      set((state) => {
        const key = projectKey(project.chainId, project.tokenContract);
        if (
          Object.values(state.projects).some(
            (p) =>
              p.projectId === project.projectId &&
              projectKey(p.chainId, p.tokenContract) !== key,
          )
        )
          throw new Error("Project ID already registered");
        return {
          projects: {
            ...state.projects,
            [key]: structuredClone({
              ...project,
              tokenContract: project.tokenContract.toLowerCase() as Address,
            }),
          },
          revision: state.revision + 1,
        };
      }),
    reset: () => set({ ...seed(), hydrated: true }),
    createProject: (input) => {
      const errors = {
        ...validateIdentity(input),
        ...validateLinks(input.links),
      };
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      const state = get();
      let sequence = state.sequence;
      let contract: Address;
      let key: ProjectKey;
      let id: string;
      do {
        contract = `0x${(0xe000000000000000000000000000000000000000n + BigInt(sequence)).toString(16).padStart(40, "0")}`;
        key = projectKey(56, contract);
        id = `NX-DEMO-${sequence}`;
        sequence++;
      } while (
        state.projects[key] ||
        Object.values(state.projects).some((p) => p.projectId === id)
      );
      const timestamp = now();
      const p: Project = {
        projectId: id,
        chainId: 56,
        tokenContract: contract,
        name: input.name.trim(),
        symbol: input.symbol.trim(),
        logo: input.logo,
        description: input.description,
        links: input.links
          .filter((l) => l.url.trim())
          .map((l) => ({ ...l, url: l.url.trim() })),
        creatorWallet: state.currentUser.wallet,
        lifecycle: "CURVE_OPEN",
        priceStatus: "VALID",
        createdAt: timestamp,
        updatedAt: timestamp,
        curve: {
          curvePrice: 0.03125,
          netReserve: 0,
          targetReserve: 100000,
          soldInventory: 0,
          remainingInventory: 800000,
          progress: 0,
          participants: 0,
          volume24h: 0,
        },
        migration: {
          state: "NOT_STARTED",
          startedAt: null,
          completedAt: null,
          resultingPools: [],
        },
        operating: null,
      };
      const ledger: CurveLedger = {
        reserve: "0",
        sold: "0",
        volume: "0",
        buyers: [],
        seedParticipants: 0,
        completedAt: null,
        updatedAt: timestamp,
      };
      set({
        projects: { ...state.projects, [key]: p },
        curves: { ...state.curves, [key]: ledger },
        activities: [
          event(state, p, "CREATE", "项目已创建"),
          ...state.activities,
        ],
        sequence,
        revision: state.revision + 1,
      });
      return key;
    },
    trade: (key, side, input, expected) => {
      const state = get();
      const p = requireProject(state, key);
      if (p.lifecycle !== "CURVE_OPEN") throw new Error("曲线交易已关闭");
      const ledger = state.curves[key];
      if (!ledger) throw new Error("报价暂不可用");
      const before = ledgerState(ledger);
      if (
        expected &&
        (expected.before.reserve !== before.reserve ||
          expected.before.sold !== before.sold)
      )
        throw new Error("报价已变化，请重新确认");
      const quote = (side === "buy" ? quoteBuy : quoteSell)(before, input);
      const usdt = balanceKey(p.chainId, "USDT");
      const token = balanceKey(p.chainId, p.tokenContract);
      const u = BigInt(state.exactBalances[usdt] ?? "0");
      const x = BigInt(state.exactBalances[token] ?? "0");
      if (side === "buy" && u < quote.accepted) throw new Error("USDT余额不足");
      if (side === "sell" && x < quote.tokenAmount)
        throw new Error("代币余额不足");
      if (state.failNextTrade) {
        set({ failNextTrade: false });
        throw new Error("交易失败，余额与项目状态未发生变动");
      }
      const exact = {
        ...state.exactBalances,
        [usdt]: (side === "buy"
          ? u - quote.accepted
          : u + quote.receive
        ).toString(),
        [token]: (side === "buy"
          ? x + quote.tokenAmount
          : x - quote.tokenAmount
        ).toString(),
      };
      const timestamp = now();
      const buyers =
        side === "buy" && !ledger.buyers.includes(state.currentUser.wallet)
          ? [...ledger.buyers, state.currentUser.wallet]
          : ledger.buyers;
      const nextLedger: CurveLedger = {
        ...ledger,
        creatorRevenue: (
          creatorCurveRevenue(state, key) +
          quote.fee / 2n
        ).toString(),
        reserve: quote.newReserve.toString(),
        sold: quote.newSold.toString(),
        ...rollingVolume(
          ledger,
          timestamp,
          side === "buy" ? quote.accepted : quote.grossOutput,
        ),
        buyers,
        updatedAt: timestamp,
        completedAt: quote.graduates ? timestamp : null,
      };
      let next = projectWithCurve(p, nextLedger);
      if (quote.graduates)
        next = {
          ...next,
          lifecycle: "MIGRATION_READY",
          priceStatus: "PRICE_DISCOVERY",
          migration: {
            state: "READY",
            startedAt: null,
            completedAt: null,
            resultingPools: [],
          },
        };
      const activity = event(
        state,
        p,
        side === "buy" ? "BUY" : "SELL",
        side === "buy"
          ? `买入 ${displayAmount(quote.tokenAmount, 4)} ${p.symbol}`
          : `卖出 ${displayAmount(quote.tokenAmount, 4)} ${p.symbol}`,
        {
          action: side === "buy" ? "买入" : "卖出",
          amount: decimal(side === "buy" ? quote.accepted : quote.tokenAmount),
          received: decimal(quote.receive),
          fee: decimal(quote.fee),
          paidAsset: side === "buy" ? "USDT" : p.symbol,
          receivedAsset: side === "buy" ? p.symbol : "USDT",
        },
      );
      const activities = [activity, ...state.activities];
      if (quote.graduates)
        activities.unshift({
          ...event(
            { ...state, sequence: state.sequence + 1 },
            next,
            "CURVE_COMPLETED",
            "曲线发行已完成",
          ),
          timestamp,
        });
      set({
        projects: { ...state.projects, [key]: next },
        curves: { ...state.curves, [key]: nextLedger },
        exactBalances: exact,
        currentUser: syncBalances(state.currentUser, exact),
        activities,
        sequence: state.sequence + (quote.graduates ? 2 : 1),
        revision: state.revision + 1,
      });
      return quote;
    },
    startMigration: (key) => {
      const state = get();
      const p = requireProject(state, key);
      if (
        p.lifecycle !== "MIGRATION_READY" ||
        !graduation(ledgerState(state.curves[key]))
      )
        throw new Error("项目尚未满足迁移条件");
      set({
        projects: {
          ...state.projects,
          [key]: {
            ...p,
            lifecycle: "MIGRATING",
            priceStatus: "PRICE_DISCOVERY",
            updatedAt: now(),
            migration: {
              ...p.migration,
              state: "PENDING",
              startedAt: now(),
              completedAt: null,
              resultingPools: [],
              lastError: null,
            },
          },
        },
        revision: state.revision + 1,
      });
    },
    failMigration: (key) => {
      const state = get();
      const p = requireProject(state, key);
      if (p.lifecycle !== "MIGRATING") throw new Error("当前没有迁移过程");
      set({
        projects: {
          ...state.projects,
          [key]: {
            ...p,
            lifecycle: "MIGRATION_READY",
            updatedAt: now(),
            migration: {
              ...p.migration,
              state: "READY",
              resultingPools: [],
              completedAt: null,
              lastError: "迁移未完成，已返回准备状态。资产保持完整。",
            },
          },
        },
        revision: state.revision + 1,
      });
    },
    completeMigration: (key) => {
      const state = get();
      const p = requireProject(state, key);
      if (
        p.lifecycle !== "MIGRATING" ||
        !graduation(ledgerState(state.curves[key]))
      )
        throw new Error("当前不可完成迁移");
      const timestamp = now();
      const pools: Project["migration"]["resultingPools"] = p.isPlatformToken
        ? [{ pair: "NEXUS/USDT", liquidity: 200000 }]
        : [
            { pair: "X/USDT", liquidity: 100000 },
            { pair: "X/NEXUS", liquidity: 100000 },
          ];
      const next: Project = {
        ...p,
        lifecycle: "OPERATING",
        priceStatus: "VALID",
        updatedAt: timestamp,
        migration: {
          ...p.migration,
          state: "COMPLETED",
          completedAt: timestamp,
          resultingPools: pools,
          lastError: null,
        },
        operating: {
          tokenPrice: 0.5,
          marketCap: 500000,
          change24h: null,
          volume24h: 0,
          liquidity: 200000,
          tvl: 200000,
          activeParticipants: 0,
          totalStaked: 0,
          treasuryBalance: 0,
          polValue: 200000,
          burnedSupply: 0,
          activePositionValue: 0,
          lastSettledReward: null,
          updatedAt: timestamp,
        },
      };
      set({
        projects: { ...state.projects, [key]: next },
        operatingBooks: { ...state.operatingBooks, [key]: makeBook(next) },
        activities: [
          event(state, next, "MIGRATION_COMPLETED", "迁移已完成，流动性已建立"),
          ...state.activities,
        ],
        sequence: state.sequence + 1,
        revision: state.revision + 1,
      });
    },
    seedScenario: (key, scenario) => {
      const state = get();
      const p = requireProject(state, key);
      const reserve =
        {
          fresh: 0n,
          half: 50000n,
          seventyFive: 75000n,
          ninety: 90000n,
          near: 99990n,
          ready: 100000n,
          processing: 100000n,
          operating: 100000n,
        }[scenario] * UNIT;
      const sold = soldAtReserve(reserve);
      const timestamp = now();
      const ledger: CurveLedger = {
        reserve: reserve.toString(),
        sold: sold.toString(),
        volume: "0",
        seedParticipants: reserve === 0n ? 0 : 1,
        buyers: [],
        completedAt: reserve === RESERVE_TARGET ? timestamp : null,
        updatedAt: timestamp,
      };
      const ready = reserve === RESERVE_TARGET;
      const next = projectWithCurve(
        {
          ...p,
          lifecycle: ready ? "MIGRATION_READY" : "CURVE_OPEN",
          priceStatus: ready ? "PRICE_DISCOVERY" : "VALID",
          operating: null,
          migration: {
            state: ready ? "READY" : "NOT_STARTED",
            startedAt: null,
            completedAt: null,
            resultingPools: [],
          },
        },
        ledger,
      );
      const books = { ...state.operatingBooks };
      delete books[key];
      const exact = {
        ...state.exactBalances,
        [balanceKey(p.chainId, p.tokenContract)]: "0",
      };
      set({
        projects: { ...state.projects, [key]: next },
        curves: { ...state.curves, [key]: ledger },
        exactBalances: exact,
        operatingBooks: books,
        currentUser: userSummary(state.currentUser, books, exact),
        activities: state.activities.filter((a) => a.projectKey !== key),
        revision: state.revision + 1,
      });
      if (scenario === "processing" || scenario === "operating")
        get().startMigration(key);
      if (scenario === "operating") get().completeMigration(key);
    },
    fundDemo: () =>
      set((state) => {
        const exact = {
          ...state.exactBalances,
          [balanceKey(56, "USDT")]: (
            BigInt(state.exactBalances[balanceKey(56, "USDT")] ?? "0") +
            250000n * UNIT
          ).toString(),
        };
        return {
          exactBalances: exact,
          currentUser: syncBalances(state.currentUser, exact),
          revision: state.revision + 1,
        };
      }),
    setTradeFailure: () => set({ failNextTrade: true }),
    refreshVolumes: () => {
      const state = get();
      const timestamp = now();
      let changed = false;
      const curves = { ...state.curves };
      const projects = { ...state.projects };
      for (const [key, ledger] of Object.entries(state.curves)) {
        const volume = rollingVolume(ledger, timestamp);
        if (volume.volume !== ledger.volume) {
          changed = true;
          curves[key as ProjectKey] = { ...ledger, ...volume };
          projects[key as ProjectKey] = projectWithCurve(
            projects[key as ProjectKey],
            curves[key as ProjectKey],
          );
        }
      }
      if (changed) set({ curves, projects, revision: state.revision + 1 });
    },
    hydrate: (storage) => {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as SimulationData & { version: number };
          if (
            data.version !== 3 ||
            !data.projects ||
            !data.curves ||
            !data.currentUser ||
            !data.exactBalances
          )
            throw new Error("Invalid demo save");
          if (!/^0x[0-9a-f]{40}$/.test(data.currentUser.wallet))
            throw new Error("Invalid user identity");
          const ids = new Set<string>();
          for (const [key, p] of Object.entries(data.projects)) {
            if (
              ids.has(p.projectId) ||
              !/^0x[0-9a-fA-F]{40}$/.test(p.creatorWallet)
            )
              throw new Error("Invalid creator or registry identity");
            ids.add(p.projectId);
            if (
              ![
                "CURVE_OPEN",
                "MIGRATION_READY",
                "MIGRATING",
                "OPERATING",
              ].includes(p.lifecycle) ||
              ![
                "VALID",
                "PROTECTED",
                "PRICE_INVALID",
                "PRICE_DISCOVERY",
              ].includes(p.priceStatus) ||
              !Number.isFinite(Date.parse(p.createdAt)) ||
              !p.projectId ||
              !p.name ||
              !p.symbol ||
              Object.keys(validateLinks(p.links ?? [])).length
            )
              throw new Error("Invalid project data");
            if (key !== projectKey(p.chainId, p.tokenContract))
              throw new Error("Invalid identity");
            const ledger = data.curves[key as ProjectKey];
            if (
              ledger.creatorRevenue !== undefined &&
              !/^\d+$/.test(ledger.creatorRevenue)
            )
              throw new Error("Invalid creator revenue");
            validateCurve(ledgerState(ledger));
            if (
              p.lifecycle !== "CURVE_OPEN" &&
              !graduation(ledgerState(ledger))
            )
              throw new Error("Invalid lifecycle");
          }
          for (const amount of Object.values(data.exactBalances))
            if (!/^\d+$/.test(amount)) throw new Error("Invalid balance");
          if (
            !Array.isArray(data.activities) ||
            data.activities.some(
              (a) =>
                !data.projects[a.projectKey] ||
                !/^0x[0-9a-fA-F]{40}$/.test(a.wallet) ||
                !Number.isFinite(Date.parse(a.timestamp)) ||
                typeof a.displayValues?.summary !== "string",
            )
          )
            throw new Error("Invalid activity history");
          const platformKey = projectKey(
            platformProject.chainId,
            platformProject.tokenContract,
          );
          if (!data.projects[platformKey]) {
            const defaults = seed();
            data.projects[platformKey] = defaults.projects[platformKey];
            data.curves[platformKey] = defaults.curves[platformKey];
            if (data.operatingBooks)
              data.operatingBooks[platformKey] =
                defaults.operatingBooks[platformKey];
          }
          data.projects[platformKey] = {
            ...data.projects[platformKey],
            name: "NEXNS",
            symbol: "NEXNS",
            description: "NEXNS 平台代币，连接项目与协议生态。",
          };
          const renamedPresetKeys = new Set<string>();
          for (const project of Object.values(data.projects)) {
            if (
              ["演示新经济体", "新项目"].includes(project.name) &&
              project.symbol === "DEMO" &&
              (project.description.includes("用于外部产品演示") ||
                project.description === "连接参与者与长期价值的链上项目。")
            ) {
              project.name = "新项目";
              project.symbol = "NEW";
              if (project.logo === "演") project.logo = "N";
              renamedPresetKeys.add(
                projectKey(project.chainId, project.tokenContract),
              );
            }

            if (
              project.description.includes("当前展示的数据由模拟数据源提供") ||
              project.description.includes("用于验证产品结构与生命周期") ||
              project.description.includes("用于外部产品演示的全新模拟")
            )
              project.description = "连接参与者与长期价值的链上项目。";
          }
          for (const activity of data.activities) {
            if (renamedPresetKeys.has(activity.projectKey)) {
              activity.displayValues.summary = activity.displayValues.summary
                .replace(/\bDEMO\b/g, "NEW")
                .replace(/演示新经济体/g, "新项目");
              if (activity.displayValues.receivedAsset === "DEMO")
                activity.displayValues.receivedAsset = "NEW";
            }
          }
          const books =
            data.operatingBooks ??
            Object.fromEntries(
              Object.entries(data.projects)
                .filter(([, p]) => p.lifecycle === "OPERATING")
                .map(([key, p]) => [key, makeBook(p)]),
            );
          for (const [key, book] of Object.entries(books)) {
            if (data.projects[key as ProjectKey]?.lifecycle !== "OPERATING")
              throw new Error("Invalid Operating project");
            validateOperatingBook(book, key as ProjectKey);
          }
          if (
            !Number.isSafeInteger(data.sequence) ||
            data.sequence < 1000 ||
            !Number.isSafeInteger(data.revision) ||
            data.revision < 0
          )
            throw new Error("Invalid simulation revision");
          set({
            projects: data.projects,
            curves: data.curves,
            currentUser: userSummary(
              data.currentUser,
              books,
              data.exactBalances,
            ),
            exactBalances: data.exactBalances,
            activities: data.activities,
            sequence: data.sequence,
            revision: data.revision,
            hydrated: true,
            failNextTrade: data.failNextTrade ?? false,
            operatingBooks: books,
            failNextOperating: data.failNextOperating ?? false,
          });
          return;
        }
      } catch {
        storage.removeItem(STORAGE_KEY);
      }
      set({ hydrated: true });
    },
  }));
}
export function persistSnapshot(state: SimulationState, storage: Storage) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 3,
      failNextTrade: state.failNextTrade,
      failNextOperating: state.failNextOperating,
      operatingBooks: state.operatingBooks,
      projects: state.projects,
      curves: state.curves,
      exactBalances: state.exactBalances,
      currentUser: state.currentUser,
      activities: state.activities.slice(0, 1000),
      sequence: state.sequence,
      revision: state.revision,
    }),
  );
}
export const simulationStore = createSimulationStore();
export const useSimulation = <T>(selector: (state: SimulationState) => T): T =>
  useStore(simulationStore, selector);
