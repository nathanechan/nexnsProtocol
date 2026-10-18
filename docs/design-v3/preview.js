const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const projects = [
  ["FIELD", "Mireva", 0.4366, 8.42, 91.26, 437, "#655cce"],
  ["ORIG", "Teryn", 0.3991, 5.18, 85.79, 395, "#387d91"],
  ["TIDE", "Avenor", 0.3428, -2.34, 77.06, 392, "#3f69a8"],
  ["ISLE", "Sylune", 0.2839, 12.67, 67.14, 350, "#827253"],
  ["DAWN", "Kovra", 0.231, 3.92, 57.28, 328, "#995b73"],
  ["GRAIN", "Evrin", 0.1981, -1.26, 48.44, 305, "#5e8071"],
  ["COVE", "Lumaris", 0.163, 6.83, 42.56, 263, "#54818d"],
  ["SHORE", "Rovelle", 0.13, 2.17, 34.65, 241, "#736a9b"],
].map(([symbol, name, price, change, progress, users, color], index) => ({
  symbol,
  name,
  price,
  change,
  progress,
  users,
  color,
  contract: "0x" + (0x22c23 + index * 7919).toString(16).padStart(40, "0"),
  index,
}));
let stage = "curve",
  sort = "hot",
  selected = projects[0],
  action = "buy",
  chart = "price",
  range = "24H";
