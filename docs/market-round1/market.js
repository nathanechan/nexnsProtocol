const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const icons = {
  LAN: 0,
  BRDG: 14,
  FLOW: 9,
  RIVER: 8,
  BLUE: 6,
  GLOW: 3,
  SHORE: 10,
  COVE: 11,
  GRAIN: 7,
  DAWN: 5,
  ISLE: 15,
  TIDE: 2,
  ORIG: 12,
  FIELD: 1,
  WAVE: 4,
};
const symbols = Object.keys(icons);
const snapshots = [
  [0.04117435, 4.93],
  [0.048881575, 8.36],
  [0.058581195, 12.31],
  [0.068308528, 15.95],
  [0.08711381, 22.32],
  [0.105597156, 27.94],
  [0.130004819, 34.65],
  [0.162013081, 42.56],
  [0.188102683, 48.45],
  [0.230952814, 57.28],
  [0.283941033, 67.14],
  [0.342780345, 77.06],
  [0.399131311, 85.79],
  [0.436617345, 91.26],
  [0.477186596, 96.92],
];
const changes = [
  4.31, -2.36, 1.82, -5.43, 3.11, 18.62, 6.28, -1.37, 2.71, -7.84, 12.36, 0.74,
  -3.62, 8.15, -0.61,
];
const volumes = [
  7834, 18593, 42170, 12841, 31408, 79162, 24572, 28963, 51824, 14852, 129420,
  61810, 98600, 117830, 53170,
];
const hours = [
  0.15, 0.28, 1.4, 2.1, 3.2, 1.1, 5.3, 2.5, 6.4, 1.8, 4.2, 7.4, 3.6, 6.9, 2.8,
];
const addr = (n) => "0x" + n.toString(16).padStart(40, "0");
const stages = {
  launch: symbols.map((symbol, j) => ({
    symbol,
    j,
    icon: icons[symbol],
    contract: addr(0x9a00 + j * 7919),
    id: `NX-${String(j + 6).padStart(4, "0")}`,
    price: snapshots[j][0],
    progress: snapshots[j][1],
    change: changes[j] * 0.7,
    volume: volumes[j] * 0.36,
    addresses: [
      93, 127, 196, 143, 268, 328, 246, 305, 358, 317, 392, 421, 539, 682, 754,
    ][j],
    age: hours[j],
    marketCap: 0,
    stage: "launch",
  })),
  live: symbols.map((symbol, j) => ({
    symbol,
    j,
    icon: icons[symbol],
    contract: addr(0x9a00 + (j + 15) * 7919),
    id: `NX-${String(j + 21).padStart(4, "0")}`,
    price: 0.3187 + j * 0.0713,
    progress: 100,
    change: changes[j],
    volume: volumes[j],
    addresses: [
      763, 482, 2174, 1293, 1074, 3842, 1578, 2917, 2863, 931, 5217, 3284, 4197,
      6312, 2831,
    ][j],
    age: hours[j] * 2,
    marketCap: 318700 + j * 71300,
    stage: "live",
  })),
};
stages.live.push({
  symbol: "NEXNS",
  j: 15,
  icon: -1,
  contract: "0x" + "f".repeat(40),
  id: "NX-PLATFORM",
  price: 0.4826,
  progress: 100,
  change: -1.24,
  volume: 73420,
  addresses: 2148,
  age: 24 * 12,
  marketCap: 482600,
  stage: "live",
});
const hotOrder = {
  launch: [13, 14, 12, 10, 11, 9, 5, 8, 7, 6, 4, 3, 2, 1, 0],
  live: [10, 5, 15, 13, 12, 14, 7, 8, 9, 6, 4, 3, 2, 1, 0, 11],
};
const dictionary = {
  zh: {
    assets: "资产",
    create: "＋ 创建",
    wallet: "钱包",
    latest: "最新成交",
    hot: "热门",
    new: "最新",
    watch: "自选",
    all: "全部",
    market: "市场",
    token: "代币",
    trend: "走势",
    price: "价格",
    change: "24h 涨跌",
    volume: "24h 成交量",
    addresses: "地址",
    noresults: "暂无匹配的代币",
    trysearch: "尝试其他简称或合约地址",
    reset: "重置筛选",
    currency: "计价",
    backtop: "返回顶部 ↑",
    launch: "发行",
    live: "运行",
    walletview: "在资产页查看余额、仓位与领取记录。",
    viewassets: "查看资产",
    metric: "市值",
    progress: "发行进度",
    search: "搜索代币或合约",
    near: "接近完成",
    active: "成交活跃",
    movement: "价格异动",
    fresh: "新发行",
    newlive: "新进入运行",
    buy: "买入",
    sell: "卖出",
    ago: "前",
    min: "分钟",
    hour: "小时",
    day: "天",
    copied: "合约地址已复制",
    copyfail: "请手动复制合约地址",
    project: "查看项目",
    contract: "合约地址",
    network: "网络",
    id: "项目 ID",
    save: "加入自选",
    saved: "已加入自选",
    remove: "已移出自选",
    complete: "已发行",
    hour24: "24h 成交量",
    platform: "平台代币",
  },
  en: {
    assets: "Portfolio",
    create: "+ Create",
    wallet: "Wallet",
    latest: "Latest trades",
    hot: "Trending",
    new: "New",
    watch: "Watchlist",
    all: "All",
    market: "Market",
    token: "Token",
    trend: "Trend",
    price: "Price",
    change: "24h change",
    volume: "24h volume",
    addresses: "Addresses",
    noresults: "No matching tokens",
    trysearch: "Try a different symbol or contract",
    reset: "Reset filters",
    currency: "Quote",
    backtop: "Back to top ↑",
    launch: "Launch",
    live: "Live",
    walletview: "View balances, positions and claim history in Portfolio.",
    viewassets: "View portfolio",
    metric: "Market cap",
    progress: "Progress",
    search: "Search tokens or contracts",
    near: "Near completion",
    active: "Actively traded",
    movement: "Price movement",
    fresh: "Just launched",
    newlive: "Recently live",
    buy: "Buy",
    sell: "Sell",
    ago: "ago",
    min: "m",
    hour: "h",
    day: "d",
    copied: "Contract copied",
    copyfail: "Copy the contract manually",
    project: "View project",
    contract: "Contract",
    network: "Network",
    id: "Project ID",
    save: "Add to watchlist",
    saved: "Added to watchlist",
    remove: "Removed from watchlist",
    complete: "Issued",
    hour24: "24h volume",
    platform: "Platform token",
  },
};
let stage = location.hash === "#launch" ? "launch" : "live",
  filter = "hot",
  sort = null,
  direction = -1,
  locale = localStorage.getItem("nexns-r1-locale") || "zh",
  selected = null;
