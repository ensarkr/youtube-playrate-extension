console.log("back running");

export type settingsT = {
  decreaseRate: number;
  increaseRate: number;
  currentRate: null | number;
  persistentPlaybackRate: boolean;
};

// * popup, content -> service

export type getGlobalSettingsT = {
  id: "getGlobalSettings";
};

// * popup -> service

export type setGlobalSettingsT = {
  id: "setGlobalSettings";
  settings: Omit<settingsT, "currentRate">;
};

// * service -> popup, content

export type sendGlobalSettingsT = {
  id: "sendGlobalSettings";
  settings: settingsT;
};

// * service -> content

export type setLocalSettingsT = {
  id: "setLocalSettings";
  settings: settingsT;
};

// * service -> content

export type initiateContentT = {
  id: "initiateContent";
  settings: settingsT;
};

// * popup, content -> service

export type noAccessToSettingsT = {
  id: "noAccessToSettings";
};

// * content -> service

export type currentPlayrateT = {
  id: "currentPlayrate";
  currentPlayrate: number;
};

// * content -> service

export type initiateSuccessT = {
  id: "initiateSuccess";
  status: "buttonsAdded" | "buttonsAlreadyAdded";
};

export type initiateFailedT = {
  id: "initiateFailed";
  status: "notYoutubeWatch" | "noVideo" | "noControls";
};

// * popup -> service

export type setGlobalSettingsSuccessfulT = {
  id: "setGlobalSettingsSuccessful";
};

const getSettings = async () => {
  let settings = await chrome.storage.local.get("playrateSettings");

  if (
    settings.playrateSettings === undefined ||
    Object.keys(settings.playrateSettings).length !== 4
  ) {
    const defaultSettings: settingsT = {
      decreaseRate: 0.25,
      increaseRate: 0.25,
      persistentPlaybackRate: false,
      currentRate: null,
    };
    setSettings(defaultSettings);
  }

  settings = await chrome.storage.local.get("playrateSettings");

  return settings.playrateSettings as settingsT;
};

const setSettings = async (settings: settingsT) => {
  if (settings.persistentPlaybackRate === false) settings.currentRate === null;

  await chrome.storage.local.set({ playrateSettings: settings });

  // * when settings change send new settings to all youtube tabs
  chrome.tabs.query({}, function (tabs) {
    tabs.map((tab) => {
      if (tab.url && tab.id && tab.url.includes("youtube.com/watch")) {
        chrome.tabs.sendMessage(tab.id, {
          id: "setLocalSettings",
          settings: {
            ...settings,
            currentRate: settings.persistentPlaybackRate
              ? settings.currentRate
              : null,
          },
        } as setLocalSettingsT);
      }
    });
  });
};

const initiateContent = (tabId: number) => {
  chrome.scripting.insertCSS({
    files: ["styles/content-style.css"],
    target: { tabId: tabId },
  });

  const settings = getSettings();
  if (settings === null) {
    throw Error("could not access to localStorage");
  }

  let intervalCount = 0;

  // * tries to add buttons to tabId 15 times
  const addInterval = setInterval(async () => {
    if (intervalCount === 15) {
      clearInterval(addInterval);
    }
    chrome.tabs.sendMessage(
      tabId,
      {
        id: "initiateContent",
        settings: await getSettings(),
      } as initiateContentT,
      (response: undefined | initiateSuccessT | initiateFailedT) => {
        if (response === undefined) {
          intervalCount++;
          console.error(chrome.runtime.lastError?.message);
        } else {
          switch (response.id) {
            case "initiateSuccess":
              clearInterval(addInterval);

              response.status === "buttonsAlreadyAdded"
                ? console.log("frontend: buttons already added")
                : console.log("frontend: buttons added");

              break;

            case "initiateFailed":
              intervalCount++;
              console.log("frontend response: " + response.status);
              break;

            default:
              break;
          }
        }
      }
    );
  }, 1000);
};

chrome.tabs.onUpdated.addListener((tabId, tab) => {
  // * tab.url triggered only when pages navigates
  // * it does not triggered on page refresh
  // * cause of that content-script can create buttons itself

  if (tab.url && tab.url.includes("youtube")) {
    if (tab.url.includes("youtube.com/watch")) {
      console.log("it contains watch");
      initiateContent(tabId);
    } else if (!tab.url.includes("youtube.com/watch")) {
      console.log("it does not contains watch");
    }
  }
});

chrome.runtime.onMessage.addListener(
  (
    request: currentPlayrateT | setGlobalSettingsT | getGlobalSettingsT,
    sender,
    sendResponse
  ) => {
    switch (request.id) {
      case "currentPlayrate":
        // * current playrate update sended to all tabs wih setSettings
        getSettings().then((currentSettings) => {
          if (currentSettings.persistentPlaybackRate)
            setSettings({
              ...currentSettings,
              currentRate: request.currentPlayrate,
            });
        });
        break;

      case "setGlobalSettings":
        // * came from popup sended to all tabs
        getSettings().then((currentSettings) => {
          setSettings({
            ...request.settings,
            currentRate: currentSettings.currentRate,
          });
          sendResponse({
            id: "setGlobalSettingsSuccessful",
          } as setGlobalSettingsSuccessfulT);
        });
        break;

      case "getGlobalSettings":
        // * requested from popup or content-script when content-script is creating buttons itself
        getSettings().then((settings) =>
          sendResponse({
            id: "sendGlobalSettings",
            settings: settings,
          } as sendGlobalSettingsT)
        );
        break;

      default:
        break;
    }

    return true;
  }
);
