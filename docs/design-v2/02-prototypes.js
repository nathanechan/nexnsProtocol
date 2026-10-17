const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const product = $(".product"),
  scenario = $("#scenario"),
  input = $("#amount");
let action = "participate",
  noticeTimer;
const unit = () => (action === "participate" ? "USDT" : "FIELD");
function message(text) {
  $(".notice").textContent = text;
  $(".notice").hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => ($(".notice").hidden = true), 2500);
}
function update() {
  const isClaim = action === "claim",
    unavailable = scenario.value === "protected",
    emptyClaim = isClaim && scenario.value !== "claim";
  const parsed = Number(input.value),
    valid = input.value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const balance = action === "participate" ? 10000 : isClaim ? 16 : 50000;
  $("#quote-value").textContent = valid
    ? `${parsed.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${unit()}`
    : "—";
  $(".receive dd").textContent = valid
    ? `${(parsed * 0.85).toLocaleString("en-US", { maximumFractionDigits: 6 })} FIELD`
    : "—";
  $(".receive").style.display = isClaim ? "flex" : "none";
  $(".warning").hidden = action !== "participate";
  $(".claim-empty").style.display = emptyClaim ? "block" : "none";
  $(".form-error").textContent =
    valid && parsed > balance ? "金额超过可用余额" : "";
  $("#confirm").disabled =
    !valid || parsed > balance || unavailable || emptyClaim;
  $("#confirm").innerHTML = unavailable
    ? "价格暂不可用"
    : emptyClaim
      ? "暂无可领取"
      : `确认${{ participate: "参与", stake: "质押", claim: "领取" }[action]} <span>→</span>`;
}
function setAction(next) {
  action = next;
  $$(".action-tabs button").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.action === action)),
  );
  const text = { participate: "参与", stake: "质押", claim: "领取" }[action];
  $("#action-title").textContent = `${text} FIELD`;
  $("#action-subtitle").textContent = {
    participate: "创建新仓位",
    stake: "管理质押数量",
    claim: "可领取 16 FIELD",
  }[action];
  if (action === "claim" && scenario.value !== "claim")
    $("#action-subtitle").textContent = "可领取 0 FIELD";
  $("#amount-label").textContent =
    `${text}${action === "participate" ? "金额" : "数量"}`;
  input.setAttribute("aria-label", $("#amount-label").textContent);
  $("#asset-unit").textContent = unit();
  $(".asset i").textContent = action === "participate" ? "$" : "F";
  $("#available").textContent =
    `可用 ${action === "participate" ? "10,000 USDT" : action === "claim" ? (scenario.value === "claim" ? "16 FIELD" : "0 FIELD") : "50,000 FIELD"}`;
  $("#quote-label").textContent = {
    participate: "参与资金",
    stake: "质押数量",
    claim: "领取数量",
  }[action];
  input.value =
    action === "claim"
      ? scenario.value === "claim"
        ? "16"
        : "0"
      : action === "stake"
        ? "1200"
        : "1000";
  $(".quick").hidden = action === "claim";
  update();
}
$$("[data-design]")
  .filter((e) => e.tagName === "BUTTON")
  .forEach(
    (b) =>
      (b.onclick = () => {
        product.dataset.design = b.dataset.design;
        $$(".segments button").forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b)),
        );
        const url = new URL(location);
        url.searchParams.set("design", b.dataset.design);
        history.replaceState(null, "", url);
      }),
  );
scenario.onchange = () => {
  product.dataset.scenario = scenario.value;
  $(".headline-price>div").innerHTML =
    scenario.value === "protected"
      ? "估值暂不可用"
      : '$1.2500 <span class="change">↗ 0.94%</span>';
  $(".metrics>div:nth-child(2) dd").textContent =
    scenario.value === "protected" ? "—" : "$119.41K";
  $(".chart-value").innerHTML =
    scenario.value === "empty"
      ? "— <span>FIELD</span>"
      : "95,530 <span>FIELD</span><small>+4.20%</small>";
  setAction(scenario.value === "claim" ? "claim" : "participate");
};
$$(".action-tabs button").forEach(
  (b) => (b.onclick = () => setAction(b.dataset.action)),
);
input.oninput = update;
$$(".quick button").forEach(
  (b) =>
    (b.onclick = () => {
      input.value = b.dataset.amount;
      update();
    }),
);
$("#max").onclick = () => {
  input.value =
    action === "participate"
      ? "10000"
      : action === "claim"
        ? scenario.value === "claim"
          ? "16"
          : "0"
        : "50000";
  update();
};
$("#confirm").onclick = () => {
  if ($("#confirm").disabled) return;
  $("#dialog-title").textContent =
    `确认${{ participate: "参与", stake: "质押", claim: "领取" }[action]}`;
  $("#dialog-amount").textContent =
    `${Number(input.value).toLocaleString("en-US")} ${unit()}`;
  $("#dialog-note").textContent =
    action === "participate"
      ? "参与资金提交后不可作为本金赎回。"
      : action === "claim"
        ? `预计到账 ${$(".receive dd").textContent}`
        : "核对质押数量与代币身份。";
  $("#confirmation").showModal();
};
$(".mobile-chart-toggle").onclick = () => {
  const chart = $(".chart-section");
  chart.hidden = !chart.hidden;
  $(".mobile-chart-toggle").innerHTML = chart.hidden
    ? "展开趋势 <span>⌄</span>"
    : "收起趋势 <span>⌃</span>";
};
$(".contract").onclick = async () => {
  try {
    await navigator.clipboard.writeText(
      "0x000000000000000000000000000000000003fc24",
    );
    message("合约地址已复制");
  } catch {
    message("合约：0x000000000000000000000000000000000003fc24");
  }
};
$$(".ranges button").forEach(
  (b) =>
    (b.onclick = () =>
      message("此方案展示固定 7D 示例；真实时间范围在下一阶段接入。")),
);
$$(".record-tabs button").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.textContent === "我的仓位") return;
      message("此阶段评审主布局，详情内容在旗舰实现阶段接入。");
    }),
);
$$(
  ".nav button,.breadcrumbs button,.transparency,.mobile-nav button,.brand",
).forEach(
  (b) =>
    (b.onclick = (e) => {
      e.preventDefault();
      message("这是独立设计预览，正式页面与资产保持不变。");
    }),
);
$(".search").onclick = () => message("搜索沿用现有产品，本页仅展示入口。");
const initial = new URLSearchParams(location.search).get("design");
if (initial === "b") $(".segments button[data-design=b]").click();
const state = new URLSearchParams(location.search).get("state");
if (["claim", "empty", "protected"].includes(state)) {
  scenario.value = state;
  scenario.onchange();
} else setAction("participate");