if (!dictionary[locale]) locale = "zh";
let favorites = new Set();
try {
  favorites = new Set(
    JSON.parse(localStorage.getItem("nexns-r1-watchlist") || "[]"),
  );
} catch {}
const t = (k) => dictionary[locale][k] || k;
const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const compact = (n) =>
  n >= 1e6
    ? (n / 1e6).toFixed(2) + "M"
    : n >= 1e3
      ? (n / 1e3).toFixed(2) + "K"
      : Math.round(n).toLocaleString("en-US");
const money = (n) => "$" + compact(n);
const price = (n) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: n < 10 ? 4 : 2,
    maximumFractionDigits: n < 10 ? 4 : 2,
  });
const signed = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
const age = (p) =>
  p.age < 1
    ? `${Math.round(p.age * 60)}${locale === "zh" ? " 分钟前" : "m ago"}`
    : p.age < 24
      ? `${Math.round(p.age)}${locale === "zh" ? " 小时前" : "h ago"}`
      : `${Math.round(p.age / 24)}${locale === "zh" ? " 天前" : "d ago"}`;
const avatar = (p, extra = "") =>
  p.icon < 0
    ? `<span class="avatar platform ${extra}" role="img" aria-label="NEXNS"><svg viewBox="230 145 880 980"><image href="assets/nexns-logo.png" width="1306" height="1205"/></svg></span>`
    : `<span class="avatar ${extra}" role="img" aria-label="${p.symbol}" style="background-position:${((p.icon % 4) * 100) / 3}% ${(Math.floor(p.icon / 4) * 100) / 3}%"></span>`;
