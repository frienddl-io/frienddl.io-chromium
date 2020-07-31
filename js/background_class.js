const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

let CONTENT_PORTS = [];

export class Background {
  constructor() {
    // Listen for new ports
    chrome.runtime.onConnect.addListener(Background.processPort);

    // Listen for windows being removed
    chrome.windows.onRemoved.addListener(Background.checkWindowRemoved);
  }

  static compareWindowRemovedToSearchWindow(response, windowId) {
    if(windowId === response.windowId) {
      Background.stopSearch();
    } else {
      console.log(`Window with ID removed but isn't search window: ${response.windowId}`)
    }
  }

  // Checks to see if a removed window is the search window
  static checkWindowRemoved(windowId) {
    chrome.storage.local.get(
      [
        "windowId"
      ],
      compareWindowRemovedToSearchWindow(response, windowId)
    );
  }

  // Process a new port that's opened
  static processPort(port) {
    if (port.name === "p2b") {
      console.log("Connected to p2b");
      port.onMessage.addListener(
        function(message) {
          console.dir(message);

          if (message.task === "joinNewGame") {
            Background.joinNewGame(message.tabId);
          }
        }
      );
    } if (port.name === "c2b") {
      let tabId = port.sender.tab.id;
      CONTENT_PORTS.push(tabId);
    } else {
      console.log("Port is not recognized: " + port.name);
    }
  }

  // Updates a tab to go to the skribbl.io home page
  static goToSkribblioHomePageAsync(tabId) {
    return new Promise(
      resolve => {
        chrome.tabs.update(
          tabId,
          {
            url: SKRIBBLIO_URL,
            active: false
          },
          async tab => {
            chrome.tabs.onUpdated.addListener(
              function listener(tabId, info) {
                if (info.status === "complete" && tabId === tab.id) {
                  chrome.tabs.onUpdated.removeListener(listener);
                  resolve(tab);
                } else {
                  console.log(`Not ready | info.status: ${info.status} , Target Tab: ${tabId} , Current Tab: ${tab.id}`);
                }
              }
            );
          }
        );
      }
    );
  }

  // Steps to take when a new game needs to be joined
  static joinNewGame(tabId) {
    (
      async() => {
        console.log("Awaiting skribbl.io home page load");
        let tab = await Background.goToSkribblioHomePageAsync(tabId);

        console.log("Waiting for content script to load");
        var checkIfContentScriptIsLoaded = setInterval(
          function() {
            if (CONTENT_PORTS.includes(tabId)) {
              console.log("Loaded");

              chrome.storage.local.get(
                [
                  "state"
                ],
                function(response) {
                  if (response.state === "search") {
                    console.log("Sending message to join new game");
                    chrome.tabs.sendMessage(
                      tabId,
                      {
                        tabId: tabId,
                        task: "retrieveContent"
                      },
                      Background.respondToContent
                    );
                  } else {
                    console.log(`State is not search: ${response.state}`);
                  }
                }
              );
              clearInterval(checkIfContentScriptIsLoaded);
            } else {
              console.log("Content script isn't loaded");
              console.dir(CONTENT_PORTS);
              console.log(CONTENT_PORTS.includes(tabId));
            }
          },
          100
        );
      }
    )();
  }

  // Processes the response from the content of a game
  static respondToContent(response) {
    console.log("Received response from content");
    console.dir(response);
    Background.updateStorage();

    if (response === undefined) {
      let lastError = chrome.runtime.lastError.message;
      console.log(`Response was undefined, last error: ${lastError}`);
    } else {
      console.log("Searching players for friends");

      let playersArray = response.players;
      let tabId = response.tabId;

      if (playersArray.length > 1) {
        Background.updatePlayersFound(playersArray, tabId);

        chrome.storage.local.get(
          [
            "friends",
            "state"
          ],
          function(response) {
            let friendsFound = [];
            for (const friend of response.friends) {
              if (playersArray.includes(friend)) {
                friendsFound.push(friend);
              }
            }

            if (friendsFound.length === 0) {
              console.log("No friends found");
              if (response.state === "search") {
                Background.joinNewGame(tabId);
              }
            } else {
              Background.foundFriend(friendsFound, tabId);
            }
          }
        );
      } else {
        console.log("Only 1 players was found");
        Background.joinNewGame(tabId);
      }
    }
  }

