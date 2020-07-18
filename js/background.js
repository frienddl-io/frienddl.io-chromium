console.log("frienddl.io background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

// Listen for messages from popup
chrome.runtime.onConnect.addListener(
  function(port) {
    if (port.name !== "p2b") {
      console.log("Port is not p2b: " + port.name);
    } else {
      console.log("Connected to p2b");
      port.onMessage.addListener(
        function(message) {
          console.dir(message);

          if (message.task === "joinNewGame") {
            joinNewGame(message.tabId);
          }
        }
      );
    }
  }
);

// Listen for window to close
chrome.windows.onRemoved.addListener(
  function (windowId) {
    chrome.storage.sync.get(
      [
        "windowId"
      ],
      function(response) {
        if(windowId === response.windowId) {
          stopSearch();
        }
      }
    );
  }
);

// Updates a tab to go to the skribbl.io home page
function goToSkribblioHomePageAsync(tabId) {
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
              if (info.status === 'complete' && tabId === tab.id) {
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
function joinNewGame(tabId) {
  (
    async() => {
      console.log("Awaiting skribbl.io home page load");
      let tab = await goToSkribblioHomePageAsync(tabId);

      chrome.storage.sync.get(
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
              respondToContent
            );
          }
        }
      );
    }
  )();
}

// Processes the response from the content of a game
function respondToContent(response) {
  console.log("Received response from content");
  console.dir(response);
  updateStorage();

  if (response === undefined) {
    let lastError = chrome.runtime.lastError.message;
    console.log(`Response was undefined, last error: ${lastError}`);
  } else {
    console.log("Searching players for friends");

    let playersArray = response.players;
    let tabId = response.tabId;

    if (playersArray.length > 1) {
      updatePlayersFound(playersArray, tabId);

      chrome.storage.sync.get(
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
              joinNewGame(tabId);
            }
          } else {
            foundFriend(friendsFound, tabId);
          }
        }
      );
    } else {
      console.log("Only 1 players was found");
      joinNewGame(tabId);
    }
  }
}

function stopSearch() {
  updatePopupAndBadge("stop");
  chrome.storage.sync.get(
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
          storageUpdate["runTime"] = getCurrentRunTime(response.startTime, currentTime);
        } else {
          console.log("Not updating endTime and runTime due to previous pause state");
        }
        chrome.storage.sync.set(storageUpdate);
      }
    }
  );
}

// Updates values in storage
function updateStorage() {
  chrome.storage.sync.get(
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

      chrome.storage.sync.set(
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
function updatePlayersFound(playersArray, tabId) {
  chrome.storage.sync.get(
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

      chrome.storage.sync.set(
        {
          "playersFound": totalPlayersFound,
          "totalPlayersSeen": newTotalPlayersSeen
        }
      );
    }
  );
}

// Steps to take when one or more friends are found
function foundFriend(friendsArray, tabId) {
  console.log("Found friend");
  chrome.storage.sync.set(
    {
      "state": "stop"
    },
    function() {
      updatePopupAndBadge("success");

      chrome.storage.sync.get(
        [
          "startTime",
          "runTime",
          "totalFriendsFound",
          "totalRunTime",
          "windowId"
        ],
        function(response) {
          let currentTime = new Date().getTime();
          let finalRunTime = getCurrentRunTime(response.startTime, currentTime);

          let newTotalFriendsFound = 1;
          if (response.totalFriendsFound !== undefined) {
            newTotalFriendsFound += response.totalFriendsFound;
          }

          let newTotalRunTime = finalRunTime;
          if (response.totalRunTime !== undefined) {
            newTotalRunTime += response.totalRunTime;
          }

          chrome.storage.sync.set(
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

// Updates the popup to a predefined HTML file
function updatePopupAndBadge(state) {
  let popupFile = "";

  console.log(`Making popup & badge updates for: ${state}`)
  switch(state) {
    case "stop":
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: STOP_BADGE_COLOR
        }
      );
      chrome.browserAction.setBadgeText(
        {
          text: ""
        }
      );
      popupFile = "html/default.html";
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
      popupFile = "html/success.html";
      break;
  }
  if (popupFile !== "") {
    chrome.browserAction.setPopup(
      {
        popup: popupFile
      }
    );
  } else {
    console.error(`State to update popup invalid: ${state}`);
  }
}

// Returns the current run time
function getCurrentRunTime(startTime, currentTime = undefined) {
  if (currentTime === undefined) {
    currentTime = new Date().getTime();
  }
  return currentTime - startTime;
}
