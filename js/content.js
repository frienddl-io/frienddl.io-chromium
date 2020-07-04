console.log("Frienddl.io content script loaded");

// chrome.runtime.onConnect.addListener(
//   function(port) {
//     if (port.name !== "b2c") {
//       console.log("Port is not b2c: " + port.name);
//     } else {
//       console.log("Port is b2c");
//       port.onMessage.addListener(
//         function(message) {
//           console.log("Message received");
//           console.dir(message);

//           console.log("Waiting for play button");
//           var checkIfPlayButtonExists = setInterval(
//             function() {
//               console.log("Checking if play button exists");
//               console.log($("button[type='submit']"));
//               if ($("button[type='submit']").length >= 2) {
//                 console.log("Play button exists, clicking now");

//                 let playButton = $("button[type='submit']")[0];
//                 console.log("Clicking play button");
//                 playButton.click();
//                 clearInterval(checkIfPlayButtonExists);
//               }
//             },
//             100
//           );

//           console.log("Waiting for players");
//           var checkIfPlayersExist = setInterval(
//             function() {
//               if ($('.player').length >= 2) {
//                 console.log("Players exist");

//                 let playersArray = [];
//                 $('.player').each(
//                   function() {
//                     let playerName = $(this).find(".name").html();
//                     if (playerName !== null && playerName !== "" && !(playersArray.includes(playerName))) {
//                       playersArray.push(playerName);
//                     }
//                   }
//                 );

//                 clearInterval(checkIfPlayersExist);
//                 console.log("playersArray: " + playersArray.toString());
//                 console.log("Sending response");
//                 sendResponse(
//                   {
//                     players: playersArray,
//                     tabId: message.tabId
//                   }
//                 );
//               }
//             },
//             100
//           );

//           return true;

//         }
//       );
//     }
//   }
// );

chrome.runtime.onMessage.addListener(receiveRequest);

function receiveRequest(request, sender, sendResponse) {
  if (request.task === "retrieveContent") {
    console.log("Request received");
    console.dir(request);

    console.log("Waiting for play button");
    var checkIfPlayButtonExists = setInterval(
      function() {
        console.log("Checking if play button exists");
        console.log($("button[type='submit']"));
        if ($("button[type='submit']").length >= 2) {
          console.log("Play button exists, clicking now");

          let playButton = $("button[type='submit']")[0];
          console.log("Clicking play button");
          playButton.click();
          clearInterval(checkIfPlayButtonExists);
        }
      },
      100
    );

    console.log("Waiting for players");
    var checkIfPlayersExist = setInterval(
      function() {
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
          console.log("playersArray: " + playersArray.toString());
          console.log("Sending response");
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
  } else {
    console.log("Ignoring request with task: " + request.task);
  }

  return true;
}
