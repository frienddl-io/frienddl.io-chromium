const prefix = "frienddl.io | ";
console.log(prefix + "Content script loaded");

let backgroundPort = chrome.runtime.connect(
  {
    name: "c2b"
  }
);
console.log(prefix + "c2b port set up");

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

  if (task === "scoreSearch") {
    if ( $(".player").length > 1) {
      $(".player").each(
        function() {
          let playerName = $(this).find(".name").html();

          if (playerName.includes("(You)")) {
            let points = parseInt($(this).find(".score").html().replace("Points: ", ""));
            let round = parseInt($("#round")[0].innerText.split(" ").pop());
            console.log(prefix + `Sending points: ${points}`);

            sendResponse(
              {
                points: points,
                round: round,
                tabId: request.tabId
              }
            );
          }
        }
      );
    } else {
      console.log(prefix + "Player less than one; won't send score");
      sendResponse(
        {
          points: null
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

              if ($(".player").length >= 2) {
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
              } else {
                console.debug(prefix + "Players don't exist");
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
