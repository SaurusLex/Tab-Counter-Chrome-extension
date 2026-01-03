const DEFAULT_SETTINGS = {
  countAllWindows: false,
  badgeColor: "#4B4B4B",
  statsAllWindows: false,
};

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
  document.getElementById(
    "totals"
  ).textContent = `${data.totalTabs} tabs in ${data.totalWindows} windows`;

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

  document.getElementById("countAllWindows").checked = data.countAllWindows;
  document.getElementById("statsAllWindows").checked = data.statsAllWindows;

  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.color === data.badgeColor);
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

document.getElementById("countAllWindows").addEventListener("change", (e) => {
  chrome.storage.local.set({ countAllWindows: e.target.checked });
});

document
  .getElementById("statsAllWindows")
  .addEventListener("change", async (e) => {
    await chrome.storage.local.set({ statsAllWindows: e.target.checked });
    init(); // Refresh stats immediately
  });

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
