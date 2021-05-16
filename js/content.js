const prefix = "frienddl.io | ";
console.log(prefix + "Content script loaded");

let GAME_POINTS = [];

let BACKGROUND_PORT = chrome.runtime.connect(
  {
    name: "c2b"
  }
);
console.log(prefix + "c2b port set up");

function getTotalGamePoints() {
  let totalGamePoints = 0;
  function countPoints(i) {
    totalGamePoints += i.points;
  }

  GAME_POINTS.forEach(countPoints);
  console.debug(`totalGamePoints: ${totalGamePoints}`);

  return totalGamePoints;
}

function calculateNewPoints(currentPoints, currentRound) {
  console.debug(`currentPoints: ${currentPoints}`);

  if (currentPoints === null || currentPoints === undefined) {
    console.log("currentPoints is null or undefined");
    return null;
  } else if (currentPoints === 0) {
    console.log("currentPoints is 0; skipping")
    return 0;
  } else if (GAME_POINTS.length === 0) {
    return currentPoints;
  }

  let lastPointObject = GAME_POINTS[GAME_POINTS.length - 1];

  let totalGamePoints = getTotalGamePoints();

  let latestRound = lastPointObject.round;
  console.debug(`latestRound: ${latestRound}`);

  if (currentPoints === totalGamePoints) {
    let now = new Date().getTime();
    GAME_POINTS[GAME_POINTS.length - 1].time = now;
    return 0;
  } else if (currentRound < latestRound || currentPoints < totalGamePoints) {
    GAME_POINTS = [];
    return currentPoints;
  }

  return currentPoints - totalGamePoints;
}

function logPointsAsync(currentPoints, currentRound, forceUpdate) {
  return new Promise(
    resolve => {
      let newPoints = calculateNewPoints(currentPoints, currentRound);

      chrome.storage.sync.get(
        [
          "scoreKeeperAutomatic",
          "pointsArray"
        ],
        function(response) {
          let scoreKeeperAutomatic = response.scoreKeeperAutomatic;

          console.debug(`scoreKeeperAutomatic: ${scoreKeeperAutomatic}`);

          if (scoreKeeperAutomatic !== false) {
            scoreKeeperAutomatic = true;
          }

          let now = new Date().getTime();

          if (newPoints === undefined || newPoints === null || newPoints <= 0) {
            console.log("newPoints is undefined, null, 0, or negative; skipping");
          } else {
            console.log(prefix + `Score keeper set to manual; won't send new points: ${newPoints}`);
            GAME_POINTS.push(
              {
                time: now,
                round: currentRound,
                points: newPoints,
                sentToScoreKeeper: false
              }
            );
          }

          if (scoreKeeperAutomatic || forceUpdate) {
            let sentToScoreKeeper = true;
            let totalUnsentPoints = 0

            if (forceUpdate && response.pointsArray.length === 0) {
              function countPointsAndMarkSent(i) {
                totalUnsentPoints += i.points;
                i.sentToScoreKeeper = true;
              }

              GAME_POINTS.forEach(countPointsAndMarkSent);
            } else {
              function countPointsAndMarkSent(i) {
                if (i.sentToScoreKeeper === false) {
                  totalUnsentPoints += i.points;
                  i.sentToScoreKeeper = true;
                }
              }

              GAME_POINTS.forEach(countPointsAndMarkSent);
            }

            console.dir(GAME_POINTS);
            console.log(`totalUnsentPoints: ${totalUnsentPoints}`);

            if (totalUnsentPoints.length === 0 || totalUnsentPoints === 0) {
              console.log(prefix + "No unsent points found");
            } else {
              console.log(prefix + `Sending unsent points: ${totalUnsentPoints}`);
              BACKGROUND_PORT.postMessage(
                {
                  points: totalUnsentPoints,
                  totalGamePoints: getTotalGamePoints(),
                  task: "logPoints"
                }
              );
            }
          } else {
            console.log(prefix + `Score keeper set to manual; won't send new points: ${newPoints}`);
            console.dir(GAME_POINTS);
          }

          resolve(true);
        }
      );
    }
  );
}

