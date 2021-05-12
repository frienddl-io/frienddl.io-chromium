console.log("Background script loaded");

const SKRIBBLIO_URL = "https://skribbl.io/";

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

let CONTENT_PORTS = [];
let PROCESS_NEW_POINTS_LOCK = false;
let PROCESS_NEW_POINTS_QUEUE = [];
let PROCESS_NEW_POINTS_QUEUE_INTERVAL;

function daysAgo(now, days) {
  return new Date(now - (days * 24 * 60 * 60 * 1000)).getTime();
}

function calculateHighScores(updatedScoreKeeper, response, pointsArray, now) {
  function findHighestTotalGamePoints(array) {
    return array.reduce(
      (acc, val) => {
        acc = ( acc !== undefined && acc.totalGamePoints > val.totalGamePoints) ? acc : val;
        return acc;
      },
      []
    );
  }

  // 1 day high score
  let cutoff = daysAgo(now, 1);
  function checkTime(i) {
    return i.time > cutoff;
  }

  let oneDayHighScore = findHighestTotalGamePoints(pointsArray.filter(checkTime));
  console.debug(`oneDayHighScore: ${oneDayHighScore.totalGamePoints}`);

  updatedScoreKeeper.oneDayHighScore = oneDayHighScore.totalGamePoints;
  updatedScoreKeeper.oneDayHighScoreTime = oneDayHighScore.time;

  // 7 day high score
  cutoff = daysAgo(now, 7);

  let sevenDayHighScore = findHighestTotalGamePoints(pointsArray.filter(checkTime));
  console.debug(`sevenDayHighScore: ${sevenDayHighScore.totalGamePoints}`);

  updatedScoreKeeper.sevenDayHighScore = sevenDayHighScore.totalGamePoints;
  updatedScoreKeeper.sevenDayHighScoreTime = sevenDayHighScore.time;

  // 30 day high score
  cutoff = daysAgo(now, 30);

  let thirtyDayHighScore = findHighestTotalGamePoints(pointsArray.filter(checkTime));
  console.debug(`thirtyDayHighScore: ${thirtyDayHighScore.totalGamePoints}`);

  updatedScoreKeeper.thirtyDayHighScore = thirtyDayHighScore.totalGamePoints;
  updatedScoreKeeper.thirtyDayHighScoreTime = thirtyDayHighScore.time;

  // All-time high score
  let allTimeHighScore = findHighestTotalGamePoints(pointsArray);
  console.debug(`allTimeHighScore: ${allTimeHighScore.totalGamePoints}`);

  updatedScoreKeeper.allTimeHighScore = allTimeHighScore.totalGamePoints;
  updatedScoreKeeper.allTimeHighScoreTime = allTimeHighScore.time;

  return updatedScoreKeeper;
}

function calculateTotalPoints(updatedScoreKeeper, response, pointsArray, now) {
  function calculatePoints(previousValue, currentValue) {
    if (currentValue.points === undefined) {
      return {
        points: (previousValue.points === undefined) ? 0 : previousValue.points
      }
    } else {
      return {
        points: previousValue.points + currentValue.points
      }
    }
  }

  let allTimePoints = pointsArray.reduce(calculatePoints).points;
  if (allTimePoints !== response.allTimePoints) {
    updatedScoreKeeper.allTimePoints = allTimePoints;
  }

  // 30 days
  let cutoff = daysAgo(now, 30);
  function checkTime(i) {
    return i.time > cutoff;
  }

  let thirtyDayPoints = pointsArray.filter(checkTime).reduce(calculatePoints).points;

  console.debug(`thirtyDayPoints: ${thirtyDayPoints}`);
  if (thirtyDayPoints !== response.thirtyDayPoints) {
    updatedScoreKeeper.thirtyDayPoints = thirtyDayPoints;
  }

  // 7 days
  cutoff = daysAgo(now, 7);

  let sevenDayPoints = pointsArray.filter(checkTime).reduce(calculatePoints).points;

  console.debug(`sevenDayPoints: ${sevenDayPoints}`);
  if (sevenDayPoints !== response.sevenDayPoints) {
    updatedScoreKeeper.sevenDayPoints = sevenDayPoints;
  }

  // 1 day
  cutoff = daysAgo(now, 1);

  let oneDayPoints = pointsArray.filter(checkTime).reduce(calculatePoints).points;

  console.debug(`oneDayPoints: ${oneDayPoints}`);
  if (oneDayPoints !== response.oneDayPoints) {
    updatedScoreKeeper.oneDayPoints = oneDayPoints;
  }

  return updatedScoreKeeper;
}

