const SKRIBBLIO_URL = "https://skribbl.io/";

let backgroundPort = chrome.runtime.connect(
  {
    name: "p2b"
  }
);

// chrome.runtime.onConnect.addListener(
//   function(port) {
//     if (port.name !== "b2p") {
//       console.log("Port is not b2p: " + port.name);
//     } else {
//       console.log("Port is b2p");
//       port.onMessage.addListener(
//         function(message) {
//           console.dir(message);

//           if (message.task === "getFriendsArray") {
//             return getFriendsArray();
//           }
//         }
//       );
//     }
//   }
// );

chrome.storage.onChanged.addListener(
  function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
        console.log('Storage key "%s" in namespace "%s" changed. ' +
                    'Old value was "%s", new value is "%s".',
                    key,
                    namespace,
                    storageChange.oldValue,
                    storageChange.newValue);
      let updated = false;
      switch(key) {
        case "gamesJoined":
          console.log("Updating games joined");
          $("#games-joined").text(storageChange.newValue);
          updated = true;
          break;
        case "runTime":
          console.log("Updating run time");
          $("#run-time").text(msToTime(storageChange.newValue));
          updated = true;
          break;
        case "playersFound":
          console.log("Updating players found");
          $("#players-found").text(storageChange.newValue.length);
          updated = true;
          break;
      }

      // if (updated) {
      //   chrome.browserAction.setPopup(
      //     {
      //       popup: "popup.html"
      //     }
      //   );
      // }
    }
  }
);

// chrome.runtime.onMessage.addListener(receiveRequest);

// function receiveRequest(request, sender, sendResponse) {
//   console.log("Request received");
//   console.dir(request);

//   if (request.task === "foundFriend") {
//     foundFriend(request.friendsArray);
//   } else if (request.task === "updateStats") {
//     updateStats();
//   }
// }

// function updateStats() {
//   chrome.storage.sync.get(
//     [
//       "gamesJoined",
//       "runTime",
//       "playersFound"
//     ],
//     function(response) {
//       $("#games-joined").text(response.gamesJoined);
//       $("#run-time").text(msToTime(response.runTime));
//       $("#players-found").text(playersFound.length);
//     }
//   );
// }

// Steps to take when one or more friends are found
function foundFriend(friendsArray) {
  if (friendsArray.length > 1) {
    $("#found-friend-title").text("Friends");
  }
  $("#found-friend-p").text(friendsArray.join(", "));
  $("#found-friend").show();

  chrome.storage.sync.get(
    [
      "startTime",
      "runTime",
      "totalFriendsFound",
      "totalRunTime"
    ],
    function(response) {
      let currentTime = new Date().getTime();
      let finalRunTime = currentTime - response.startTime;

      let newTotalFriendsFound = 1;
      if (typeof response.totalFriendsFound !== 'undefined') {
        newTotalFriendsFound += response.totalFriendsFound;
      }

      let newTotalRunTime = finalRunTime;
      if (typeof response.totalRunTime !== 'undefined') {
        newTotalRunTime += totalRunTime;
      }

      chrome.storage.sync.set(
        {
          "runTime": finalRunTime,
          "endTime": currentTime,
          "totalFriendsFound": newTotalFriendsFound,
          "totalRunTime": newTotalRunTime
        }
      );
      $("#run-time").text(msToTime(finalRunTime));
    }
  );
}

// Converts ms to a readable time format (MM:SS.M)
function msToTime(duration) {
  let milliseconds = parseInt((duration % 1000) / 100);
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);

  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return minutes + ":" + seconds + "." + milliseconds;
}