  static stopSearch() {
    Background.updateBadge("stop");
    chrome.storage.local.get(
      [
        "startTime",
        "state"
      ],
      function(response) {
        let state = response.state;
        if (state !== "stop") {
          let storageUpdate = {
            "state": "stop"
          };

          if (state !== "pause") {
            console.log("Updating endTime and runTime");

            let currentTime = new Date().getTime();
            storageUpdate["endTime"] = currentTime;
            storageUpdate["runTime"] = Background.getCurrentRunTime(response.startTime, currentTime);
          } else {
            console.log("Not updating endTime and runTime due to previous pause state");
          }
          chrome.storage.local.set(storageUpdate);
        }
      }
    );
  }

  // Updates values in storage
  static updateStorage() {
    chrome.storage.local.get(
      [
        "gamesJoined",
        "startTime",
        "runTime",
        "totalGamesJoined"
      ],
      function(response) {
        console.dir(response);
        let newGamesJoined = response.gamesJoined + 1;
        chrome.browserAction.setBadgeText(
          {
            text: newGamesJoined.toString()
          }
        );

        let startTime = response.startTime;
        let newRunTime = new Date().getTime() - startTime;

        let newTotalGamesJoined = 1;
        if (response.totalGamesJoined !== undefined) {
          newTotalGamesJoined += response.totalGamesJoined;
        }

        chrome.storage.local.set(
          {
            "gamesJoined": newGamesJoined,
            "totalGamesJoined": newTotalGamesJoined,
            "runTime": newRunTime
          }
        );
      }
    );
  }

  // Updates the values in storage related to players found or seen
  static updatePlayersFound(playersArray, tabId) {
    chrome.storage.local.get(
      [
        "playersFound",
        "totalPlayersSeen"
      ],
      function(response) {
        let playersFound = response.playersFound;
        if (playersFound !== undefined) {
          console.dir(playersFound);
        }
        let newPlayersFound = [];
        playersArray.forEach(
          (element) => {
            if (playersFound.indexOf(element) === -1) {
              newPlayersFound.push(element);
            }
          }
        );

        let totalPlayersFound = newPlayersFound.concat(playersFound);

        let newTotalPlayersSeen = playersArray.length;
        if (typeof response.totalPlayersSeen !== 'undefined') {
          newTotalPlayersSeen += response.totalPlayersSeen;
        }

        chrome.storage.local.set(
          {
            "playersFound": totalPlayersFound,
            "totalPlayersSeen": newTotalPlayersSeen
          }
        );
      }
    );
  }

  // Steps to take when one or more friends are found
  static foundFriend(friendsArray, tabId) {
    console.log("Found friend");
    chrome.storage.local.set(
      {
        "state": "stop"
      },
      function() {
        Background.updateBadge("success");

        chrome.storage.local.get(
          [
            "startTime",
            "runTime",
            "totalFriendsFound",
            "totalRunTime",
            "windowId"
          ],
          function(response) {
            let currentTime = new Date().getTime();
            let finalRunTime = Background.getCurrentRunTime(response.startTime, currentTime);

            let newTotalFriendsFound = 1;
            if (response.totalFriendsFound !== undefined) {
              newTotalFriendsFound += response.totalFriendsFound;
            }

            let newTotalRunTime = finalRunTime;
            if (response.totalRunTime !== undefined) {
              newTotalRunTime += response.totalRunTime;
            }

            chrome.storage.local.set(
              {
                "friendsFound": friendsArray,
                "runTime": finalRunTime,
                "endTime": currentTime,
                "totalFriendsFound": newTotalFriendsFound,
                "totalRunTime": newTotalRunTime
              }
            );

            chrome.windows.update(
              response.windowId,
              {
                drawAttention: true
              }
            );
          }
        );
      }
    );
  }

  // Updates badge to reflect the state
  static updateBadge(state) {
    console.log(`Making badge updates for: ${state}`)
    switch(state) {
      case "stop":
        chrome.browserAction.setBadgeBackgroundColor(
          {
            color: STOP_BADGE_COLOR
          }
        );
        break;
      case "success":
        chrome.browserAction.setBadgeText(
          {
            text: SUCCESS_BADGE_TEXT
          }
        );
        chrome.browserAction.setBadgeBackgroundColor(
          {
            color: SUCCESS_BADGE_COLOR
          }
        );
        break;
      default:
        console.error(`State to update invalid: ${state}`);
    }
  }

  // Returns the current run time
  static getCurrentRunTime(startTime, currentTime = undefined) {
    if (currentTime === undefined) {
      currentTime = new Date().getTime();
    }
    return currentTime - startTime;
  }
}
