console.log("Background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

let CONTENT_PORTS = [];

// Values for testing
// chrome.storage.sync.set(
//   {
//     oneDayScore: 0,
//     oneDayScoreDate: new Date().getTime() - (2 * 24 * 60 * 60 * 1000),
//     sevenDayScore: 0
//     sevenDayScoreDate: new Date().getTime() - (10 * 24 * 60 * 60 * 1000),
//     thirtyDayScore: 0,
//     thirtyDayScoreDate: new Date().getTime() - (45 * 24 * 60 * 60 * 1000),
//     allTimeScore: 0,
//     allTimeScoreDate: new Date().getTime() - (0 * 24 * 60 * 60 * 1000),
//     thirtyDayPoints: 0,
//     sevenDayPoints: 0,
//     oneDayPoints: 0,
//     allTimePoints: 0
//   }
// );

// Responds to alarms to check for new high score
chrome.alarms.onAlarm.addListener(
  function(alarm) {
    let tabId = parseInt(alarm.name);
    console.log(`Starting score search: ${tabId}`);

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
  if (tabId === undefined || tabId === null) {
    console.log("tabId is null or undefined; not creating alarm");
  } else {
    chrome.storage.sync.get(
      [
        "scoreKeeperOptOut"
      ],
      function(response) {
        let scoreKeeperOptOut = response.scoreKeeperOptOut || false;

        console.dir(tabId);
        let alarmName = tabId.toString();
        console.debug(`alarmName: ${alarmName}`)

        if (!scoreKeeperOptOut) {
          console.log(`Creating alarm: ${alarmName}`);
          chrome.alarms.create(
            alarmName,
            {
              delayInMinutes: .5
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

function daysAgo(now, days) {
  return new Date(now - (days * 24 * 60 * 60 * 1000)).getTime();
}

function scoreOutdated(currentHighScoreDate, now, days) {
  let currentDaysAgo = daysAgo(now, days);
  console.debug(`daysAgo: ${daysAgo}`);

  if (currentHighScoreDate < daysAgo) {
    console.log(`currentScoreDate is older than ${days} days: ${currentHighScoreDate} < ${daysAgo}`);
    return true;
  }

  return false;
}

function calculateTotal() {

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

    let currentPoints = response.score;
    console.debug(`currentPoints: ${currentPoints}`)

    if (currentPoints !== null && currentPoints !== 0) {
      let now = new Date().getTime();

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
          currentPoints = parseInt(currentPoints);
          console.debug(`currentPoints: ${currentPoints}`)

          let newScores = {};

          // 1 day high score
          let oneDayScore = response.oneDayScore || 0;
          console.debug(`oneDayScore: ${oneDayScore}`);

          let oneDayScoreDate = response.oneDayScoreDate || now;
          console.debug(`oneDayScoreDate: ${oneDayScoreDate}`);

          if (oneDayScore !== 0) {
            if (scoreOutdated(oneDayScoreDate, now, 1)) {
              oneDayScore = 0;
              newScores.oneDayScore = oneDayScore;
              newScores.oneDayScoreDate = now;
            }
          }

          // 7 days high score
          let sevenDayScore = response.sevenDayScore || 0;
          console.debug(`sevenDayScore: ${sevenDayScore}`);

          let sevenDayScoreDate = response.sevenDayScoreDate || now;
          console.debug(`sevenDayScoreDate: ${sevenDayScoreDate}`);

          if (sevenDayScore !== 0) {
            if (scoreOutdated(sevenDayScoreDate, now, 7)) {
              sevenDayScore = 0;
              newScores.sevenDayScore = sevenDayScore;
              newScores.sevenDayScoreDate = now;
            }
          }

          // 30 days high score
          let thirtyDayScore = response.thirtyDayScore || 0;
          console.debug(`thirtyDayScore: ${thirtyDayScore}`);

          let thirtyDayScoreDate = response.thirtyDayScoreDate || now;
          console.debug(`thirtyDayScoreDate: ${thirtyDayScoreDate}`);

          if (thirtyDayScore !== 0) {
            if (scoreOutdated(thirtyDayScoreDate, now, 30)) {
              thirtyDayScore = 0;
              newScores.thirtyDayScore = thirtyDayScore;
              newScores.thirtyDayScoreDate = now;
            }
          }

          // All-time high score
          let allTimeScore = response.allTimeScore || 0;
          console.debug(`allTimeScore: ${allTimeScore}`);

          let allTimeScoreDate = response.allTimeScoreDate || now;
          console.debug(`allTimeScoreDate: ${allTimeScoreDate}`)

          // Compare current score to existing high scores
          if (currentPoints > oneDayScore) {
            console.log(`Setting new 1 day high score: ${oneDayScore} to ${currentPoints}`);

            newScores.oneDayScore = currentPoints;
            newScores.oneDayDate = now;
          }

          if (currentPoints > sevenDayScore) {
            console.log(`Setting new 7 day high score: ${sevenDayScore} to ${currentPoints}`);

            newScores.sevenDayScore = currentPoints;
            newScores.sevenDayScoreDate = now;
          }

          if (currentPoints > thirtyDayScore) {
            console.log(`Setting new 30 day high score: ${thirtyDayScore} to ${currentPoints}`);

            newScores.thirtyDayScore = currentPoints;
            newScores.thirtyDayScoreDate = now;
          }

          if (currentPoints > allTimeScore) {
            console.log(`Setting new all-time high score: ${allTimeScore} to ${currentPoints}`);

            newScores.allTimeScore = currentPoints;
            newScores.allTimeScoreDate = now;
          }

          if (Object.entries(newScores).length > 0) {
            console.log("Updating high scores");
            console.dir(newScores);
            chrome.storage.sync.set(newScores);
          }
        }
      );

      chrome.storage.sync.get(
        [
          "pointsArray",
          "allTimePoints"
        ],
        function(response) {
          let pointsArray = response.pointsArray;
          console.log("pointsArray");
          console.dir(pointsArray);
          let allTimePoints = response.allTimePoints;
          let updatedPoints;

          if (pointsArray === undefined || pointsArray === null || pointsArray.length < 1) {
            console.log("pointsArray is undefined, 0, or 1");

            pointsArray = [
              {
                date: now,
                points: currentPoints
              }
            ];

            updatedPoints = {
              pointsArray: pointsArray,
              thirtyDayPoints: currentPoints,
              sevenDayPoints: currentPoints,
              oneDayPoints: currentPoints,
              allTimePoints: currentPoints
            };
          } else {
            let lastPointsRecorded = pointsArray.pop();


            if (lastPointsRecorded.points === currentPoints) {
              console.log("New points not found");
            } else {
              let timeDifference = now - lastPointsRecorded.date;
              const twoMinutes = 2 * 60 * 1000;

              let newPoints;

              if (timeDifference > twoMinutes) {
                newPoints = currentPoints;
              } else {
                console.log(`Subtracting last points to prevent double-counting: ${lastPointsRecorded.points}`);
                newPoints = currentPoints - lastPointsRecorded.points;
              }

              console.log(`newPoints: ${newPoints}`);

              pointsArray.push(
                {
                  date: now,
                  points: newPoints
                }
              );

              updatedPoints = {
                pointsArray: pointsArray,
                allTimePoints: allTimePoints + newPoints
              }
            }

            function checkDate(i) {
              return i.date < cutoff;
            }

            // Filter and remove if 30 days old
            let cutoff = daysAgo(now, 30)

            pointsArray = pointsArray.filter(checkDate);
            updatedPoints = {
              pointsArray: pointsArray
            };

            if (pointsArray.length > 1) {
              console.log("Reducing");
              let thirtyDayPoints = pointsArray.reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              // 7 days
              cutoff = daysAgo(now, 7)

              let sevenDayPoints = pointsArray.filter(checkDate).reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              // 1 day
              cutoff = daysAgo(now, 1)

              let oneDayPoints = pointsArray.filter(checkDate).reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              updatedPoints = {
                thirtyDayPoints: thirtyDayPoints,
                sevenDayPoints: sevenDayPoints,
                oneDayPoints: oneDayPoints
              };
            }
          }

          console.log("updatedPoints");
          console.dir(updatedPoints)
          chrome.storage.sync.set(updatedPoints);
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
