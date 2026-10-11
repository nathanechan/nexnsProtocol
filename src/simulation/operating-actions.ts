import type { StoreApi } from "zustand/vanilla";
import type { SimulationState } from "./store";
import { balanceKey } from "./store";
import { projectKey, normalizeAddress } from "../domain/identity";
import type {
  Address,
  Project,
  ProjectKey,
  User,
  Activity,
} from "../domain/models";
import {
  parseAmount,
  UNIT,
  displayNumber,
  displayAmount,
  decimal,
} from "../domain/economics/amount";
import {
  activePrincipal,
  contributions,
  coverage,
  cumulativeClaim,
  validPrices,
} from "../domain/economics/operating";
import {
  emptyMember,
  settleOperatingDay,
} from "../domain/economics/settlement";
import type {
  OperatingBook,
  OperatingPreset,
} from "../domain/economics/operating-models";
export interface OperatingActions {
  participate: (key: ProjectKey, input: string, referral?: string) => void;
  stakeTokens: (key: ProjectKey, input: string, unstake?: boolean) => void;
  claimReward: (key: ProjectKey, input: string) => void;
  settleDay: (key: ProjectKey) => void;
  advanceHours: (key: ProjectKey, hours: number) => void;
  fundToken: (key: ProjectKey) => void;
  seedOperating: (key: ProjectKey, preset: OperatingPreset) => void;
  seedNetwork: (key: ProjectKey, branch?: boolean) => void;
  setOperatingFailure: () => void;
}
const simulationTimestamp = (book: OperatingBook) =>
  new Date(
    Date.parse(`${book.day}T00:00:00Z`) + book.hour * 3600000,
  ).toISOString();
export function makeBook(p: Project): OperatingBook {
  const today = Date.parse(
    new Date().toISOString().slice(0, 10) + "T00:00:00Z",
  );
  const launch = Math.max(
    Date.parse(p.createdAt),
    Date.parse(p.migration.completedAt ?? p.createdAt),
  );
  const day = new Date(Math.max(today, Math.ceil(launch / 86400000) * 86400000))
    .toISOString()
    .slice(0, 10);
  const price = p.operating?.tokenPrice;
  const direct =
    price === null || price === undefined ? null : parseAmount(String(price));
  const pair = {
    direct: direct?.toString() ?? null,
    indirect:
      direct === null
        ? null
        : (p.priceStatus === "PROTECTED"
            ? (direct * 110n) / 100n
            : direct
          ).toString(),
    status: p.priceStatus,
  };
  const root = normalizeAddress(p.creatorWallet);
  const members = { [root]: emptyMember(root) };
  return {
    projectIdentity: projectKey(p.chainId, p.tokenContract),
    root,
    day,
    hour: 0,
    members,
    prices: pair,
    snapshots: [{ hour: 0, members: structuredClone(members), prices: pair }],
    settlements: [],
    claims: [],
    lifetimeMinted: (1000000n * UNIT).toString(),
    creatorAccrued: "0",
    platformAccrued: "0",
    claimDust: "0",
    burned: "0",
    base: {
      activePrincipal: parseAmount(
        String(p.operating?.activePositionValue ?? 0),
      ).toString(),
      participants: p.operating?.activeParticipants ?? 0,
      staked: parseAmount(String(p.operating?.totalStaked ?? 0)).toString(),
      treasury: parseAmount(
        String(p.operating?.treasuryBalance ?? 0),
      ).toString(),
      tvl: parseAmount(String(p.operating?.tvl ?? 0)).toString(),
      burned: parseAmount(String(p.operating?.burnedSupply ?? 0)).toString(),
      marketCap:
        p.operating?.marketCap == null
          ? null
          : parseAmount(String(p.operating.marketCap)).toString(),
    },
    revision: 0,
  };
}
export function referralCode(key: ProjectKey, wallet: Address) {
  return `${key}|${wallet.toLowerCase()}`;
}
export function bindSponsor(
  book: OperatingBook,
  wallet: Address,
  referral?: string,
): Address | null {
  const member = book.members[wallet];
  if (wallet === book.root) {
    if (referral) throw new Error("创建者根身份无需推荐人");
    return null;
  }
  let proposed: Address = book.root;
  if (referral) {
    const split = referral.split("|");
    if (split.length !== 2 || split[0] !== projectKeyFromBook(book))
      throw new Error("推荐码不属于当前项目");
    proposed = normalizeAddress(split[1]);
    if (proposed === wallet) throw new Error("不能推荐自己");
    if (
      !book.members[proposed] ||
      (!book.members[proposed].bound && proposed !== book.root)
    )
      throw new Error("推荐人尚未加入当前项目");
  }
  if (member?.bound) {
    if (referral && member.sponsor !== proposed)
      throw new Error("推荐关系已绑定，不能更换");
    return member.sponsor;
  }
  let cursor: Address | null = proposed;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === wallet || visited.has(cursor))
      throw new Error("推荐关系不能形成循环");
    visited.add(cursor);
    cursor = book.members[cursor]?.sponsor ?? null;
  }
  return proposed;
}
function projectKeyFromBook(book: OperatingBook) {
  return book.projectIdentity!;
}

