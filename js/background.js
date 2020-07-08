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
    console.dir(`playersArray: ${playersArray.toString()}`);
    let tabId = response.tabId;

    if (playersArray.length > 1) {
      updatePlayersFound(playersArray, tabId);

      chrome.storage.sync.get(
        [
          "friends",
          "state"
        ],
        function(response) {
          for (const friend of response.friends) {
            if (playersArray.includes(friend)) {
              friendsFound.push(friend);
            }
          }

          let friendsFound = [];
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
      if (typeof response.totalGamesJoined !== 'undefined') {
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
  chrome.storage.sync.set(
    {
      "state": "stop"
    },
    function() {
      chrome.browserAction.setBadgeText(SUCCESS_BADGE_TEXT);

      chrome.storage.sync.get(
        [
          "startTime",
          "runTime",
          "totalFriendsFound",
          "totalRunTime"
        ],
        function(response) {
          let currentTime = new Date().getTime();
          let finalRunTime = getCurrentRunTime(response.startTime, currentTime);

          let newTotalFriendsFound = 1;
          if (typeof response.totalFriendsFound !== 'undefined') {
            newTotalFriendsFound += response.totalFriendsFound;
          }

          let newTotalRunTime = finalRunTime;
          if (typeof response.totalRunTime !== 'undefined') {
            newTotalRunTime += totalRunTime;
          }

          chrome.storage.sync.set(
            {
              "foundFriends": friendsArray,
              "runTime": finalRunTime,
              "endTime": currentTime,
              "totalFriendsFound": newTotalFriendsFound,
              "totalRunTime": newTotalRunTime
            },
            function() {
            }
          );
        }
      );

      chrome.tabs.update(
        tabId,
        {
          active: true
        }
      );
    }
  );
}

// Creates a new tab; not used currently but will come in handy for multi-threading
function createTab(windowId) {
  return new Promise(
    resolve => {
      chrome.tabs.create(
        {
          windowId: id,
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
    }
  );
}

// Returns the current run time
function getCurrentRunTime(startTime, currentTime = undefined) {
  if (currentTime === undefined) {
    currentTime = new Date().getTime();
  }
  return currentTime - startTime;
}
