import {
  currentPlayrateT,
  getGlobalSettingsT,
  initiateContentT,
  initiateFailedT,
  initiateSuccessT,
  sendGlobalSettingsT,
  setLocalSettingsT,
  settingsT,
} from "../service-worker";

// * three possible page navigation
// * 1. first opening - triggers tabs.onUpdated - buttons initiated by service worker
// * 2. navigation from video page to video page on the same tab - triggers tabs.onUpdated - buttons already exists
// * 3. page refresh - does not triggers tabs.onUpdated - buttons initiated by content script

{
  // * default youtubePlayrateExtension_settings its always overwritten
  const youtubePlayrateExtension_settings: settingsT = {
    decreaseRate: 0.25,
    increaseRate: 0.25,
    persistentPlaybackRate: false,
    currentRate: null,
  };

  const initiateContent = (sendResponse: (response?: any) => void) => {
    if (
      window.location.href &&
      !window.location.href.includes("youtube.com/watch")
    ) {
      sendResponse({
        id: "initiateFailed",
        status: "notYoutubeWatch",
      } as initiateFailedT);
      return false;
    }

    const mainVideo = getMainVideo();

    if (mainVideo === null) {
      sendResponse({
        id: "initiateFailed",
        status: "noVideo",
      } as initiateFailedT);
      return false;
    }

    const controls = document.querySelector(
      ".ytp-right-controls"
    ) as HTMLDivElement;

    if (controls === null) {
      sendResponse({
        id: "initiateFailed",
        status: "noControls",
      } as initiateFailedT);
      return false;
    }

    if (doesButtonsExist()) {
      // * 2nd navigation
      // * mainVideo created again therefore playrate on mainVideo reset

      updateMainVideoPlayrate();

      sendResponse({
        id: "initiateSuccess",
        status: "buttonsAlreadyAdded",
      } as initiateSuccessT);
      return true;
    }

    createButtons(mainVideo, controls);

    sendResponse({
      id: "initiateSuccess",
      status: "buttonsAdded",
    } as initiateSuccessT);
  };

  const getMainVideo: () => null | HTMLVideoElement = () => {
    const mainVideo = document.querySelector(".html5-main-video");
    if (mainVideo === null) return null;

    if (mainVideo.tagName === "VIDEO") return mainVideo as HTMLVideoElement;
    else return null;
  };

  const setLocalSettings = (settings: settingsT) => {
    youtubePlayrateExtension_settings.decreaseRate = settings.decreaseRate;
    youtubePlayrateExtension_settings.increaseRate = settings.increaseRate;
    youtubePlayrateExtension_settings.persistentPlaybackRate =
      settings.persistentPlaybackRate;

    youtubePlayrateExtension_settings.currentRate =
      settings.persistentPlaybackRate ? settings.currentRate : null;

    // * update current playrate if its exist
    const mainVideo = getMainVideo();
    if (
      mainVideo !== null &&
      settings.persistentPlaybackRate &&
      settings.currentRate
    ) {
      mainVideo.playbackRate = settings.currentRate;
      const resetButton = document.querySelector(
        "#youtubePlayrateExtension-rateButtonReset"
      ) as HTMLButtonElement | null;
      if (resetButton !== null) updateResetButton(resetButton, mainVideo);
    }
  };

  const updateMainVideoPlayrate = () => {
    const resetButton = document.querySelector(
      "#youtubePlayrateExtension-rateButtonReset"
    ) as HTMLButtonElement;
    const mainVideo = getMainVideo();
    if (resetButton !== null && mainVideo !== null) {
      if (
        youtubePlayrateExtension_settings.persistentPlaybackRate &&
        youtubePlayrateExtension_settings.currentRate !== null
      ) {
        mainVideo.playbackRate = youtubePlayrateExtension_settings.currentRate;
      }
      updateResetButton(resetButton, mainVideo);
    }
  };

  const createButtons = (
    mainVideo: HTMLVideoElement,
    controls: HTMLDivElement
  ) => {
    const rateButtonIncrease = document.createElement("button");
    rateButtonIncrease.setAttribute(
      "id",
      "youtubePlayrateExtension-rateButtonIncrease"
    );
    rateButtonIncrease.setAttribute("class", "ytp-button");
    rateButtonIncrease.innerHTML = `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20.5 20.5"><defs><style>.cls-1{fill:#fff;stroke:#1d1d1b;stroke-linejoin:round;stroke-width:0.5px;}</style></defs><polygon class="cls-1" points="20.25 7.42 20.25 13.08 13.08 13.08 13.08 20.25 7.42 20.25 7.42 13.08 0.25 13.08 0.25 7.42 7.42 7.42 7.42 0.25 13.08 0.25 13.08 7.42 20.25 7.42"/></svg>`;

    const rateButtonDecrease = document.createElement("button");
    rateButtonDecrease.setAttribute(
      "id",
      "youtubePlayrateExtension-rateButtonDecrease"
    );
    rateButtonDecrease.setAttribute("class", "ytp-button");
    rateButtonDecrease.innerHTML = `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 564.84 141.16"><defs><style>.cls-1{fill:#fff;}</style></defs><rect class="cls-1" x="429.37" y="217.7" width="141.16" height="564.84" rx="12" transform="translate(-217.7 570.54) rotate(-90)"/></svg>`;

    const rateButtonReset = document.createElement("button");
    rateButtonReset.setAttribute(
      "id",
      "youtubePlayrateExtension-rateButtonReset"
    );
    rateButtonReset.setAttribute("class", "ytp-button");

    updateResetButton(rateButtonReset, mainVideo);

    const increaseRate = () => {
      if (mainVideo.playbackRate < 16) {
        const newRate = parseFloat(
          (
            youtubePlayrateExtension_settings.increaseRate +
            mainVideo.playbackRate
          ).toFixed(5)
        );

        mainVideo.playbackRate = newRate <= 16 ? newRate : 16;

        updateResetButton(rateButtonReset, mainVideo);

        if (youtubePlayrateExtension_settings.persistentPlaybackRate) {
          chrome.runtime.sendMessage({
            id: "currentPlayrate",
            currentPlayrate: mainVideo.playbackRate,
          } as currentPlayrateT);
        }
      }
    };
    const decreaseRate = () => {
      if (mainVideo.playbackRate > 0) {
        const newRate = parseFloat(
          (
            mainVideo.playbackRate -
            youtubePlayrateExtension_settings.decreaseRate
          ).toFixed(6)
        );

        mainVideo.playbackRate = newRate >= 0 ? newRate : 0;
        updateResetButton(rateButtonReset, mainVideo);

        if (youtubePlayrateExtension_settings.persistentPlaybackRate) {
          chrome.runtime.sendMessage({
            id: "currentPlayrate",
            currentPlayrate: mainVideo.playbackRate,
          } as currentPlayrateT);
        }
      }
    };

    // * last check
    if (doesButtonsExist()) return;
    controls.insertBefore(rateButtonIncrease, controls.firstChild);
    controls.insertBefore(rateButtonReset, controls.firstChild);
    controls.insertBefore(rateButtonDecrease, controls.firstChild);

    rateButtonIncrease.addEventListener("click", increaseRate);
    rateButtonDecrease.addEventListener("click", decreaseRate);
    rateButtonReset.addEventListener("click", () => {
      console.log(youtubePlayrateExtension_settings);
      mainVideo.playbackRate = 1;
      updateResetButton(rateButtonReset, mainVideo);
    });

    // * if currentRate exists
    updateMainVideoPlayrate();
  };

  const updateResetButton = (
    rateButtonReset: HTMLButtonElement,
    mainVideo: HTMLVideoElement
  ) => {
    rateButtonReset.innerHTML = mainVideo.playbackRate.toString();
  };

  const doesButtonsExist = () => {
    if (document.querySelector("#youtubePlayrateExtension-rateButtonReset"))
      return true;
    else return false;
  };

  chrome.runtime.onMessage.addListener(
    (request: initiateContentT | setLocalSettingsT, sender, sendResponse) => {
      console.log("req", request);
      switch (request.id) {
        case "initiateContent":
          setLocalSettings(request.settings);
          initiateContent(sendResponse);
          break;

        case "setLocalSettings":
          setLocalSettings(request.settings);
          break;

        default:
          break;
      }
    }
  );

  {
    // * works every time but its only indented for page refreshes

    let intervalCount = 0;

    if (!doesButtonsExist()) {
      // * tries every second for 15 times
      const addInterval = setInterval(() => {
        if (intervalCount === 15) {
          clearInterval(addInterval);
        }

        const mainVideo = getMainVideo();

        const controls = document.querySelector(
          ".ytp-right-controls"
        ) as HTMLDivElement;

        if (controls === null || mainVideo === null) {
          intervalCount++;
          return;
        }

        chrome.runtime.sendMessage(
          {
            id: "getGlobalSettings",
          } as getGlobalSettingsT,
          (response: sendGlobalSettingsT) => {
            if (
              response === undefined ||
              response.id !== "sendGlobalSettings"
            ) {
              intervalCount++;
              console.error(chrome.runtime.lastError?.message);
            } else if (doesButtonsExist()) {
              clearInterval(addInterval);
            } else {
              setLocalSettings(response.settings);
              createButtons(mainVideo, controls);
              clearInterval(addInterval);
            }
          }
        );
      }, 1000);
    }
  }
}