function checkIfInGame() {
  console.debug(prefix + "Waiting for players");
  var checkIfPlayersExist = setInterval(
    function() {
      if ($(".player").length >= 2) {
        console.debug(prefix + "Players exist");
        $(".player").each(
          function() {
            let playerName = $(this).find(".name").html();
            if (playerName.includes("(You)")) {
              // Credit: https://forum.freecodecamp.org/t/how-can-i-detect-or-trigger-an-event-when-text-in-p-tag-is-changed/270692/4
              // Select the node that will be observed for mutations
              var targetNode = $(this).find('.score')[0];

              // Options for the observer (which mutations to observe)
              var config = { childList: true };

              // Callback function to execute when mutations are observed
              var callback = async function(mutationsList, observer) {
                for (var mutation of mutationsList) {
                  let currentPoints = parseInt(mutation.target.innerText.replace("Points: ", ""));
                  let currentRound = parseInt($("#round")[0].innerText.split(" ")[1]);
                  let forceUpdate = false;

                  await logPointsAsync(currentPoints, currentRound, forceUpdate);
                }
              };
              console.log(prefix + "Score observer set");

              // Create an observer instance linked to the callback function
              var observer = new MutationObserver(callback);

              // Start observing the target node for configured mutations
              observer.observe(targetNode, config);
            }
          }
        );

        clearInterval(checkIfPlayersExist);
      }
    },
    100
  );
}

function checkDisconnected() {
  let disconnectButton = $("#modalDisconnect button:contains('Ok')");
  let disconnectVisible = disconnectButton.is(":visible");
  if (disconnectVisible) {
    console.debug(prefix + "Disconnected");
    disconnectButton.click();
    return true;
  } else {
    return false;
  }
}

function receiveRequest(request, sender, sendResponse) {
  let task = request.task;

  console.log(prefix + `Received request: ${task}`);

  if (task === "getScore") {
    if ($(".player").length < 2) {
      console.debug(prefix + "Players don't exist");
      sendResponse(
        {
          points: null
        }
      );
    } else {
      $(".player").each(
        function() {
          let playerName = $(this).find(".name").html();

          if (playerName.includes("(You)")) {
            let currentPoints = parseInt($(this).find(".score").html().replace("Points: ", ""));
            let currentRound = parseInt($("#round")[0].innerText.split(" ")[1]);
            let forceUpdate = true;
            logPointsAsync(currentPoints, currentRound, forceUpdate);
          }
        }
      );
    }
  } else if (task === "friendSearch") {
    chrome.storage.local.get(
      [
        "state"
      ],
      function(response) {
        if (response.state === "search") {
          console.debug(prefix + "Waiting for play button");
          var checkIfPlayButtonExists = setInterval(
            function() {
              if ($("button[type='submit']").length >= 2) {
                console.debug(prefix + "Play button exists, clicking now");

                let playButton = $("button[type='submit']")[0];
                console.debug(prefix + "Clicking play button");
                playButton.click();
                clearInterval(checkIfPlayButtonExists);
              } else {
                console.debug(prefix + "Play button doesn't exist");
              }
            },
            100
          );

          console.debug(prefix + "Waiting for players");
          var checkIfPlayersExist = setInterval(
            function() {
              let disconnected = checkDisconnected();
              if (disconnected) {
                sendResponse(
                  {
                    players: [],
                    tabId: request.tabId
                  }
                );
              }

              if ($(".player").length >= 1) {
                console.debug(prefix + "Players exist");

                let playersArray = [];
                $(".player").each(
                  function() {
                    let playerName = $(this).find(".name").html();
                    if (playerName !== null && playerName !== "" && !(playersArray.includes(playerName))) {
                      playersArray.push(playerName);
                    }
                  }
                );

                clearInterval(checkIfPlayersExist);
                console.debug(prefix + `Sending playersArray: ${playersArray.toString()}`);
                sendResponse(
                  {
                    players: playersArray,
                    tabId: request.tabId
                  }
                );
              }
            },
            100
          );
        }
      }
    );
  }

  return true;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener(receiveRequest);

checkIfInGame();
