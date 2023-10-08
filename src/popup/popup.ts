import {
  getGlobalSettingsT,
  sendGlobalSettingsT,
  setGlobalSettingsSuccessfulT,
  setGlobalSettingsT,
} from "../service-worker";

const decreaseRateInput = document.getElementById(
  "decreaseRate"
) as HTMLInputElement;
const increaseRateInput = document.getElementById(
  "increaseRate"
) as HTMLInputElement;
const persistCheckInput = document.getElementById(
  "persistCheck"
) as HTMLInputElement;

const onChangeNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/^[^0-9.]$/g, "");
  input.value = input.value.slice(0, 5);
};

decreaseRateInput.addEventListener("change", onChangeNumber);
increaseRateInput.addEventListener("change", onChangeNumber);

const saveSettings = () => {
  if (decreaseRateInput.value === "" || increaseRateInput.value === "") return;
  chrome.runtime.sendMessage(
    {
      id: "setGlobalSettings",
      settings: {
        decreaseRate: parseFloat(decreaseRateInput.value),
        increaseRate: parseFloat(increaseRateInput.value),
        persistentPlaybackRate: persistCheckInput.checked,
      },
    } as setGlobalSettingsT,
    (response: setGlobalSettingsSuccessfulT) => {
      window.close();
    }
  );
};

const saveButton = document.getElementById(
  "saveButton"
) as HTMLButtonElement | null;

if (saveButton !== null) {
  saveButton.addEventListener("click", saveSettings);
}

chrome.runtime.sendMessage(
  { id: "getGlobalSettings" } as getGlobalSettingsT,
  (response: sendGlobalSettingsT) => {
    decreaseRateInput.value = response.settings.decreaseRate.toString();
    increaseRateInput.value = response.settings.increaseRate.toString();
    persistCheckInput.checked = response.settings.persistentPlaybackRate;
  }
);
