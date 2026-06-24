async function getWindowsWithActiveTabs() {
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  const results = await Promise.all(
    windows.map(async (win) => {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        windowId: win.id,
      });
      return { windowId: win.id, activeTab };
    })
  );
  return results.filter(({ activeTab }) => activeTab);
}

async function updateGlobalBadge(total, badgeColor) {
  const windowsWithTabs = await getWindowsWithActiveTabs();

  await Promise.all(
    windowsWithTabs.map(({ activeTab }) =>
      chrome.action.setBadgeText({ text: null, tabId: activeTab.id })
    )
  );

  await chrome.action.setBadgeText({ text: String(total) });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

async function updatePerWindowBadges(badgeColor) {
  await chrome.action.setBadgeText({ text: "" });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

  const windowsWithTabs = await getWindowsWithActiveTabs();

  await Promise.all(
    windowsWithTabs.map(async ({ windowId, activeTab }) => {
      const tabs = await chrome.tabs.query({ windowId });

      await chrome.action.setBadgeText({
        text: String(tabs.length),
        tabId: activeTab.id,
      });
      await chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId: activeTab.id,
      });
    })
  );
}

async function updateBadge() {
  try {
    const { countAllWindows, badgeColor = "#4B4B4B" } =
      await chrome.storage.local.get(["countAllWindows", "badgeColor"]);

    if (countAllWindows) {
      const tabs = await chrome.tabs.query({});
      await updateGlobalBadge(tabs.length, badgeColor);
    } else {
      await updatePerWindowBadges(badgeColor);
    }
  } catch (error) {
    console.error("Error updating badge:", error);
  }
}

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);
chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateBadge();
  }
});

chrome.windows.onFocusChanged.addListener(updateBadge);
chrome.windows.onCreated.addListener(updateBadge);
chrome.windows.onRemoved.addListener(updateBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.countAllWindows || changes.badgeColor)) {
    updateBadge();
  }
});

updateBadge();