const favorites = new Set();
const money = (n) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
const price = (n) => "$" + n.toFixed(4);
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").style.display = "none"), 2600);
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#theme").textContent = theme === "dark" ? "浅色模式 ◐" : "深色模式 ◑";
  try {
    localStorage.setItem("nexns-v3-preview-theme", theme);
  } catch {}
}
try {
  setTheme(
    localStorage.getItem("nexns-v3-preview-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
} catch {
  setTheme("dark");
}
$("#theme").onclick = () =>
  setTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
function showPage(page) {
  $("#market").hidden = page !== "market";
  $("#terminal").hidden = page !== "terminal";
  $(".market-pulse").hidden = page !== "market";
  $$(".nav [data-page]").forEach((b) =>
    b.classList.toggle("selected", b.dataset.page === page),
  );
  history.replaceState(null, "", "#" + page);
  window.scrollTo(0, 0);
}
$$("[data-page]").forEach((b) => (b.onclick = () => showPage(b.dataset.page)));
$(".brand").onclick = (e) => {
  e.preventDefault();
  showPage("market");
};
function spark(p) {
  const points = Array.from(
    { length: 20 },
    (_, i) =>
      `${i * 6},${p.change > 0 ? 29 - i * 0.9 - Math.sin(i * 1.9 + p.index) * 4 : 7 + i * 0.8 + Math.sin(i * 1.4) * 4}`,
  ).join(" ");
  return `<svg class="spark" viewBox="0 0 116 36" aria-label="${p.symbol} 价格趋势"><polygon points="0,36 ${points} 114,36" fill="var(--${p.change > 0 ? "positive" : "negative"})" opacity=".09"/><polyline points="${points}" fill="none" stroke="var(--${p.change > 0 ? "positive" : "negative"})" stroke-width="1.8"/></svg>`;
}
function coinArt(p) {
  const artwork = [
    '<path d="M13 33 24 11 35 33Z"/><path d="m18 27 6-8 6 8M17 33h14"/>',
    '<circle cx="24" cy="24" r="12"/><ellipse cx="24" cy="24" rx="5" ry="16" transform="rotate(40 24 24)"/>',
    '<path d="M10 26c6-15 12 15 18 0s10-5 10-5M10 17c6-15 12 15 18 0s10-5 10-5M10 35c6-15 12 15 18 0s10-5 10-5"/>',
    '<path d="m12 33 6-15 6 6 8-13 5 22ZM16 37h20"/>',
    '<circle cx="24" cy="24" r="8"/><path d="M24 7v5m0 24v5M7 24h5m24 0h5M12 12l4 4m16 16 4 4M12 36l4-4m16-16 4-4"/>',
    '<path d="M24 39V12m0 11c-11 0-12-9-12-9s12-1 12 9Zm0 10c11 0 12-9 12-9s-12-1-12 9Z"/>',
    '<path d="M11 30c5-10 9 10 14 0s9 10 13 0M11 22c5-10 9 10 14 0s9 10 13 0M14 14h20"/>',
    '<path d="m10 29 14-16 14 16M15 33h18M20 38h8"/>',
  ];
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${artwork[p.index]}</g></svg>`;
}
function renderRows() {
  const q = $("#search").value.trim().toLowerCase();
  let list = projects.filter((p) =>
    [p.symbol, p.name, p.contract].some((v) => v.toLowerCase().includes(q)),
  );
  if (sort === "favorite") list = list.filter((p) => favorites.has(p.contract));
  if (sort === "new") list = [...list].reverse();
  if (sort === "near") list = [...list].sort((a, b) => b.progress - a.progress);
  $("#rows").innerHTML = list
    .map(
      (p, i) =>
        `<div class="market-row market-grid ${stage === "curve" && p.progress >= 90 ? "near-completion" : ""}"><a href="#terminal" class="row-link" data-project="${p.index}"><span class="rank">${i + 1}</span><span class="coin c${p.index % 3}" style="--coin:${p.color}">${coinArt(p)}</span><span class="row-name"><strong>${p.symbol}</strong>${stage === "curve" && p.progress >= 90 ? '<small class="milestone">临近完成 ↗</small>' : ""}</span></a>${spark(p)}<span class="numeric price">${price(p.price)}</span><span class="change ${p.change < 0 ? "down" : ""}"><span>${p.change > 0 ? "↗ +" : "↘ "}${p.change.toFixed(2)}%</span></span><span class="row-progress ${p.progress > 85 ? "near" : ""}">${stage === "curve" ? `${p.progress.toFixed(2)}%<span class="progress"><i style="width:${p.progress}%"></i></span>` : `${money(p.users * 183)} USDT`}</span><span class="numeric users">${p.users}</span><button class="favorite" aria-label="自选 ${p.symbol}" aria-pressed="${favorites.has(p.contract)}" data-fav="${p.contract}">${favorites.has(p.contract) ? "★" : "☆"}</button></div>`,
    )
    .join("");
  $("#empty").hidden = list.length > 0;

  $("#fav-count").textContent = favorites.size;
  $("#stage-column").textContent = stage === "curve" ? "发行进度" : "质押价值";
  $$("[data-project]").forEach(
    (a) =>
      (a.onclick = (e) => {
        e.preventDefault();
        if (stage === "operating") {
          toast("运行终端暂不可用。");
          return;
        }
        selected = projects[Number(a.dataset.project)];
        renderTerminal();
        showPage("terminal");
      }),
  );
  $$("[data-fav]").forEach(
    (b) =>
      (b.onclick = () => {
        if (favorites.has(b.dataset.fav)) favorites.delete(b.dataset.fav);
        else favorites.add(b.dataset.fav);
        renderRows();
      }),
  );
}
$$("[data-stage]").forEach(
  (b) =>
    (b.onclick = () => {
      stage = b.dataset.stage;
      $$("[data-stage]").forEach((v) => v.classList.toggle("active", v === b));
      $('[data-sort="near"]').hidden = stage !== "curve";
      if (sort === "near") sort = "hot";
      $$("[data-sort]").forEach((v) =>
        v.classList.toggle("active", v.dataset.sort === sort),
      );
      renderRows();
    }),
);
$$("[data-sort]").forEach(
  (b) =>
    (b.onclick = () => {
      sort = b.dataset.sort;
      $$("[data-sort]").forEach((v) => v.classList.toggle("active", v === b));
      renderRows();
    }),
);
$("#search").oninput = renderRows;
function renderChart() {
  let y = 74;
  const points = Array.from({ length: 39 }, (_, i) => {
    const x = (i * 740) / 38;
    y =
      chart === "curve"
        ? 252 - 178 * (i / 38) ** 1.7
        : 225 -
          i * 3.7 -
          Math.sin(i * 0.68 + (range === "1H" ? 1 : range === "6H" ? 2 : 0)) *
            10 -
          (i > 20 ? 15 : 0);
    return [x, y];
  });
  const d = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  $("#line-path").setAttribute("d", d);
  $("#area-path").setAttribute("d", d + " L740,280 L0,280 Z");
  $("#endpoint").setAttribute("cy", points.at(-1)[1]);
  $("#chart").setAttribute(
    "aria-label",
    chart === "curve" ? "理论发行曲线，横轴为储备 USDT" : "价格时间走势",
  );
  $("#chart-caption").textContent =
    chart === "curve" ? "储备与价格" : `${range} 价格走势`;
  $("#time-axis").innerHTML = (
    chart === "curve"
      ? ["0", "25K", "50K", "75K", "100K USDT"]
      : ["起点", "", "", "", "现在"]
  )
    .map((v) => `<span>${v}</span>`)
    .join("");
  $(".ranges").hidden = chart === "curve";
}
function updateEstimate() {
  const raw = $("#amount").value.trim();
  const value = Number(raw);
  const valid =
    /^(\d+(\.\d*)?|\.\d+)$/.test(raw) && Number.isFinite(value) && value > 0;
  const balance = action === "buy" ? 5000 : 1280;
  $("#submit").disabled = !valid || value > balance;
  $("#receive").textContent = valid
    ? `${money(action === "buy" ? value / selected.price : value * selected.price)} ${action === "buy" ? selected.symbol : "USDT"}`
    : `— ${action === "buy" ? selected.symbol : "USDT"}`;
  $("#trade-message").textContent =
    raw && !valid
      ? "请输入有效金额。"
      : value > balance
        ? "可用余额不足。"
        : valid
          ? "参考估算，实际收到以最终报价为准。"
          : "输入金额，查看预计收到。";
}
function setAction(next) {
  action = next;
  $$("[data-action]").forEach((b) =>
    b.classList.toggle("active", b.dataset.action === action),
  );
  $("#amount-label").textContent = action === "buy" ? "支付金额" : "卖出数量";
  $("#amount-unit").textContent = action === "buy" ? "USDT" : selected.symbol;
  $("#balance").textContent =
    action === "buy" ? "5,000.00 USDT" : `1,280.00 ${selected.symbol}`;
  $("#submit").textContent = action === "buy" ? "买入" : "卖出";
  $("#amount").value = "";
  updateEstimate();
}
function detail(type) {
  $$("[data-detail]").forEach((b) =>
    b.classList.toggle("active", b.dataset.detail === type),
  );
  $("#detail-content").innerHTML =
    type === "activity"
      ? ["2 分钟前", "5 分钟前", "8 分钟前"]
          .map(
            (time, i) =>
              `<div class="activity-row"><span class="${i === 1 ? "" : "up"}">${i === 1 ? "卖出" : "买入"}</span><span>${[125, 48, 260][i]}.00 USDT</span><span>${time}</span></div>`,
          )
          .join("")
      : type === "position"
        ? '<p class="detail-copy">暂无持仓记录。</p>'
        : `<p class="detail-copy">${selected.symbol}<br>BNB Chain<br>${selected.contract}</p>`;
}
function renderTerminal() {
  $("#symbol").textContent = selected.symbol;
  $("#price").textContent = price(selected.price);
  $(".quote>.up").innerHTML =
    `${selected.change > 0 ? "+" : ""}${selected.change.toFixed(2)}% <small>24H</small>`;
  $(".quote>.up").style.color =
    `var(--${selected.change > 0 ? "positive" : "negative"})`;
  $("#terminal-avatar").innerHTML = coinArt(selected);
  $("#terminal-avatar").style.background = selected.color;
  $("#contract").textContent =
    `BNB · ${selected.contract.slice(0, 6)}…${selected.contract.slice(-4)} ⧉`;
  $("#chart-value").textContent = selected.price.toFixed(4);
  $("#funding-value").textContent = selected.progress.toFixed(2) + "%";
  $(".funding .progress i").style.width = selected.progress + "%";
  $("#funding-caption").innerHTML =
    `距离发行完成 <b>${money((100 - selected.progress) * 1000)} USDT</b><span>${money(selected.progress * 1000)} / 100,000 USDT</span>`;
  $("#personal-balance").textContent = `1,280 ${selected.symbol}`;
  setAction("buy");
  renderChart();
  detail("activity");
}
$$("[data-action]").forEach(
  (b) => (b.onclick = () => setAction(b.dataset.action)),
);
$$("[data-chart]").forEach(
  (b) =>
    (b.onclick = () => {
      chart = b.dataset.chart;
      $$("[data-chart]").forEach((v) => v.classList.toggle("active", v === b));
      renderChart();
    }),
);
$$("[data-range]").forEach(
  (b) =>
    (b.onclick = () => {
      range = b.dataset.range;
      $$("[data-range]").forEach((v) => v.classList.toggle("active", v === b));
      renderChart();
    }),
);
$$("[data-amount]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#amount").value = b.dataset.amount;
      updateEstimate();
    }),
);
$$("[data-detail]").forEach(
  (b) => (b.onclick = () => detail(b.dataset.detail)),
);
$("#max").onclick = () => {
  $("#amount").value = action === "buy" ? "5000" : "1280";
  updateEstimate();
};
$("#amount").oninput = updateEstimate;
$("#submit").onclick = () => {
  $("#confirm-result").textContent =
    `${$("#amount").value} ${$("#amount-unit").textContent} → ${$("#receive").textContent}`;
  $("#confirm .sub").textContent = `BNB Chain · ${selected.contract}`;
  $("#confirm").showModal();
};
$("#contract").onclick = async () => {
  try {
    await navigator.clipboard.writeText(selected.contract);
    toast("合约地址已复制");
  } catch {
    toast("合约地址：" + selected.contract);
  }
};
$("#wallet").onclick = () => toast("钱包连接暂不可用。");
$$("[data-pulse]").forEach(
  (b) =>
    (b.onclick = () => {
      selected = projects[Number(b.dataset.pulse)];
      renderTerminal();
      showPage("terminal");
    }),
);
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    showPage("market");
    $("#search").focus();
  }
});
renderRows();
renderTerminal();
showPage(location.hash === "#terminal" ? "terminal" : "market");
