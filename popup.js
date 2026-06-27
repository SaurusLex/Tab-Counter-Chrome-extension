const DEFAULT_SETTINGS = {
  countAllWindows: false,
  badgeColor: "#4B4B4B",
  statsAllWindows: false,
};

const BADGE_COLORS = [
  { name: "Gray", hex: "#4B4B4B", class: "color-gray" },
  { name: "White", hex: "#FFFFFF", class: "color-white" },
  { name: "Red", hex: "#FF5252", class: "color-red" },
];

const SWITCH_CONFIGS = [
  {
    id: "statsAllWindows",
    label: "Include all windows",
    mountId: "statsSwitches",
    onChange: () => init(),
  },
  {
    id: "countAllWindows",
    label: "Count all windows",
    mountId: "badgeSwitches",
  },
];

const switchRefs = new Map();

function createSwitch({ id, label, container, onChange }) {
  const wrapper = document.createElement("div");
  wrapper.className = "switch-container";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = label;

  const switchLabel = document.createElement("label");
  switchLabel.className = "switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;

  const slider = document.createElement("span");
  slider.className = "slider";

  switchLabel.append(input, slider);
  wrapper.append(labelSpan, switchLabel);
  container.appendChild(wrapper);

  input.addEventListener("change", async (e) => {
    const checked = e.target.checked;
    await chrome.storage.local.set({ [id]: checked });
    if (onChange) onChange(checked);
  });

  return { input };
}

function mountSwitches() {
  SWITCH_CONFIGS.forEach((config) => {
    const container = document.getElementById(config.mountId);
    const { mountId, ...switchConfig } = config;
    switchRefs.set(config.id, createSwitch({ ...switchConfig, container }));
  });
}

async function fetchData() {
  const currentWindow = await chrome.windows.getCurrent();
  const [currentTabs, allTabs, allWindows, settings] = await Promise.all([
    chrome.tabs.query({ windowId: currentWindow.id }),
    chrome.tabs.query({}),
    chrome.windows.getAll(),
    chrome.storage.local.get(DEFAULT_SETTINGS),
  ]);

  // Decide which tabs to group based on settings
  const tabsToGroup = settings.statsAllWindows ? allTabs : currentTabs;

  // Group by domain
  const domainCounts = {};
  tabsToGroup.forEach((tab) => {
    try {
      if (!tab.url) return;
      const url = new URL(tab.url);
      if (url.protocol === "chrome:" || url.protocol === "edge:") {
        domainCounts["System Pages"] = (domainCounts["System Pages"] || 0) + 1;
        return;
      }
      let domain = url.hostname.replace("www.", "");
      if (!domain) return;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    } catch (e) {
      domainCounts["Others"] = (domainCounts["Others"] || 0) + 1;
    }
  });

  // Sort and group "Others"
  const sortedDomains = Object.entries(domainCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const topDomains = sortedDomains.slice(0, 5);
  const othersCount = sortedDomains
    .slice(5)
    .reduce((acc, curr) => acc + curr[1], 0);

  const finalStats = topDomains.map(([name, count]) => ({ name, count }));
  if (othersCount > 0) {
    finalStats.push({ name: "Others", count: othersCount });
  }

  return {
    currentCount: currentTabs.length,
    totalTabs: allTabs.length,
    totalWindows: allWindows.length,
    domainStats: finalStats,
    ...settings,
  };
}

function render(data) {
  document.getElementById("currentWindowTabs").textContent = data.currentCount;
  document.getElementById("allWindowsTabs").textContent = data.totalTabs;
  document.getElementById("allWindowsTitle").textContent =
    `All Windows (${data.totalWindows})`;

  // Render domain stats
  const statsContainer = document.getElementById("domainStats");
  statsContainer.innerHTML = "";
  data.domainStats.forEach((stat) => {
    const item = document.createElement("div");
    item.className = "domain-item";
    if (stat.name === "Others") {
      item.classList.add("others");
    }
    item.innerHTML = `
      <span class="domain-name">${stat.name}</span>
      <span class="domain-count">${stat.count}</span>
    `;
    statsContainer.appendChild(item);
  });

  switchRefs.forEach((ref, id) => {
    ref.input.checked = data[id];
  });

  // Render color picker
  const colorPicker = document.getElementById("colorPicker");
  colorPicker.innerHTML = "";
  BADGE_COLORS.forEach((color) => {
    const opt = document.createElement("div");
    opt.className = `color-option ${color.class}`;
    if (color.hex === data.badgeColor) opt.classList.add("selected");
    opt.dataset.color = color.hex;
    opt.title = color.name;
    colorPicker.appendChild(opt);
  });
}

async function init() {
  try {
    const data = await fetchData();
    render(data);
  } catch (error) {
    console.error("Error initializing popup:", error);
  }
}

mountSwitches();

document.getElementById("colorPicker").addEventListener("click", (e) => {
  const option = e.target.closest(".color-option");
  if (option) {
    const color = option.dataset.color;
    chrome.storage.local.set({ badgeColor: color });

    document.querySelectorAll(".color-option").forEach((opt) => {
      opt.classList.toggle("selected", opt === option);
    });
  }
});

init();
