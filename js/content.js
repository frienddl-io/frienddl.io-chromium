console.log('Frienddlio content script loaded');
// let TAB_ID = -1;
// let SEND_RESPONSE;
// chrome.extension.onMessage.addListener(startScribblioGame);

chrome.runtime.onMessage.addListener(receiveRequest);

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

function receiveRequest(request, sender, sendResponse) {
  console.log("Request received");
  console.dir(request);

  // TAB_ID = request.tabId;
  // SEND_RESPONSE = sendResponse;

  // window.addEventListener("load", function() {
    // function startScribblioGame(request, sender, sendResponse) {
      // console.log("Request received");
      // console.dir(request);

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

      console.log("Now I will wait for players");

      let playersArray = [];
      var checkIfPlayersExist = setInterval(
        function() {
          if ($('.player').length >= 2) {
            console.log("Players exist");

            $('.player').each(
              function() {
                // console.log($(this).find(".name").html());
                let playerName = $(this).find(".name").html();
                // console.log(playerName);
                if (playerName !== null && playerName !== "" && !(playersArray.includes(playerName))) {
                  playersArray.push(playerName);
                }
              }
            );

            clearInterval(checkIfPlayersExist);
            console.log("playersArray: " + playersArray.toString());
            console.log("Sending response");
            // wait(5000);
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
    // });

  return true;
}

// window.addEventListener("load", function() {
// // function startScribblioGame(request, sender, sendResponse) {
//   // console.log("Request received");
//   // console.dir(request);

//   var checkIfPlayButtonExists = setInterval(
//     function() {
//       console.log("Checking if play button exists");
//       console.log($("button[type='submit']"));
//       if ($("button[type='submit']").length >= 2) {
//         console.log("Play button exists, clicking now");

//         let playButton = $("button[type='submit']")[0];
//         console.log("Clicking play button");
//         playButton.click();
//         clearInterval(checkIfPlayButtonExists);
//       }
//     },
//     100
//   );

//   console.log("Now I will wait for players");

//   let playersArray = [];
//   var checkIfPlayersExist = setInterval(
//     function() {
//       if ($('.player').length >= 2) {
//         console.log("Players exist");

//         $('.player').each(
//           function() {
//             let playerName = $(this).find(".name").html();
//             // console.log(playerName);
//             if (playerName !== "" && !(playersArray.includes(playerName))) {
//               playersArray.push(playerName);
//             }
//           }
//         );

//         clearInterval(checkIfPlayersExist);
//         SEND_RESPONSE(
//           {
//             players: playersArray,
//             tabId: TAB_ID
//           }
//         );
//       }
//     },
//     100
//   );
// });

// chrome.runtime.onMessage.addListener(
//   function (request, sender, sendResponse) {
    // console.dir(request);
    // console.log("I am going to click play");
    // let playButton = $("button[type='submit']")[0];
    // playButton.click();

    // console.log("Now I will wait for players");

    // let playersArray = [];
    // var checkExist = setInterval(
    //   function() {
    //     if ($('.player').length >= 2) {
    //       console.log("Exists!");

    //       $('.player').each(
    //         function() {
    //           let playerName = $(this).find(".name").html();
    //           // console.log(playerName);
    //           if (playerName !== "" && !(playersArray.includes(playerName))) {
    //             playersArray.push(playerName);
    //           }
    //         }
    //       );

    //       clearInterval(checkExist);
    //       console.log(playersArray);
    //       console.log("Sending response");
    //       sendResponse(
    //         {
    //           players: playersArray
    //         }
    //       );
    //     }
    //   },
    //   100
    // );

    // sendResponse(
    //   {
    //     players: playersArray
    //   }
    // );
  // }
// );
