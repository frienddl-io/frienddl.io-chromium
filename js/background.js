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

          if (task === "updateScoreKeeper") {
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
