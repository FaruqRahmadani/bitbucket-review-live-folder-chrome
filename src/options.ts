const usernameInput = document.getElementById("username") as HTMLInputElement;
const appPasswordInput = document.getElementById("token") as HTMLInputElement;
const pollMinutesInput = document.getElementById("pollMinutes") as HTMLInputElement;
const pollMinutesValue = document.getElementById("pollMinutesValue") as HTMLSpanElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const closeButton = document.getElementById("close") as HTMLButtonElement | null;

const setPollMinutesLabel = (value: string) => {
  pollMinutesValue.textContent = value;
};

if (closeButton) {
  closeButton.addEventListener("click", () => {
    chrome.tabs.getCurrent((tab) => {
      if (tab?.id !== undefined) {
        chrome.tabs.remove(tab.id);
        return;
      }
      window.close();
    });
  });
}

chrome.storage.sync.get(["username", "appPassword", "pollMinutes"], (result) => {
  if (result.username) usernameInput.value = result.username as string;
  if (result.appPassword) appPasswordInput.value = result.appPassword as string;
  if (result.pollMinutes) pollMinutesInput.value = String(result.pollMinutes);
  setPollMinutesLabel(pollMinutesInput.value);
});

pollMinutesInput.addEventListener("input", () => {
  setPollMinutesLabel(pollMinutesInput.value);
});

saveButton.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const appPassword = appPasswordInput.value.trim();
  const pollMinutes = parseInt(pollMinutesInput.value) || 3;

  if (!username || !appPassword) {
    alert("Please fill in username/email and app password.");
    return;
  }

  chrome.storage.sync.set({ username, appPassword, pollMinutes }, () => {
    const originalText = saveButton.textContent;
    saveButton.textContent = "Saved!";
    setTimeout(() => {
      saveButton.textContent = originalText;
    }, 1500);

    chrome.runtime.sendMessage({ type: "CONFIG_UPDATED" });
  });
});