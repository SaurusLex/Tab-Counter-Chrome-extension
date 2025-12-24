async function updatePopup() {
  try {
    const currentWindow = await chrome.windows.getCurrent();

    const currentTabs = await chrome.tabs.query({ windowId: currentWindow.id });
    document.getElementById("currentWindowTabs").textContent =
      currentTabs.length;

    const allTabs = await chrome.tabs.query({});
    const allWindows = await chrome.windows.getAll();
    document.getElementById(
      "totals"
    ).textContent = `${allTabs.length} tabs in ${allWindows.length} windows`;
  } catch (error) {
    console.error("Error updating popup:", error);
  }
}

updatePopup();
