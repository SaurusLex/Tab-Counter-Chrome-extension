async function updateBadge() {
  try {
    const window = await chrome.windows.getLastFocused({ populate: false });

    if (!window || window.id === chrome.windows.WINDOW_ID_NONE) {
      return;
    }

    const tabs = await chrome.tabs.query({ windowId: window.id });
    const tabCount = tabs.length;

    await chrome.action.setBadgeText({ text: String(tabCount) });

    await chrome.action.setBadgeBackgroundColor({ color: "#4B4B4B" });
  } catch (error) {
    console.error("Error updating badge:", error);
  }
}

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onDetached.addListener(updateBadge);
chrome.tabs.onAttached.addListener(updateBadge);

chrome.windows.onFocusChanged.addListener(updateBadge);

updateBadge();
