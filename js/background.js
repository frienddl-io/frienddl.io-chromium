console.log("Frienddl.io background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";
const SUCCESS_BADGE_TEXT = {
  text: "!"
};

// Listen for messages from popup
chrome.runtime.onConnect.addListener(
  function(port) {
    if (port.name !== "p2b") {
      console.log("Port is not p2b: " + port.name);
    } else {
      console.log("Port is p2b");
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

// Updates a tab to go to the Scribbl.io home page
function goToScribblioHomePageAsync(tabId) {
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
  console.log("Before async");
  (
    async() => {
      let tab = await goToScribblioHomePageAsync(tabId);
      console.dir(tab);

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
  updateStorage(response.tabId);

  if (response === null) {
    console.log("Response was null");
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

// Updates values in storage
function updateStorage(tabId) {
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
      console.dir(response);

      let playersFound = response.playersFound;
      let newPlayersFound = [];
      playersArray.forEach(
        (element) => {
          console.log();
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
      updatePopupToSuccess();
      chrome.browserAction.setBadgeText(SUCCESS_BADGE_TEXT);

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

// Updates the popup to a predefined success HTML file
function updatePopupToSuccess() {
  let popupFile = "html/success.html";

  chrome.browserAction.setPopup(
    {
      popup: popupFile
    }
  );
}

// Creates a new tab; not used currently but will come in handy for multi-threading
function createTab() {
  return new Promise(
    resolve => {
      chrome.storage.sync.get(
        [
          "windowId"
        ],
        function(response) {
          if (response.windowId !== undefined) {
            chrome.tabs.create(
              {
                windowId: response.windowId,
                url: SKRIBBLIO_URL,
                active: false
              },
              async tab => {
                chrome.tabs.onUpdated.addListener(
                  function listener(tabId, info) {
                    if (info.status === 'complete' && tabId === tab.id) {
                      chrome.tabs.onUpdated.removeListener(listener);
                      resolve(tab);
                    }
                  }
                );
              }
            );
          } else {
            console.error("Window ID not in storage");
          }
        }
      );
    }
  );
}