function checkpoint(book: OperatingBook): OperatingBook {
  return {
    ...book,
    snapshots: [
      ...book.snapshots.filter((s) => s.hour !== book.hour),
      {
        hour: book.hour,
        members: structuredClone(book.members),
        prices: structuredClone(book.prices),
      },
    ].sort((a, b) => a.hour - b.hour),
    revision: book.revision + 1,
  };
}
function ensure(s: SimulationState, key: ProjectKey) {
  const p = s.projects[key];
  if (!p || p.lifecycle !== "OPERATING")
    throw new Error("项目尚未进入运行阶段");
  const source = s.operatingBooks[key] ?? makeBook(p);
  const book = structuredClone({ ...source, projectIdentity: key });
  if (book.prices.status !== p.priceStatus) {
    book.prices = { ...book.prices, status: p.priceStatus };
    book.snapshots = checkpoint(book).snapshots;
  }
  return { p, book };
}
function positive(input: string) {
  const amount = parseAmount(input);
  if (amount <= 0n) throw new Error("数量必须大于 0");
  return amount;
}
export function projectSummary(p: Project, book: OperatingBook): Project {
  const members = Object.values(book.members);
  const principal = members.reduce((sum, m) => sum + activePrincipal(m), 0n);
  const staked = members.reduce((sum, m) => sum + BigInt(m.staked), 0n);
  const prices = validPrices(book.prices);
  return {
    ...p,
    updatedAt: simulationTimestamp(book),
    operating: {
      ...p.operating!,
      marketCap:
        prices && book.base.marketCap != null
          ? displayNumber(
              BigInt(book.base.marketCap) +
                ((BigInt(book.lifetimeMinted) -
                  1000000n * UNIT -
                  BigInt(book.burned)) *
                  BigInt(book.prices.direct!)) /
                  UNIT,
            )
          : null,
      activePositionValue: displayNumber(
        BigInt(book.base.activePrincipal) + principal,
      ),
      activeParticipants:
        book.base.participants +
        members.filter((m) => activePrincipal(m) > 0n).length,
      totalStaked: displayNumber(BigInt(book.base.staked) + staked),
      treasuryBalance: displayNumber(
        BigInt(book.base.treasury) +
          members.reduce(
            (sum, m) =>
              sum + m.lots.reduce((v, l) => v + BigInt(l.principal), 0n),
            0n,
          ),
      ),
      tvl: displayNumber(
        BigInt(book.base.tvl) +
          members.reduce(
            (sum, m) =>
              sum + m.lots.reduce((v, l) => v + BigInt(l.principal), 0n),
            0n,
          ),
      ),
      burnedSupply: displayNumber(
        BigInt(book.base.burned) + BigInt(book.burned),
      ),
      lastSettledReward: book.settlements[0]
        ? displayNumber(BigInt(book.settlements[0].gross))
        : (p.operating?.lastSettledReward ?? null),
      tokenPrice: prices
        ? displayNumber(BigInt(book.prices.direct!))
        : p.operating!.tokenPrice,
      updatedAt: simulationTimestamp(book),
    },
  };
}
export function userSummary(
  user: User,
  books: Record<ProjectKey, OperatingBook>,
  balances: Record<string, string>,
): User {
  const positions: User["projectPositions"] = [],
    stakes: User["stakes"] = [],
    rewards: User["rewards"] = [],
    network: User["contributions"] = [];
  for (const [key, b] of Object.entries(books)) {
    const member = b.members[user.wallet];
    if (!member) continue;
    const price = validPrices(b.prices)?.stake ?? null;
    for (const l of member.lots)
      positions.push({
        id: l.id,
        projectKey: key as ProjectKey,
        principal: displayNumber(BigInt(l.principal)),
        capacity: displayNumber(BigInt(l.capacity)),
        used: displayNumber(BigInt(l.used)),
        remaining: displayNumber(BigInt(l.capacity) - BigInt(l.used)),
        createdAt: l.createdAt,
        status: l.status,
      });
    stakes.push({
      projectKey: key as ProjectKey,
      amount: displayNumber(BigInt(member.staked)),
      coverage:
        coverage(activePrincipal(member), BigInt(member.staked), price) === null
          ? null
          : displayNumber(
              coverage(activePrincipal(member), BigInt(member.staked), price)!,
            ),
    });
    rewards.push({
      projectKey: key as ProjectKey,
      settled: displayNumber(
        BigInt(b.settlements[0]?.members[user.wallet]?.gross ?? "0"),
      ),
      claimable: displayNumber(BigInt(member.claimable)),
      lifetimeEarned: displayNumber(BigInt(member.lifetimeEarned)),
    });
    const c = contributions(b.members, price)[user.wallet];
    network.push({
      projectKey: key as ProjectKey,
      value: displayNumber(c.value),
      weight: displayNumber(c.weight),
      activeNetwork: c.activeNetwork,
      networkReward: displayNumber(BigInt(member.networkEarned)),
    });
  }
  return {
    ...user,
    projectPositions: positions,
    stakes,
    rewards,
    contributions: network,
    balances: Object.entries(balances).map(([key, amount]) => ({
      chainId: Number(key.split(":")[0]),
      asset:
        key.split(":")[1] === "usdt" ? "USDT" : (key.split(":")[1] as Address),
      amount: displayNumber(BigInt(amount)),
    })),
  };
}
export function operatingActions(
  set: StoreApi<SimulationState>["setState"],
  get: () => SimulationState,
): OperatingActions {
  const commit = (
    s: SimulationState,
    key: ProjectKey,
    book: OperatingBook,
    balances: Record<string, string>,
    type: Activity["type"],
    summary: string,
    fields: Record<string, string> = {},
    checkpointNeeded = true,
  ) => {
    const next = checkpointNeeded
      ? checkpoint(book)
      : { ...book, revision: book.revision + 1 };
    const books = { ...s.operatingBooks, [key]: next };
    const p = projectSummary(s.projects[key], next);
    if (["PARTICIPATE", "CLAIM", "REWARD_SETTLED"].includes(type))
      next.publicResults = [
        ...(next.publicResults ?? []),
        {
          id: `RESULT-${s.sequence}`,
          timestamp: simulationTimestamp(next),
          treasury: (
            BigInt(next.base.treasury) +
            Object.values(next.members)
              .flatMap((m) => m.lots)
              .reduce((n, l) => n + BigInt(l.principal), 0n)
          ).toString(),
          pol:
            p.operating?.polValue == null
              ? null
              : parseAmount(String(p.operating.polValue)).toString(),
          liquidity: parseAmount(
            String(p.operating?.liquidity ?? 0),
          ).toString(),
          burned: (BigInt(next.base.burned) + BigInt(next.burned)).toString(),
        },
      ].slice(-100);
    const event: Activity = {
      id: `SIM-${s.sequence}`,
      projectKey: key,
      projectId: p.projectId,
      wallet: s.currentUser.wallet,
      type,
      timestamp: simulationTimestamp(next),
      displayValues: { summary, ...fields },
    };
    set({
      operatingBooks: books,
      projects: { ...s.projects, [key]: p },
      exactBalances: balances,
      currentUser: userSummary(s.currentUser, books, balances),
      activities: [event, ...s.activities],
      sequence: s.sequence + 1,
      revision: s.revision + 1,
    });
  };
  const fail = (s: SimulationState) => {
    if (s.failNextOperating) {
      set({ failNextOperating: false });
      throw new Error("处理失败，资产与权益未发生变动");
    }
  };
  return {
    participate: (key, input, referral) => {
      const s = get();
      const { p, book } = ensure(s, key);
      if (!validPrices(book.prices))
        throw new Error("当前有效价格不可用，暂不能新增参与");

      const amount = positive(input);
      const asset = balanceKey(p.chainId, "USDT");
      const available = BigInt(s.exactBalances[asset] ?? "0");
      if (amount > available) throw new Error("USDT 余额不足");
      const sponsor = bindSponsor(book, s.currentUser.wallet, referral);
      fail(s);
      const m =
        book.members[s.currentUser.wallet] ?? emptyMember(s.currentUser.wallet);
      m.sponsor = sponsor;
      m.bound = true;
      m.lots.push({
        id: `LOT-${String(s.sequence).padStart(8, "0")}`,
        wallet: m.wallet,
        projectKey: key,
        principal: amount.toString(),
        capacity: ((amount * 5n) / 2n).toString(),
        used: "0",
        settledGross: "0",
        createdAt: new Date(
          Date.parse(`${book.day}T00:00:00Z`) + book.hour * 3600000,
        ).toISOString(),
        completedAt: null,
        status: "ACTIVE",
      });
      book.members[m.wallet] = m;
      commit(
        s,
        key,
        book,
        { ...s.exactBalances, [asset]: (available - amount).toString() },
        "PARTICIPATE",
        `参与 ${displayAmount(amount)} USDT · 新头寸已建立`,
        { amount: decimal(amount) },
      );
    },
    stakeTokens: (key, input, unstake = false) => {
      const s = get();
      const { p, book } = ensure(s, key);
      const amount = positive(input);
      const m =
        book.members[s.currentUser.wallet] ?? emptyMember(s.currentUser.wallet);
      if (!unstake && !validPrices(book.prices))
        throw new Error("当前有效价格不可用，覆盖率暂不可计算");

      const asset = balanceKey(p.chainId, p.tokenContract);
      const available = BigInt(s.exactBalances[asset] ?? "0"),
        staked = BigInt(m.staked);
      if (unstake ? amount > staked : amount > available)
        throw new Error(unstake ? "解除数量超过已质押数量" : "代币余额不足");
      fail(s);
      m.staked = (unstake ? staked - amount : staked + amount).toString();
      book.members[m.wallet] = m;
      commit(
        s,
        key,
        book,
        {
          ...s.exactBalances,
          [asset]: (unstake
            ? available + amount
            : available - amount
          ).toString(),
        },
        unstake ? "UNSTAKE" : "STAKE",
        `${unstake ? "解除质押" : "质押"} ${displayAmount(amount)} ${p.symbol}`,
        { amount: decimal(amount) },
      );
    },
    claimReward: (key, input) => {
      const s = get();
      const { p, book } = ensure(s, key);
      const amount = positive(input);
      const m = book.members[s.currentUser.wallet];
      if (!m || BigInt(m.claimable) === 0n)
        throw new Error("当前没有可领取奖励");
      if (amount > BigInt(m.claimable))
        throw new Error("领取数量超过可领取余额");
      const q = cumulativeClaim(amount, BigInt(m.lifetimeClaimed));
      if (q.received <= 0n) throw new Error("数量过小，无法产生有效到账");
      fail(s);
      m.claimable = (BigInt(m.claimable) - amount).toString();
      m.lifetimeClaimed = (BigInt(m.lifetimeClaimed) + amount).toString();
      book.creatorAccrued = (
        BigInt(book.creatorAccrued) + q.creator
      ).toString();
      book.platformAccrued = (
        BigInt(book.platformAccrued) + q.platform
      ).toString();
      book.claimDust = (BigInt(book.claimDust ?? "0") + q.dustDelta).toString();
      book.burned = (BigInt(book.burned) + q.burned).toString();
      book.claims.unshift({
        id: `CLAIM-${s.sequence}`,
        wallet: m.wallet,
        gross: amount.toString(),
        received: q.received.toString(),
        timestamp: simulationTimestamp(book),
        status: "COMPLETED",
      });
      const asset = balanceKey(p.chainId, p.tokenContract);
      commit(
        s,
        key,
        book,
        {
          ...s.exactBalances,
          [asset]: (
            BigInt(s.exactBalances[asset] ?? "0") + q.received
          ).toString(),
        },
        "CLAIM",
        `领取完成 · 实际到账 ${displayAmount(q.received)} ${p.symbol}`,
        {
          amount: decimal(amount),
          received: decimal(q.received),
          receivedAsset: p.symbol,
        },
        false,
      );
    },
    settleDay: (key) => {
      const s = get();
      const { book } = ensure(s, key);
      if (!book.snapshots.some((frame) => validPrices(frame.prices)))
        throw new Error("当日有效价格不可用，未产生新奖励");
      fail(s);
      const result = settleOperatingDay(book);
      commit(
        s,
        key,
        result.book,
        s.exactBalances,
        "REWARD_SETTLED",
        result.record.status === "NO_REWARD"
          ? "当日无有效奖励候选，已完成日结"
          : "当日奖励已结算",
        {},
        false,
      );
      if (result.completedLots.length) {
        const next = get();
        const events = result.completedLots.map((id, i) => ({
          id: `SIM-${next.sequence + i}`,
          projectKey: key,
          projectId: next.projects[key].projectId,
          wallet:
            Object.values(result.book.members).find((m) =>
              m.lots.some((l) => l.id === id),
            )?.wallet ?? next.currentUser.wallet,
          type: "POSITION_COMPLETED" as const,
          timestamp: simulationTimestamp(result.book),
          displayValues: { summary: `头寸 ${id} 已完成` },
        }));
        set({
          activities: [...events, ...next.activities],
          sequence: next.sequence + events.length,
        });
      }
    },
    advanceHours: (key, hours) => {
      const s = get();
      const { book } = ensure(s, key);
      if (!Number.isInteger(hours) || hours <= 0 || book.hour + hours > 24)
        throw new Error("请在当前模拟日内推进有效小时数");
      book.hour += hours;
      book.displayStartedAt = new Date().toISOString();
      const books = { ...s.operatingBooks, [key]: book };
      set({ operatingBooks: books, revision: s.revision + 1 });
    },
    fundToken: (key) => {
      const s = get();
      const p = s.projects[key];
      if (!p) throw new Error("未找到项目");
      const asset = balanceKey(p.chainId, p.tokenContract);
      const balances = {
        ...s.exactBalances,
        [asset]: (
          BigInt(s.exactBalances[asset] ?? "0") +
          50000n * UNIT
        ).toString(),
      };
      set({
        exactBalances: balances,
        currentUser: userSummary(s.currentUser, s.operatingBooks, balances),
        revision: s.revision + 1,
      });
    },
    setOperatingFailure: () => set({ failNextOperating: true }),
    seedOperating: (key, preset) => {
      const s = get();
      const { p } = ensure(s, key);
      const book = makeBook(p);
      if (s.operatingBooks[key])
        book.base = structuredClone(s.operatingBooks[key].base);
      book.projectIdentity = key;
      book.base = s.operatingBooks[key]?.base ?? book.base;
      const wallet = s.currentUser.wallet;
      const member = emptyMember(
        wallet,
        wallet === book.root ? null : book.root,
      );
      member.bound = true;
      const amounts = preset === "multi" ? [1000n, 2000n, 5000n] : [1000n];
      member.lots = amounts.map((v, i) => ({
        id: `DEMO-LOT-${String(s.sequence + i).padStart(8, "0")}`,
        wallet,
        projectKey: key,
        principal: (v * UNIT).toString(),
        capacity: ((v * UNIT * 5n) / 2n).toString(),
        used: "0",
        settledGross: "0",
        createdAt: `${book.day}T00:00:00.000Z`,
        completedAt: null,
        status: "ACTIVE",
      }));
      const price = validPrices(book.prices)?.stake;
      if (!price) throw new Error("当前项目缺少有效价格，无法建立此演示");
      const principal = activePrincipal(member);
      const fraction = preset === "low" ? 4n : preset === "mid" ? 30n : 50n;
      member.staked = (
        (principal * fraction * UNIT) / (100n * price) +
        1n
      ).toString();
      if (preset === "nearCapacity") {
        // Mature historical fixture; its earlier rights keep their original reference value.
        book.day = new Date(
          Date.parse(book.day + "T00:00:00Z") + 313 * 86400000,
        )
          .toISOString()
          .slice(0, 10);
        member.lots[0].used = (
          BigInt(member.lots[0].capacity) - UNIT
        ).toString();
        member.lots[0].settledGross = (
          (BigInt(member.lots[0].used) * UNIT) /
          (UNIT / 2n)
        ).toString();
        member.lifetimeEarned = member.lots[0].settledGross;
        member.lifetimeClaimed = member.lifetimeEarned;
        member.participationEarned = member.lifetimeEarned;
        const previousDay = new Date(
          Date.parse(book.day + "T00:00:00Z") - 86400000,
        )
          .toISOString()
          .slice(0, 10);

        const historical = cumulativeClaim(BigInt(member.lifetimeClaimed), 0n);
        book.creatorAccrued = historical.creator.toString();
        book.platformAccrued = historical.platform.toString();
        book.burned = historical.burned.toString();
        book.claimDust = historical.dustDelta.toString();
        book.claims = [
          {
            id: `DEMO-CLAIM-${s.sequence}`,
            wallet,
            gross: member.lifetimeClaimed,
            received: historical.received.toString(),
            timestamp: `${previousDay}T23:59:59.000Z`,
            status: "COMPLETED",
          },
        ];
        book.lifetimeMinted = (
          BigInt(book.lifetimeMinted) + BigInt(member.lifetimeEarned)
        ).toString();
      }
      book.members[wallet] = member;
      const asset = balanceKey(p.chainId, p.tokenContract);
      commit(
        s,
        key,
        book,
        { ...s.exactBalances, [asset]: (50000n * UNIT).toString() },
        "LIFECYCLE",
        "演示用户情景已加载",
      );
      set({ sequence: get().sequence + amounts.length });
      if (preset === "contribution") get().seedNetwork(key);
      if (preset === "claimable") get().settleDay(key);
    },
    seedNetwork: (key, branch = false) => {
      const s = get();
      const { book } = ensure(s, key);

      const wallet = s.currentUser.wallet;
      const current = book.members[wallet];
      if (!current?.bound) throw new Error("请先参与当前项目");
      const count = branch ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const address = normalizeAddress(
          `0x${(0xd000000000000000000000000000000000000000n + BigInt(s.sequence + i)).toString(16)}`,
        );
        const m = emptyMember(address, wallet);
        m.bound = true;
        const principal = (i === 0 ? 2000n : 1000n) * UNIT;
        const price = validPrices(book.prices)?.stake;
        if (!price) throw new Error("有效价格不可用");
        m.staked = ((principal * UNIT) / (2n * price) + 1n).toString();
        m.lots.push({
          id: `DEMO-NET-${s.sequence + i}`,
          wallet: address,
          projectKey: key,
          principal: principal.toString(),
          capacity: ((principal * 5n) / 2n).toString(),
          used: "0",
          settledGross: "0",
          createdAt: new Date(
            Date.parse(`${book.day}T00:00:00Z`) + book.hour * 3600000,
          ).toISOString(),
          completedAt: null,
          status: "ACTIVE",
        });
        book.members[address] = m;
      }
      commit(s, key, book, s.exactBalances, "LIFECYCLE", "演示网络已更新");
      set({ sequence: get().sequence + count });
    },
  };
}
