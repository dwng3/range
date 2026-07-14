(function () {
  "use strict";

  const DATA_PATH = "./data/mtt_first_in_ranges_v0.1.json";
  const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const DISPLAY_POSITIONS = ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
  const ACTION_ORDER = ["SHOVE", "RAISE", "CALL", "THREE_BET", "THREE_BET_SHOVE", "FOUR_BET"];
  const ACTION_LABELS = {
    RAISE: "레이즈",
    SHOVE: "올인",
    CALL: "콜",
    THREE_BET: "3벳",
    THREE_BET_SHOVE: "3벳 올인",
    FOUR_BET: "4벳",
    FOLD: "폴드"
  };
  const SCENARIO_LABELS = {
    FIRST_IN: "앞에서 모두 폴드",
    VS_OPEN: "오픈 상대",
    VS_SHOVE: "올인 상대"
  };

  const state = {
    data: null,
    stackKey: "",
    displayPosition: "",
    rangePosition: "",
    selectedHand: "",
    handActions: new Map()
  };

  const els = {
    stackButtons: document.getElementById("stack-buttons"),
    positionButtons: document.getElementById("position-buttons"),
    selectedPosition: document.getElementById("selected-position"),
    rangePosition: document.getElementById("range-position"),
    scenarioLabel: document.getElementById("scenario-label"),
    message: document.getElementById("message"),
    handGrid: document.getElementById("hand-grid"),
    legend: document.getElementById("legend"),
    summaryStack: document.getElementById("summary-stack"),
    summaryPosition: document.getElementById("summary-position"),
    summaryScenario: document.getElementById("summary-scenario"),
    actionCounts: document.getElementById("action-counts"),
    participation: document.getElementById("participation"),
    selectedHandDetail: document.getElementById("selected-hand-detail")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!hasRequiredElements()) {
      console.error("필수 DOM 요소를 찾을 수 없습니다.");
      return;
    }

    renderEmptyGrid();

    try {
      const response = await fetch(DATA_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      validateDataShape(data);
      state.data = data;
      setupInitialSelection();
      renderControls();
      renderAll();
    } catch (error) {
      console.error("Range data load failed:", error);
      showMessage("핸드레인지 데이터 파일을 불러오지 못했습니다.<br>data/mtt_first_in_ranges_v0.1.json 파일을 확인해주세요.");
      renderControlsWithoutData();
      renderAll();
    }
  }

  function hasRequiredElements() {
    return Object.values(els).every(Boolean);
  }

  function validateDataShape(data) {
    if (!data || typeof data !== "object") {
      throw new Error("JSON 루트는 객체여야 합니다.");
    }
    if (!data.ranges || typeof data.ranges !== "object") {
      throw new Error("ranges 객체가 없습니다.");
    }
    if (!data.stackGroups || typeof data.stackGroups !== "object") {
      throw new Error("stackGroups 객체가 없습니다.");
    }
  }

  function setupInitialSelection() {
    const stackKeys = Object.keys(state.data.stackGroups || {});
    state.stackKey = stackKeys.find((key) => state.data.ranges && state.data.ranges[key]) || stackKeys[0] || "";
    state.displayPosition = findFirstAvailableDisplayPosition(state.stackKey) || DISPLAY_POSITIONS[0];
    state.rangePosition = getRangePosition(state.displayPosition);
  }

  function findFirstAvailableDisplayPosition(stackKey) {
    const stackRanges = state.data.ranges && state.data.ranges[stackKey];
    if (!stackRanges) {
      return "";
    }

    return DISPLAY_POSITIONS.find((position) => {
      const alias = getRangePosition(position);
      return Boolean(stackRanges[alias]);
    }) || "";
  }

  function renderControls() {
    renderStackButtons(Object.entries(state.data.stackGroups || {}));
    renderPositionButtons();
  }

  function renderControlsWithoutData() {
    renderStackButtons([]);
    renderPositionButtons();
  }

  function renderStackButtons(stackEntries) {
    els.stackButtons.innerHTML = "";

    stackEntries.forEach(([key, group]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "select-button";
      button.textContent = group && group.label ? group.label : key;
      button.setAttribute("aria-pressed", String(key === state.stackKey));
      button.addEventListener("click", () => {
        state.stackKey = key;
        state.selectedHand = "";
        if (!getCurrentRange()) {
          state.displayPosition = findFirstAvailableDisplayPosition(key) || state.displayPosition;
        }
        state.rangePosition = getRangePosition(state.displayPosition);
        renderAll();
      });
      els.stackButtons.appendChild(button);
    });
  }

  function renderPositionButtons() {
    els.positionButtons.innerHTML = "";

    DISPLAY_POSITIONS.forEach((position) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "select-button";
      button.textContent = position;
      button.setAttribute("aria-pressed", String(position === state.displayPosition));
      button.addEventListener("click", () => {
        state.displayPosition = position;
        state.rangePosition = getRangePosition(position);
        state.selectedHand = "";
        renderAll();
      });
      els.positionButtons.appendChild(button);
    });
  }

  function renderAll() {
    state.rangePosition = getRangePosition(state.displayPosition);
    state.handActions = buildHandActionMap(getCurrentRange());
    updatePressedButtons();
    renderGrid();
    renderLegend();
    renderStatus();
    renderSummary();
    renderSelectedHandDetail();
  }

  function updatePressedButtons() {
    updateButtonGroup(els.stackButtons, state.stackKey);
    updateButtonGroup(els.positionButtons, state.displayPosition);
  }

  function updateButtonGroup(container, selectedTextOrKey) {
    Array.from(container.children).forEach((button) => {
      const isStack = container === els.stackButtons;
      const value = isStack ? getStackKeyByLabel(button.textContent) : button.textContent;
      button.setAttribute("aria-pressed", String(value === selectedTextOrKey));
    });
  }

  function getStackKeyByLabel(label) {
    if (!state.data) {
      return "";
    }
    return Object.entries(state.data.stackGroups || {}).find(([, group]) => (group.label || "") === label)?.[0] || label;
  }

  function renderEmptyGrid() {
    els.handGrid.innerHTML = "";
    getAllHands().forEach((hand) => {
      const cell = createHandCell(hand, "FOLD");
      els.handGrid.appendChild(cell);
    });
  }

  function renderGrid() {
    els.handGrid.innerHTML = "";

    getAllHands().forEach((hand) => {
      const action = state.handActions.get(hand) || "FOLD";
      const cell = createHandCell(hand, action);
      if (hand === state.selectedHand) {
        cell.classList.add("is-selected");
      }
      els.handGrid.appendChild(cell);
    });
  }

  function createHandCell(hand, action) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `hand-cell ${getActionClass(action)}`;
    cell.textContent = hand;
    cell.title = `${hand} · 액션: ${getActionLabel(action)}`;
    cell.setAttribute("aria-label", `${hand}, 액션 ${getActionLabel(action)}`);
    cell.addEventListener("click", () => {
      state.selectedHand = state.selectedHand === hand ? "" : hand;
      renderGrid();
      renderSelectedHandDetail();
    });
    return cell;
  }

  function getAllHands() {
    const hands = [];
    RANKS.forEach((rowRank, rowIndex) => {
      RANKS.forEach((colRank, colIndex) => {
        if (rowIndex === colIndex) {
          hands.push(`${rowRank}${colRank}`);
        } else if (rowIndex < colIndex) {
          hands.push(`${rowRank}${colRank}s`);
        } else {
          hands.push(`${colRank}${rowRank}o`);
        }
      });
    });
    return hands;
  }

  function getCurrentRange() {
    if (!state.data || !state.data.ranges || !state.stackKey) {
      return null;
    }

    const stackRanges = state.data.ranges[state.stackKey];
    if (!stackRanges) {
      return null;
    }

    return stackRanges[state.rangePosition] || null;
  }

  function buildHandActionMap(range) {
    const map = new Map();
    if (!range || typeof range !== "object") {
      return map;
    }

    Object.entries(range).forEach(([action, hands]) => {
      if (!ACTION_LABELS[action]) {
        console.warn(`알 수 없는 액션 이름입니다: ${action}`);
      }
      if (!Array.isArray(hands)) {
        console.warn(`${action} 액션의 핸드 목록이 배열이 아닙니다.`);
        return;
      }

      hands.forEach((hand) => {
        if (typeof hand !== "string" || !isValidHand(hand)) {
          console.warn(`잘못된 핸드 문자열입니다: ${hand}`);
          return;
        }
        if (map.has(hand)) {
          console.warn(`${hand} 핸드가 여러 액션에 중복 등록되어 첫 액션(${map.get(hand)})을 유지합니다.`);
          return;
        }
        map.set(hand, action);
      });
    });

    return map;
  }

  function isValidHand(hand) {
    return getAllHands().includes(hand);
  }

  function renderLegend() {
    els.legend.innerHTML = "";
    const usedActions = Array.from(new Set(state.handActions.values()));
    const orderedActions = ACTION_ORDER.filter((action) => usedActions.includes(action));

    orderedActions.forEach((action) => {
      const item = document.createElement("div");
      item.className = "legend-item";

      const swatch = document.createElement("span");
      swatch.className = `legend-swatch ${getActionClass(action)}`;

      const label = document.createElement("span");
      label.textContent = getActionLabel(action);

      item.append(swatch, label);
      els.legend.appendChild(item);
    });
  }

  function renderStatus() {
    els.selectedPosition.textContent = state.displayPosition || "-";
    els.rangePosition.textContent = state.rangePosition || "-";
    els.scenarioLabel.textContent = getScenarioLabel();

    if (!state.data) {
      return;
    }

    if (state.displayPosition === "BB" && state.data.scenario === "FIRST_IN") {
      showMessage("BB 포지션에는 First-in 레인지가 적용되지 않습니다.<br>앞사람 스틸 대응 레인지 데이터가 추가되면 확인할 수 있습니다.");
      return;
    }

    if (!getCurrentRange()) {
      showMessage("선택한 조건에 등록된 핸드레인지가 없습니다.");
      return;
    }

    hideMessage();
  }

  function renderSummary() {
    const stackGroup = state.data && state.data.stackGroups ? state.data.stackGroups[state.stackKey] : null;
    const counts = countActions();
    const totalActive = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    const percent = ((totalActive / 169) * 100).toFixed(1);

    els.summaryStack.textContent = stackGroup && stackGroup.label ? stackGroup.label : state.stackKey || "-";
    els.summaryPosition.textContent = state.displayPosition ? `${state.displayPosition} (${state.rangePosition || "-"})` : "-";
    els.summaryScenario.textContent = getScenarioLabel();
    els.actionCounts.innerHTML = "";

    ACTION_ORDER.forEach((action) => {
      if (!counts.has(action)) {
        return;
      }
      const chip = document.createElement("span");
      chip.className = "count-chip";
      chip.textContent = `${getActionLabel(action)} ${counts.get(action)}개`;
      els.actionCounts.appendChild(chip);
    });

    if (!els.actionCounts.children.length) {
      const chip = document.createElement("span");
      chip.className = "count-chip";
      chip.textContent = "참여 액션 0개";
      els.actionCounts.appendChild(chip);
    }

    els.participation.textContent = `참여 핸드: ${totalActive} / 169 · 핸드 클래스 기준 ${percent}%`;
  }

  function countActions() {
    const counts = new Map();
    state.handActions.forEach((action) => {
      counts.set(action, (counts.get(action) || 0) + 1);
    });
    return counts;
  }

  function renderSelectedHandDetail() {
    if (!state.selectedHand) {
      els.selectedHandDetail.textContent = "핸드를 터치하면 현재 액션을 확인할 수 있습니다.";
      return;
    }

    const stackGroup = state.data && state.data.stackGroups ? state.data.stackGroups[state.stackKey] : null;
    const stackLabel = stackGroup && stackGroup.label ? stackGroup.label : state.stackKey || "-";
    const action = state.handActions.get(state.selectedHand) || "FOLD";
    els.selectedHandDetail.textContent = `선택 핸드: ${state.selectedHand} · 현재 액션: ${getActionLabel(action)} · 스택: ${stackLabel} · 포지션: ${state.displayPosition || "-"}`;
  }

  function getRangePosition(displayPosition) {
    if (!state.data || !state.data.positionAliases) {
      return displayPosition || "";
    }
    return state.data.positionAliases[displayPosition] || displayPosition || "";
  }

  function getScenarioLabel() {
    const scenario = state.data && state.data.scenario ? state.data.scenario : "";
    return SCENARIO_LABELS[scenario] || scenario || "-";
  }

  function getActionLabel(action) {
    return ACTION_LABELS[action] || action || "폴드";
  }

  function getActionClass(action) {
    const normalized = String(action || "FOLD").toLowerCase().replaceAll("_", "-");
    return `action-${normalized}`;
  }

  function showMessage(html) {
    els.message.innerHTML = html;
    els.message.hidden = false;
  }

  function hideMessage() {
    els.message.textContent = "";
    els.message.hidden = true;
  }
})();