document.addEventListener("DOMContentLoaded", function () {
  // Check for enter press on input
  $("#friend-name").keypress(
    function(event) {
      let keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        console.log("Enter was pressed on input");
        addFriend();
      }
    }
  );

  // Listen for Add button click
  $("#add").bind("click", addFriend);

  // Steps to take when a friend is to be added
  function addFriend() {
    this.blur();
    $("#friend-error").hide();

    let friendName = $("#friend-name").val();
    if (friendName === "") {
      $("#character-error").show();
    } else {
      $("#character-error").hide();
      $("#friend-name").val('');
      let id = `${friendName}-entered`;
      console.log($(id));
      let exists = $(`#${id}`).length !== 0;

      if (!exists) {
        $("#duplicate-error").hide();
        let btn = document.createElement("BUTTON");

        btn.id = id;
        btn.type = "button";
        btn.classList.add("btn");
        btn.classList.add("rounded");
        btn.classList.add("btn-outline-danger");

        btn.innerHTML = friendName + " <span aria-hidden='true'>&times;</span>";
        btn.onclick = function () {
          console.log(`Removing friend: ${friendName}`);
          this.parentElement.removeChild(this);
        };

        console.log(`Adding friend: ${friendName}`);
        document.querySelector('#friends').append(btn);
      } else {
        console.log(`Friend has already been added: ${friendName}`);
        $("#duplicate-error").show();
      }
    }
  }

  // Listen for buttons that start search
  $("#start-button").bind("click", startSearch);

  // Steps to take for searching needs to be started
  function startSearch() {
    this.blur();
    $("#character-error").hide();
    $("#duplicate-error").hide();

    let friendsArray = getFriendsEntered();

    if (friendsArray === 0) {
      $("#friend-error").show();
    } else {
      chrome.storage.sync.set(
        {
          "friends": friendsArray,
          "status": "search",
          "gamesJoined": 0,
          "endTime": -1,
          "runTime": -1,
          "playersFound": []
        },
        function() {
          $("#friend-error").hide();

          $("#resume-col").hide();
          $("#pause-col").show();
          $("#stop-col").show();
          $("#search-buttons").show();
          $("#start-button").hide();

          $("#spinner").show();

          $("#players-found").text(0);
          $("#games-joined").text(0);
          $("#run-time").text("00:00.0");
          $("#stats").show();


          chrome.storage.sync.get(
            [
              "totalTimesSearched"
            ],
            function(response) {
              let newTotalTimesSearched = 1;
              if (typeof response.totalTimesSearched !== 'undefined') {
                newTotalTimesSearched += response.totalTimesSearched;
              }

              chrome.storage.sync.set(
                {
                  "totalTimesSearched": newTotalTimesSearched
                }
              );
            }
          );

          chrome.windows.create(
            {
              // state: "minimized"
            },
            function(window) {
              let currentTime = new Date().getTime();
              chrome.storage.sync.set(
                {
                  "windowId": window.id,
                  "startTime": currentTime
                },
                function() {
                  joinNewGame(window.tabs[0].id);
                }
              );
            }
          );
        }
      );
    }
  }

  // Listen for button that pauses search
  $("#pause-button").bind("click", pauseSearch);

  // Steps to take when searching needs to be paused
  function pauseSearch() {
    this.blur();
    chrome.storage.sync.set(
      {
        "status": "pause"
      },
      function() {
        console.log("Pausing search");

        $("#spinner").hide();
        $("#pause-col").hide();
        $("#resume-col").show();

          chrome.storage.sync.get(
            [
              "startTime"
            ],
            function(response) {
            let currentTime = new Date().getTime();
            chrome.storage.sync.set(
              {
                "runTime": currentTime - response.startTime
              }
            );
          }
        );
      }
    );
  }

  // Listen for button that resumes search
  $("#resume-button").bind("click", resumeSearch);

  // Steps to take when searching needs to be resumed
  function resumeSearch() {
    this.blur();
    chrome.storage.sync.set(
      {
        "status": "search"
      },
      function() {
        console.log("Resuming search");

        $("#character-error").hide();
        $("#duplicate-error").hide();

        let friendsArray = getFriendsEntered();

        if (friendsArray === 0) {
          $("#friend-error").show();
        } else {
          chrome.storage.sync.set(
            {
              "friends": friendsArray
            },
            function() {
              $("#friend-error").hide();

              $("#resume-col").hide();
              $("#pause-col").show();
              $("#spinner").show();

              chrome.storage.sync.get(
                [
                  "windowId"
                ],
                function(response) {
                  chrome.windows.get(
                    response.windowId,
                    {
                      "populate": true
                    },
                    function(window) {
                      let tabId = window.tabs[0].id;
                      console.log("tabId: " + tabId);
                      joinNewGame(tabId);
                    }
                  );
                }
              );
            }
          );
        }
      }
    );
  }

  // Retrieves the friends entered
  function getFriendsEntered() {
    let friendsArray = []
    Array.from(document.querySelector("#friends").children).forEach(
      (item, index) => {
        let friend = item.innerText.split(" ").slice(0, -1).join(" ");
        friendsArray.push(friend);
      }
    )

    return friendsArray;
  }

  // Steps to take when a new game needs to be joined
  function joinNewGame(tabId) {
    console.log("Sending join new game message");
    backgroundPort.postMessage(
      {
        tabId: tabId,
        task: "joinNewGame"
      }
    );
  }

  // Listen for button that pauses search
  $("#stop-button").bind("click", stopSearch);

  // Steps to take when searching needs to be stopped
  function stopSearch() {
    this.blur();
    chrome.storage.sync.set(
      {
        "status": "stop"
      },
      function() {
        console.log("Stopping search");

        $("#spinner").hide();
        $("#search-buttons").hide();
        $("#start-button").show();

        chrome.storage.sync.get(
          [
            "startTime",
            "windowId"
          ],
          function(response) {
            let currentTime = new Date().getTime();
            chrome.storage.sync.set(
              {
                "endTime": currentTime,
                "runTime": currentTime - response.startTime
              }
            );
            chrome.windows.remove(response.windowId);
          }
        );
      }
    );
  }
  // Creates a new tab - not used currently
  function createTab(windowId) {
    return new Promise(
      resolve => {
        chrome.tabs.create(
          {
            windowId: id,
            url: SKRIBBLIO_URL,
            active: false
          },
          async tab => {
            chrome.tabs.onUpdated.addListener(
              function listener (tabId, info) {
                if (info.status === 'complete' && tabId === tab.id) {
                  chrome.tabs.onUpdated.removeListener(listener);
                  resolve(tab);
                }
              }
            );
          }
        );
      }
    );
  }

  function wait(ms) {
    console.log("Waiting");
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
    }
  }
}, false);
