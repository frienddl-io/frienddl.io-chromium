console.log("Background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

let CONTENT_PORTS = [];

// Responds to alarms to check for new high score
chrome.alarms.onAlarm.addListener(
  function(alarm) {
    console.log("Starting score search");
    console.log(alarm);
    console.dir(alarm);

    let tabId = parseInt(alarm.name);
    console.log(`tabId: ${tabId}`);

    chrome.tabs.sendMessage(
      tabId,
      {
        tabId: tabId,
        task: "scoreSearch"
      },
      respondToScoreSearchContent
    );
  }
);

// Creates alarm to monitor current player's score
function createAlarm(tabId) {
  if (tabId === null) {
    console.log("tabId is null; not creating alarm");
  } else {
    chrome.storage.sync.get(
      [
        "highScoreOptOut"
      ],
      function(response) {
        let highScoreOptOut = response.highScoreOptOut || false;

        console.dir(tabId);
        let alarmName = tabId.toString();
        console.log(`alarmName: ${alarmName}`)

        if (!highScoreOptOut) {
          console.log(`Creating alarm: ${alarmName}`);
          chrome.alarms.create(
            alarmName,
            {
              delayInMinutes: 1
            }
          );
          console.log(`Alarm created: ${alarmName}`);
        } else {
          console.log("Opted out of high scores; not creating alarm");
        }
      }
    );
  }
}

// Listen for messages from popup
chrome.runtime.onConnect.addListener(
  function(port) {
    if (port.name === "p2b") {
      console.log("Connected to p2b");
      port.onMessage.addListener(
        function(message) {
          console.dir(message);

          if (message.task === "joinNewGame") {
            joinNewGame(message.tabId);
          } else if (message.task === "createAlarms") {
            function forEachCreateAlarm(value, index, array) {
              createAlarm(value);
            }

            CONTENT_PORTS.forEach(forEachCreateAlarm);
          }
        }
      );
    } else if (port.name === "c2b") {
      let tabId = port.sender.tab.id;
      console.log(`Connected to c2b port with tabID: ${tabId}`)
      CONTENT_PORTS.push(tabId);

      createAlarm(tabId);
    } else {
      console.log(`Port is not recognized: ${port.name}`);
    }
  }
);

function scoreOutdated(currentScoreDate, today, days) {
  let daysAgo = new Date(today - (days * 24 * 60 * 60 * 1000)).getTime();
  console.debug(`daysAgo: ${daysAgo}`);

  if (currentScoreDate < daysAgo) {
    console.log(`currentScoreDate is older than ${days} days: ${currentScoreDate} < ${daysAgo}`);
    return true;
  }

  return false;
}

// Processes the response from the content of a game related to friend searching
function respondToScoreSearchContent(response) {
  console.log("Received response from content for score search");
  console.dir(response);

  if (response === undefined) {
    let lastError = chrome.runtime.lastError.message;
    console.log(`Response was undefined, last error: ${lastError}`);
  } else {
    let tabId = response.tabId;
    console.log(`Checking for new high score in tab with id: ${tabId}`);

    let score = response.score;
    console.debug("score: " + score)

    if (score !== null && score !== 0) {
      chrome.storage.sync.get(
        [
          "oneDayScore",
          "oneDayScoreDate",
          "sevenDayScore",
          "sevenDayScoreDate",
          "thirtyDayScore",
          "thirtyDayScoreDate",
          "allTimeScore",
          "allTimeScoreDate"
        ],
        function(response) {
          let intScore = parseInt(score);
          console.debug("intScore: " + intScore)

          let newScores = {};
          let today = new Date().getTime();

          // 1 day high score
          let oneDayScore = response.oneDayScore || 0;
          console.debug(`oneDayScore: ${oneDayScore}`);

          let oneDayScoreDate = response.oneDayScoreDate || today;
          console.debug(`oneDayScoreDate: ${oneDayScoreDate}`);

          if (oneDayScore !== 0) {
            if (scoreOutdated(oneDayScoreDate, today, 1)) {
              oneDayScore = 0;
              newScores.oneDayScore = oneDayScore;
              newScores.oneDayScoreDate = today;
            }
          }

          // 7 days high score
          let sevenDayScore = response.sevenDayScore || 0;
          console.debug(`sevenDayScore: ${sevenDayScore}`);

          let sevenDayScoreDate = response.sevenDayScoreDate || today;
          console.debug(`sevenDayScoreDate: ${sevenDayScoreDate}`);

          if (sevenDayScore !== 0) {
            if (scoreOutdated(sevenDayScoreDate, today, 7)) {
              sevenDayScore = 0;
              newScores.sevenDayScore = sevenDayScore;
              newScores.sevenDayScoreDate = today;
            }
          }

          // 30 days high score
          let thirtyDayScore = response.thirtyDayScore || 0;
          console.debug(`thirtyDayScore: ${thirtyDayScore}`);

          let thirtyDayScoreDate = response.thirtyDayScoreDate || today;
          console.debug(`thirtyDayScoreDate: ${thirtyDayScoreDate}`);

          if (thirtyDayScore !== 0) {
            if (scoreOutdated(thirtyDayScoreDate, today, 30)) {
              thirtyDayScore = 0;
              newScores.thirtyDayScore = thirtyDayScore;
              newScores.thirtyDayScoreDate = today;
            }
          }

          // All-time high score
          let allTimeScore = response.allTimeScore || 0;
          console.debug(`allTimeScore: ${allTimeScore}`);

          let allTimeScoreDate = response.allTimeScoreDate || today;
          console.debug(`allTimeScoreDate: ${allTimeScoreDate}`)

          // Compare current score to existing high scores
          if (intScore > oneDayScore) {
            console.log(`Setting new 1 day high score: ${oneDayScore} to ${intScore}`);

            newScores.oneDayScore = intScore;
            newScores.oneDayDate = today;
          }

          if (intScore > sevenDayScore) {
            console.log(`Setting new 7 day high score: ${sevenDayScore} to ${intScore}`);

            newScores.sevenDayScore = intScore;
            newScores.sevenDayScoreDate = today;
          }

          if (intScore > thirtyDayScore) {
            console.log(`Setting new 30 day high score: ${thirtyDayScore} to ${intScore}`);

            newScores.thirtyDayScore = intScore;
            newScores.thirtyDayScoreDate = today;
          }

          if (intScore > allTimeScore) {
            console.log(`Setting new all-time high score: ${allTimeScore} to ${intScore}`);

            newScores.allTimeScore = intScore;
            newScores.allTimeScoreDate = today;
          }

          if (Object.entries(newScores).length > 0) {
            console.log("Updating high scores");
            console.dir(newScores);
            chrome.storage.sync.set(newScores);
          }
        }
      );
    } else {
      console.log("Score not found or 0; skipping over");
    }

    createAlarm(tabId);
  }
}

// Listen for window to close
chrome.windows.onRemoved.addListener(
  function (windowId) {
    chrome.storage.local.get(
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
function joinNewGame(tabId) {
  (
    async() => {
      console.log("Awaiting skribbl.io home page load");
      let tab = await goToSkribblioHomePageAsync(tabId);

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
                      task: "friendSearch"
                    },
                    respondToFriendSearchContent
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

// Processes the response from the content of a game related to friend searching
function respondToFriendSearchContent(response) {
  console.log("Received response from content for friend search");
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
  updateBadge("stop");
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
          storageUpdate["runTime"] = getCurrentRunTime(response.startTime, currentTime);
        } else {
          console.log("Not updating endTime and runTime due to previous pause state");
        }
        chrome.storage.local.set(storageUpdate);
      }
    }
  );
}

// Updates values in storage
function updateStorage() {
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
function updatePlayersFound(playersArray, tabId) {
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
      if (typeof response.totalPlayersSeen !== "undefined") {
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
function foundFriend(friendsArray, tabId) {
  console.log("Found friend");
  chrome.storage.local.set(
    {
      "state": "stop"
    },
    function() {
      updateBadge("success");

      chrome.storage.local.get(
        [
          "startTime",
          "runTime",
          "totalFriendsFound",
          "totalRunTime",
          "windowId",
          "audioAlert"
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

          let audioAlert = response.audioAlert;
          console.log(`audioAlert: ${audioAlert}`);

          if (audioAlert === null || audioAlert) {
            let language = chrome.i18n.getUILanguage().split("-")[0];
            console.log(`Using language: ${language}`);
            let audio = new Audio(`../_locales/${language}/success.mp3`);
            audio.play();
          }
        }
      );
    }
  );
}

// Updates badge to reflect the state
function updateBadge(state) {
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
function getCurrentRunTime(startTime, currentTime = undefined) {
  if (currentTime === undefined) {
    currentTime = new Date().getTime();
  }
  return currentTime - startTime;
}
