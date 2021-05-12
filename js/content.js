console.log("frienddl.io content script loaded");

console.log("Setting up c2b port");
let backgroundPort = chrome.runtime.connect(
  {
    name: "c2b"
  }
);

function checkDisconnected() {
  let disconnectButton = $("#modalDisconnect button:contains('Ok')");
  let disconnectVisible = disconnectButton.is(":visible");
  if (disconnectVisible) {
    console.log("Disconnected");
    disconnectButton.click();
    return true;
  } else {
    return false;
  }
}

function receiveRequest(request, sender, sendResponse) {
  console.log("Request received");
  console.dir(request);

  if (request.task === "scoreSearch") {
    if ( $('.player').length > 1) {
      $('.player').each(
        function() {
          let playerName = $(this).find(".name").html();

          if (playerName.includes("(You)")) {
            let score = $(this).find(".score").html().replace("Points: ", "");
            console.log(`Your current score is ${score}`);

            sendResponse(
              {
                score: score
              }
            );
          }
        }
      );
    } else {
      console.log("Player less than one; won't check score");
      sendResponse(
        {
          score: null
        }
      );
    }
  } else if (request.task === "friendSearch") {
    chrome.storage.local.get(
      [
        "state"
      ],
      function(response) {
        if (response.state === "search") {
          console.log("Waiting for play button");
          var checkIfPlayButtonExists = setInterval(
            function() {
              if ($("button[type='submit']").length >= 2) {
                console.log("Play button exists, clicking now");

                let playButton = $("button[type='submit']")[0];
                console.log("Clicking play button");
                playButton.click();
                clearInterval(checkIfPlayButtonExists);
              } else {
                console.log("Play button doesn't exist");
              }
            },
            100
          );

          console.log("Waiting for players");
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

              if ($('.player').length >= 2) {
                console.log("Players exist");

                let playersArray = [];
                $('.player').each(
                  function() {
                    let playerName = $(this).find(".name").html();
                    if (playerName !== null && playerName !== "" && !(playersArray.includes(playerName))) {
                      playersArray.push(playerName);
                    }
                  }
                );

                clearInterval(checkIfPlayersExist);
                console.log(`Sending response with playersArray: ${playersArray.toString()}`);
                sendResponse(
                  {
                    players: playersArray,
                    tabId: request.tabId
                  }
                );
              } else {
                console.log("Players don't exist");
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
