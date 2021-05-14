console.log("Background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

let CONTENT_PORTS = [];

function getScore(tabId) {
  console.debug(`Starting score search on tabId: ${tabId}`);
  chrome.tabs.sendMessage(
    tabId,
    {
      tabId: tabId,
      task: "scoreSearch"
    },
    respondToScoreSearchContent
  );
}

// Responds to alarms to check for new high score
chrome.alarms.onAlarm.addListener(
  function(alarm) {
    let tabId = parseInt(alarm.name);
    getScore(tabId)
  }
);

// Creates alarm to monitor current player's score
function createAlarm(tabId) {
  console.debug(`tabId: ${tabId}`);

  if (tabId === undefined || tabId === null) {
    console.log("tabId is null or undefined; not creating alarm");
  } else {
    chrome.storage.sync.get(
      [
        "scoreKeeperAutomatic"
      ],
      function(response) {
        let scoreKeeperAutomatic = response.scoreKeeperAutomatic;
        console.debug(`scoreKeeperAutomatic: ${scoreKeeperAutomatic}`);

        if (scoreKeeperAutomatic !== false) {
          scoreKeeperAutomatic = true;
        }
        console.debug(`scoreKeeperAutomatic: ${scoreKeeperAutomatic}`);

        let alarmName = tabId.toString();
        console.debug(`alarmName: ${alarmName}`)

        if (scoreKeeperAutomatic) {
          console.log(`Creating alarm for tabId: ${alarmName}`);
          chrome.alarms.create(
            alarmName,
            {
              delayInMinutes: 1
            }
          );
          console.debug(`Alarm created: ${alarmName}`);
        } else {
          console.log("Manual score keeper type; not setting alarm");
        }
      }
    );
  }
}

// Listen for messages from content or popup
chrome.runtime.onConnect.addListener(
  function(port) {
    if (port.name === "p2b") {
      console.debug("Connected to p2b");

      port.onMessage.addListener(
        function(message) {
          let task = message.task;
          console.debug()

          if (task === "joinNewGame") {
            joinNewGame(message.tabId);
          } else if (task === "createAlarms") {
            function forEachCreateAlarm(value, index, array) {
              console.debug(`Creating alarm for tabId: ${value}`)
              createAlarm(value);
            }

            CONTENT_PORTS.forEach(forEachCreateAlarm);
          } else if (task === "updateScoreKeeper") {
            function forEachGetScore(value, index, array) {
              getScore(value);
            }

            CONTENT_PORTS.forEach(forEachGetScore);

            let waitSeconds = .5;
            setTimeout(
              function() {
                chrome.storage.local.set(
                  {
                    scoreKeeperSpinner: new Date().getTime()
                  }
                );
              },
              waitSeconds * 1000
            );
          }
        }
      );
    } else if (port.name === "c2b") {
      let tabId = port.sender.tab.id;
      console.log(`Connected to c2b port with tabId: ${tabId}`)
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

// Processes the response from the content of a game related to friend searching
function respondToScoreSearchContent(response) {
  console.debug("Received response from content for score search");

  if (response === undefined) {
    let lastError = chrome.runtime.lastError.message;
    console.log(`Response was undefined, last error: ${lastError}`);
  } else {
    let tabId = response.tabId;
    console.debug(`Checking for new high score in tab with id: ${tabId}`);

    let currentPoints = response.points;
    console.debug(`currentPoints: ${currentPoints}`);

    let round = response.round;
    console.debug(`round: ${round}`);

    if (currentPoints === null || currentPoints === 0) {
      console.log("currentPoints is null or 0; skipping over");
    } else {
      console.debug(`currentPoints is not null or 0: ${currentPoints}`);

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

          let updatedHighScores = {};

          // 1 day high score
          let oneDayScore = response.oneDayScore || 0;
          console.debug(`oneDayScore: ${oneDayScore}`);

          let oneDayScoreDate = response.oneDayScoreDate || now;
          console.debug(`oneDayScoreDate: ${oneDayScoreDate}`);

          if (oneDayScore !== 0) {
            if (scoreOutdated(oneDayScoreDate, now, 1)) {
              oneDayScore = 0;
              updatedHighScores.oneDayScore = oneDayScore;
              updatedHighScores.oneDayScoreDate = now;
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
              updatedHighScores.sevenDayScore = sevenDayScore;
              updatedHighScores.sevenDayScoreDate = now;
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
              updatedHighScores.thirtyDayScore = thirtyDayScore;
              updatedHighScores.thirtyDayScoreDate = now;
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

            updatedHighScores.oneDayScore = currentPoints;
            updatedHighScores.oneDayDate = now;
          }

          if (currentPoints > sevenDayScore) {
            console.log(`Setting new 7 day high score: ${sevenDayScore} to ${currentPoints}`);

            updatedHighScores.sevenDayScore = currentPoints;
            updatedHighScores.sevenDayScoreDate = now;
          }

          if (currentPoints > thirtyDayScore) {
            console.log(`Setting new 30 day high score: ${thirtyDayScore} to ${currentPoints}`);

            updatedHighScores.thirtyDayScore = currentPoints;
            updatedHighScores.thirtyDayScoreDate = now;
          }

          if (currentPoints > allTimeScore) {
            console.log(`Setting new all-time high score: ${allTimeScore} to ${currentPoints}`);

            updatedHighScores.allTimeScore = currentPoints;
            updatedHighScores.allTimeScoreDate = now;
          }

          if (Object.entries(updatedHighScores).length > 0) {
            console.log("Updating high scores");
            console.dir(updatedHighScores);
            chrome.storage.sync.set(updatedHighScores);
          } else {
            console.log("Not updating high scores");
          }
        }
      );

      chrome.storage.sync.get(
        [
          "pointsArray",
          "oneDayPoints",
          "sevenDayPoints",
          "thirtyDayPoints",
          "allTimePoints",
          "allTimePoints"
        ],
        function(response) {
          let pointsArray = response.pointsArray;
          console.log("pointsArray at start");
          console.dir(pointsArray);

          let allTimePoints = response.allTimePoints;
          console.debug(`allTimePoints: ${allTimePoints}`);

          let updatedTotalPoints = {};

          if (pointsArray === undefined || pointsArray === null || pointsArray.length < 1) {
            console.log("pointsArray is undefined, null, or less than 1");

            pointsArray.push(
              {
                tabId: tabId,
                date: now,
                points: currentPoints,
                round: round,
                totalGamePoints: currentPoints
              }
            );

            updatedTotalPoints.pointsArray = pointsArray;
            updatedTotalPoints.thirtyDayPoints = currentPoints;
            updatedTotalPoints.sevenDayPoints = currentPoints;
            updatedTotalPoints.oneDayPoints = currentPoints;
            updatedTotalPoints.allTimePoints = currentPoints;
          } else {
            let lastPointsRecorded = pointsArray[pointsArray.length - 1];

            let tabsMatch = lastPointsRecorded.tabId === tabId;
            let roundsMatch = lastPointsRecorded.round === round;
            let pointsMatch = lastPointsRecorded.points === currentPoints;

            let roundLower = round < lastPointsRecorded.round;

            if (tabsMatch && roundsMatch && pointsMatch) {
              console.log("New points not found; updating date on last element in pointsArray");

              pointsArray[pointsArray.length - 1].date = now;
              updatedTotalPoints.pointsArray = pointsArray;
            } else if (!tabsMatch || roundLower) {
              console.log(`tabs (${tabsMatch}) don't match or round (${roundLower}) lower; pushing without comparing`);

              pointsArray.push(
                {
                  tabId: tabId,
                  date: now,
                  points: currentPoints,
                  round: round,
                  totalGamePoints: currentPoints
                }
              );

              updatedTotalPoints.allTimePoints = allTimePoints + currentPoints;
            } else {
              let timeDifference = now - lastPointsRecorded.date;
              const threeMinutes = 3 * 60 * 1000;

              let newPoints;
              let totalGamePoints = lastPointsRecorded.totalGamePoints;;

              if (timeDifference > threeMinutes || currentPoints < totalGamePoints) {
                newPoints = currentPoints;
                totalGamePoints = currentPoints;
              } else {
                console.log(`Subtracting last points to prevent double-counting: ${currentPoints} - ${totalGamePoints}`);
                newPoints = currentPoints - totalGamePoints;
                totalGamePoints = currentPoints;
              }

              console.log(`newPoints: ${newPoints}`);

              if (newPoints === 0) {
                console.log("Updating date on last element in pointsArray");

                pointsArray[pointsArray.length - 1].date = now;
                updatedTotalPoints.pointsArray = pointsArray;
              } else {
                console.log("Pushing new element to pointsArray");
                pointsArray.push(
                  {
                    tabId: tabId,
                    date: now,
                    points: newPoints,
                    round: round,
                    totalGamePoints: totalGamePoints
                  }
                );
              }

              updatedTotalPoints.pointsArray = pointsArray;
              updatedTotalPoints.allTimePoints = allTimePoints + newPoints;
            }

            function checkDate(i) {
              return i.date > cutoff;
            }

            // Filter and remove if 30 days old
            let cutoff = daysAgo(now, 30)
            pointsArray = pointsArray.filter(checkDate);
            updatedTotalPoints.pointsArray = pointsArray;

            if (pointsArray.length >= 2) {
              let thirtyDayPoints = pointsArray.reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              console.debug(`thirtyDayPoints: ${thirtyDayPoints}`);
              if (thirtyDayPoints !== response.thirtyDayPoints) {
                updatedTotalPoints.thirtyDayPoints = thirtyDayPoints;
              }

              // 7 days
              cutoff = daysAgo(now, 7)

              let sevenDayPoints = pointsArray.filter(checkDate).reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              console.debug(`sevenDayPoints: ${sevenDayPoints}`);
              if (thirtyDayPoints !== response.thirtyDayPoints) {
                updatedTotalPoints.sevenDayPoints = thirtyDayPoints;
              }

              // 1 day
              cutoff = daysAgo(now, 1)

              let oneDayPoints = pointsArray.filter(checkDate).reduce(
                function(previousValue, currentValue) {
                  return {
                    points: previousValue.points + currentValue.points
                  }
                }
              ).points;

              console.debug(`oneDayPoints: ${oneDayPoints}`);
              if (thirtyDayPoints !== response.oneDayPoints) {
                updatedTotalPoints.oneDayPoints = oneDayPoints;
              }
            }
          }

          console.log("updatedTotalPoints");
          console.dir(updatedTotalPoints);

          if (Object.entries(updatedTotalPoints).length > 0) {
            console.log("Updating total points");
            chrome.storage.sync.set(updatedTotalPoints);
          } else {
            console.log("Not updating total points");
          }
        }
      );
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