// Processes new points from a tab
function processNewPoints(message) {
  if (message === undefined) {
    let lastError = chrome.runtime.lastError.message;
    console.log(`Message was undefined, last error: ${lastError}`);
  } else {
    chrome.storage.sync.get(
      [
        "oneDayHighScore",
        "oneDayHighScoreTime",
        "sevenDayHighScore",
        "sevenDayHighScoreTime",
        "thirtyDayHighScore",
        "thirtyDayHighScoreTime",
        "allTimeHighScore",
        "allTimeHighScoreTime",
        "pointsArray",
        "oneDayPoints",
        "sevenDayPoints",
        "thirtyDayPoints",
        "allTimePoints"
      ],
      function(response) {
        let currentPoints = parseInt(message.points);
        console.debug(`currentPoints: ${currentPoints}`);

        let totalGamePoints = parseInt(message.totalGamePoints);
        console.debug(`totalGamePoints: ${totalGamePoints}`);

        let now = new Date().getTime();
        let updatedScoreKeeper = {
          scoreKeeperSpinner: now
        };

        let pointsArray = response.pointsArray;

        if (currentPoints === undefined || currentPoints === null || currentPoints === 0) {
          console.log("currentPoints is undefined, null, or 0");
        } else {
          if (pointsArray === undefined || pointsArray === null || pointsArray.length === 0) {
            console.log("pointsArray is undefined, null, or 0");
            pointsArray = [];
          }

          pointsArray.push(
            {
              time: now,
              points: currentPoints,
              totalGamePoints: totalGamePoints
            }
          );
          updatedScoreKeeper.pointsArray = pointsArray;
        }

        updatedScoreKeeper = calculateHighScores(
          updatedScoreKeeper,
          response,
          pointsArray,
          now
        );

        updatedScoreKeeper = calculateTotalPoints(
          updatedScoreKeeper,
          response,
          pointsArray,
          now
        );

        console.log("updatedScoreKeeper");
        console.dir(updatedScoreKeeper);

        console.log("Updating score keeper values");
        chrome.storage.sync.set(
          updatedScoreKeeper,
          function() {
            console.log("Unlocking");
            PROCESS_NEW_POINTS_LOCK = false;
          }
        );
      }
    );
  }
}

function manageContentPort(action, tabId) {
  if (action === "add") {
    if (CONTENT_PORTS.includes(tabId)) {
      console.log(`Content ports already includes tabId: ${tabId}`);
    } else {
      CONTENT_PORTS.push(tabId);
      console.log(`Added tabId to content ports: ${tabId}`);

      if (CONTENT_PORTS.length === 1) {
        PROCESS_NEW_POINTS_QUEUE_INTERVAL = setInterval(
          function() {
            let queueNotEmpty = PROCESS_NEW_POINTS_QUEUE.length > 0;
            if (PROCESS_NEW_POINTS_LOCK === false && queueNotEmpty) {
              PROCESS_NEW_POINTS_LOCK = true;
              processNewPoints(PROCESS_NEW_POINTS_QUEUE.shift());
            }
          },
          100
        );
      }
    }
  } else if (action === "remove") {
    CONTENT_PORTS = CONTENT_PORTS.filter(i => i !== tabId);
    console.log(`Removed tabId from content ports: ${tabId}`);

    if (CONTENT_PORTS.length === 0) {
      clearInterval(PROCESS_NEW_POINTS_QUEUE_INTERVAL);
    }
  }
}

// Listen for messages from content or popup
chrome.runtime.onConnect.addListener(
  function(port) {
    if (port.name === "p2b") {
      console.log("Connected to p2b");

      port.onMessage.addListener(
        function(message) {
          let task = message.task;
          console.debug()

          if (task === "joinNewGame") {
            joinNewGame(message.tabId);
          } else if (task === "updateScoreKeeper") {
            PROCESS_NEW_POINTS_QUEUE.push(
              {
                points: 0,
                totalGamePoints: 0
              }
            );
            PROCESS_NEW_POINTS_QUEUE_INTERVAL = setInterval(
              function() {
                let queueNotEmpty = PROCESS_NEW_POINTS_QUEUE.length > 0;
                if (PROCESS_NEW_POINTS_LOCK === false) {
                  if (queueNotEmpty) {
                    PROCESS_NEW_POINTS_LOCK = true;
                    processNewPoints(PROCESS_NEW_POINTS_QUEUE.shift());
                  } else {
                    clearInterval(PROCESS_NEW_POINTS_QUEUE_INTERVAL);
                  }
                }
              },
              100
            );

            function forEachGetPoints(value, index, array) {
              let tabId = value;
              console.debug(`Starting score search on tabId: ${tabId}`);

              chrome.tabs.sendMessage(
                tabId,
                {
                  tabId: tabId,
                  task: "getPoints"
                }
              );
            }

            CONTENT_PORTS.forEach(forEachGetPoints);
          }
        }
      );
    } else if (port.name === "c2b") {
      let tabId = port.sender.tab.id;
      console.log(`Connected to c2b port with tabId: ${tabId}`)
      manageContentPort("add", tabId);

      port.onMessage.addListener(
        function(message) {
          let task = message.task;
          console.dir(message);

          if (task === "logPoints") {
            console.log(`Pushing message to process new points for tabID: ${tabId}`);
            PROCESS_NEW_POINTS_QUEUE.push(message);
          }
        }
      );
    } else {
      console.log(`Port is not recognized: ${port.name}`);
    }
  }
);

// Listen for window to close
chrome.tabs.onRemoved.addListener(
  function(tabId) {
    if (CONTENT_PORTS.includes(tabId)) {
      manageContentPort("remove", tabId);
    }
  }
);

// Listen for window to close
chrome.windows.onRemoved.addListener(
  function (windowId) {
    chrome.storage.local.get(
      [
        "windowId"
      ],
      function(response) {
        if (windowId === response.windowId) {
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

// Updates values in storage for friend finder
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