function spark(p) {
  let seed = 193 + p.j * 7919 + (p.stage === "live" ? 77 : 0);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let value = 100;
  const a = Array.from({ length: 45 }, (_, i) => {
    value += (random() - 0.5) * (p.j % 3 === 0 ? 2.7 : 1.6) + p.change / 44;
    return value;
  });
  const baseline = a[0],
    drift = a.at(-1) - baseline - p.change;
  for (let i = 0; i < a.length; i++) a[i] -= (drift * i) / (a.length - 1);
  const min = Math.min(...a) - 0.6,
    max = Math.max(...a) + 0.6;
  const pts = a
    .map(
      (v, i) =>
        `${((i / 44) * 116).toFixed(1)},${(29 - ((v - min) / (max - min)) * 26).toFixed(1)}`,
    )
    .join(" ");
  return `<svg class="spark ${p.change >= 0 ? "up" : "down"}" viewBox="0 0 116 32" aria-label="${p.symbol} ${t("trend")}"><polygon points="0,32 ${pts} 116,32"/><polyline points="${pts}"/></svg>`;
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), 2200);
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#theme").innerHTML = icon(theme === "dark" ? "sun" : "moon");
  $("#theme").setAttribute(
    "aria-label",
    locale === "zh" ? "切换明暗主题" : "Toggle theme",
  );
  localStorage.setItem("nexns-r1-theme", theme);
}
setTheme(localStorage.getItem("nexns-r1-theme") || "dark");
function watch(p) {
  if (favorites.has(p.contract)) favorites.delete(p.contract);
  else favorites.add(p.contract);
  localStorage.setItem("nexns-r1-watchlist", JSON.stringify([...favorites]));
  renderRows();
  toast(t(favorites.has(p.contract) ? "saved" : "remove"));
  if ($("#project-dialog").open) renderDetail();
}
function renderRows() {
  let rows = [...stages[stage]];
  const query = $("#search").value.trim().toLowerCase();
  if (query)
    rows = rows.filter(
      (p) =>
        p.contract.includes(query) ||
        p.symbol.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query),
    );
  if (filter === "watch") rows = rows.filter((p) => favorites.has(p.contract));
  if (sort)
    rows.sort(
      (a, b) =>
        ((sort === "metric"
          ? stage === "launch"
            ? a.progress
            : a.marketCap
          : a[sort]) -
          (sort === "metric"
            ? stage === "launch"
              ? b.progress
              : b.marketCap
            : b[sort])) *
        direction,
    );
  else if (filter === "new") rows.sort((a, b) => a.age - b.age);
  else
    rows.sort(
      (a, b) => hotOrder[stage].indexOf(a.j) - hotOrder[stage].indexOf(b.j),
    );
  $("#rows").innerHTML = rows
    .map(
      (p, index) =>
        `<div class="market-row" role="listitem" data-contract="${p.contract}"><span class="rank">${index + 1}</span><a href="#${stage}" class="row-identity" data-open="${p.contract}" aria-label="${p.symbol} ${t("project")}">${avatar(p)}<span><strong>${p.symbol}</strong><span class="token-sub">${p.age < 1 ? '<i class="new-dot"></i>' : ""}${age(p)} ${p.icon < 0 ? `<span class="token-tag">${t("platform")}</span>` : ""}</span></span></a><span class="row-chart">${spark(p)}</span><span class="number price-cell">${price(p.price)}</span><span class="change-cell"><span class="change-badge ${p.change >= 0 ? "up" : "down"}">${signed(p.change)}</span></span><span class="number volume">${money(p.volume)}</span><span class="metric-value ${p.progress >= 90 && stage === "launch" ? "progress-near" : ""}"><span class="number">${stage === "launch" ? p.progress.toFixed(2) + "%" : money(p.marketCap)}</span>${stage === "launch" ? `<span class="progress-track"><i style="width:${p.progress}%"></i></span>` : ""}</span><span class="number addresses">${compact(p.addresses)}</span><button class="star" data-watch="${p.contract}" aria-label="${t("save")} ${p.symbol}" aria-pressed="${favorites.has(p.contract)}">${icon("star")}</button></div>`,
    )
    .join("");
  $("#empty").hidden = rows.length > 0;
  $("#watch-count").textContent = favorites.size || "";
  $("#clear-search").hidden = !query;
  $$("[data-sort]").forEach((b) => {
    b.classList.toggle("selected", sort === b.dataset.sort);
    b.querySelector("small").textContent =
      sort === b.dataset.sort ? (direction < 0 ? "↓" : "↑") : "↕";
  });
}
function focusCard(p, key, value, sub) {
  return `<button class="focus-card" data-open="${p.contract}"><span class="focus-kicker">${icon(key === "movement" ? "arrow" : "fire")}${t(key)}</span>${spark(p)}<span class="focus-main">${avatar(p)}<span><strong>${p.symbol}</strong><small>${age(p)}</small></span><span class="focus-number"><b class="${key === "movement" ? (p.change >= 0 ? "up" : "down") : key === "near" ? "up" : ""}">${value}</b><small>${sub}</small></span></span></button>`;
}
function renderTop() {
  const p = stages[stage];
  $("#spotlight").innerHTML =
    stage === "launch"
      ? [
          focusCard(p[14], "near", p[14].progress + "%", t("progress")),
          focusCard(p[13], "active", money(p[13].volume), t("hour24")),
          focusCard(p[0], "fresh", price(p[0].price), "USDT"),
        ].join("")
      : [
          focusCard(p[10], "active", money(p[10].volume), t("hour24")),
          focusCard(p[5], "movement", signed(p[5].change), "24h"),
          focusCard(p[1], "newlive", price(p[1].price), "USDT"),
        ].join("");
  const items =
    stage === "launch"
      ? [
          [p[13], 248, "buy"],
          [p[14], 560, "buy"],
          [p[12], 120, "sell"],
          [p[10], 385, "buy"],
        ]
      : [
          [p[5], 460, "buy"],
          [p[10], 1280, "buy"],
          [p[13], 312, "sell"],
          [p[12], 715, "buy"],
        ];
  $("#tape-items").innerHTML = items
    .map(
      ([project, amount, side]) =>
        `<button data-open="${project.contract}">${avatar(project, "mini-avatar")}<b>${project.symbol}</b><span class="${side === "buy" ? "up" : "down"}">${t(side)} ${amount.toLocaleString("en-US")} USDT</span><small>· ${locale === "zh" ? "刚刚" : "just now"}</small></button>`,
    )
    .join("");
}
function translate() {
  $$("[data-i18n]").forEach((e) => (e.textContent = t(e.dataset.i18n)));
  $$("[data-stage]").forEach((e) => {
    e.classList.toggle("active", e.dataset.stage === stage);
    e.setAttribute(
      "aria-current",
      e.dataset.stage === stage ? "page" : "false",
    );
    if (e.closest(".nav")) e.textContent = t(e.dataset.stage);
  });
  $("#metric-label").textContent = t(
    stage === "launch" ? "progress" : "metric",
  );
  $("#search").placeholder = t("search");
  $("#search").setAttribute("aria-label", t("search"));
  $("#language").textContent = locale === "zh" ? "EN" : "中文";
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.title = `NEXNS · ${t(stage)}`;
  renderTop();
  renderRows();
  setTheme(document.documentElement.dataset.theme);
}
function renderDetail() {
  const p = selected;
  if (!p) return;
  $("#project-details").innerHTML =
    `<div class="detail-heading">${avatar(p)}<div><h2>${p.symbol}</h2><p>BNB Chain · ${t(p.stage)}</p></div><button class="star" style="margin-left:auto" data-watch="${p.contract}" aria-pressed="${favorites.has(p.contract)}" aria-label="${t("save")}">${icon("star")}</button></div><div class="detail-numbers"><strong>${price(p.price)}</strong><span class="change-badge ${p.change >= 0 ? "up" : "down"}">${signed(p.change)}</span></div><div class="detail-chart">${spark(p)}</div><dl><div><dt>${t("hour24")}</dt><dd>${money(p.volume)}</dd></div><div><dt>${t(p.stage === "launch" ? "progress" : "metric")}</dt><dd>${p.stage === "launch" ? p.progress + "%" : money(p.marketCap)}</dd></div><div><dt>${t("contract")}</dt><dd title="${p.contract}">${p.contract.slice(0, 8)}…${p.contract.slice(-6)}<button id="copy-contract" aria-label="${t("contract")}">${icon("copy")}</button></dd></div><div><dt>${t("id")}</dt><dd>${p.id}</dd></div></dl><a class="primary-link" href="http://localhost:3000/economy/56/${p.contract}" target="_blank" rel="noopener">${t("project")} ↗</a>`;
  $("#copy-contract").onclick = async () => {
    try {
      await navigator.clipboard.writeText(p.contract);
      toast(t("copied"));
    } catch {
      toast(t("copyfail"));
    }
  };
}
function openProject(contract) {
  selected = stages[stage].find((p) => p.contract === contract);
  if (!selected) return;
  renderDetail();
  $("#project-dialog").showModal();
}
document.addEventListener("click", (event) => {
  const w = event.target.closest("[data-watch]");
  if (w) {
    event.preventDefault();
    const p = stages[stage].find((p) => p.contract === w.dataset.watch);
    if (p) watch(p);
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) {
    event.preventDefault();
    openProject(open.dataset.open);
    return;
  }
  const row = event.target.closest(".market-row");
  if (row) openProject(row.dataset.contract);
});
$$("[data-filter]").forEach(
  (button) =>
    (button.onclick = () => {
      filter = button.dataset.filter;
      sort = null;
      $$("[data-filter]").forEach((b) =>
        b.setAttribute("aria-selected", String(b === button)),
      );
      renderRows();
    }),
);
$$("[data-sort]").forEach(
  (button) =>
    (button.onclick = () => {
      direction = sort === button.dataset.sort ? -direction : -1;
      sort = button.dataset.sort;
      renderRows();
    }),
);
$("#search").oninput = renderRows;
$("#clear-search").onclick = () => {
  $("#search").value = "";
  renderRows();
  $("#search").focus();
};
$("#reset").onclick = () => {
  $("#search").value = "";
  filter = "hot";
  sort = null;
  $$("[data-filter]").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.filter === "hot")),
  );
  renderRows();
};
$("#search-button").onclick = () => $("#search").focus();
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("#search").focus();
  }
  if (
    e.target.matches("[data-filter]") &&
    ["ArrowLeft", "ArrowRight"].includes(e.key)
  ) {
    e.preventDefault();
    const buttons = $$("[data-filter]"),
      index = buttons.indexOf(e.target),
      next =
        buttons[
          (index + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) %
            buttons.length
        ];
    next.click();
    next.focus();
  }
});
$("#theme").onclick = () =>
  setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
$("#language").onclick = () => {
  locale = locale === "zh" ? "en" : "zh";
  localStorage.setItem("nexns-r1-locale", locale);
  translate();
};
$("#wallet").onclick = () => $("#wallet-dialog").showModal();
$$(".dialog-close").forEach(
  (b) => (b.onclick = () => b.closest("dialog").close()),
);
$$("dialog").forEach(
  (d) =>
    (d.onclick = (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          d.close();
      }
    }),
);
$("#back-top").onclick = () =>
  window.scrollTo({
    top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
window.addEventListener("hashchange", () => {
  stage = location.hash === "#launch" ? "launch" : "live";
  sort = null;
  $("#search").value = "";
  translate();
});
translate();
