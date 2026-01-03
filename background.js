async function updateBadge() {
  try {
    const { countAllWindows, badgeColor = "#4B4B4B" } =
      await chrome.storage.local.get(["countAllWindows", "badgeColor"]);

    let tabCount;
    if (countAllWindows) {
      const tabs = await chrome.tabs.query({});
      tabCount = tabs.length;
    } else {
      const window = await chrome.windows.getLastFocused({ populate: false });
      if (!window || window.id === chrome.windows.WINDOW_ID_NONE) {
        return;
      }
      const tabs = await chrome.tabs.query({ windowId: window.id });
      tabCount = tabs.length;
    }

    await chrome.action.setBadgeText({ text: String(tabCount) });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  } catch (error) {
    console.error("Error updating badge:", error);
  }
}

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);

chrome.windows.onFocusChanged.addListener(updateBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.countAllWindows || changes.badgeColor)) {
    updateBadge();
  }
});

updateBadge();
