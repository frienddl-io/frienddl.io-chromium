const SKRIBBLIO_URL = "https://skribbl.io/";

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

    if (getFriendsArray().length === 0) {
      $("#friend-error").show();
    } else {
      chrome.storage.sync.set(
        {
          "status": "search"
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
              url: SKRIBBLIO_URL,
              state: "minimized"
            },
            function(window) {
              let currentTime = new Date().getTime();
              chrome.storage.sync.set(
                {
                  "windowId": window.id,
                  "gamesJoined": 0,
                  "startTime": currentTime,
                  "endTime": -1,
                  "runTime": -1,
                  "playersFound": []
                }, function() {
                  let tabId = window.tabs[0].id;
                  console.log("tabId: " + tabId);
                  joinNewGameAfterPageLoad(tabId);
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

        if (getFriendsArray().length === 0) {
          $("#friend-error").show();
        } else {
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
                  refreshTab(tabId);
                }
              );
            }
          );
        }
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

  // Steps to take when a new game needs to be joined
  function joinNewGameAfterPageLoad(correctTabId) {
    let alive = true;
    chrome.tabs.onUpdated.addListener(
      function(tabId, changeInfo, tab) {
        if (alive) {
              chrome.storage.sync.get(
                [
                  "status"
                ],
                function(response) {
              if (
                response.status === "search"
                && tabId === correctTabId
                && tab.url.indexOf(SKRIBBLIO_URL) != -1
                && changeInfo.status == 'complete'
              )
              {
                console.log("Sending message to join new game");
                alive = false;
                chrome.tabs.sendMessage(
                  tabId,
                  {
                    tabId: tabId
                  },
                  respondToContent
                );
              }
            }
          );
        } else {
          return;
        }
      }
    );
  }

  // Processes the response from the content of a game
  function respondToContent(response) {
    updateStorage();

    if (response === null) {
      console.log("Response was null");
    } else {
      console.log("Searching players for friends");

      let playersArray = response.players;
      console.dir(`playersArray: ${playersArray.toString()}`);
      let tabId = response.tabId;

      if (playersArray.length > 1) {
        updatePlayersFound(playersArray);

        let friendsFound = [];
        let friendsArray = getFriendsArray();

        for (const friend of friendsArray) {
          if (playersArray.includes(friend)) {
            friendsFound.push(friend);
          }
        }

        if (friendsFound.length === 0) {
          console.log("No friends found");
          refreshTab(tabId);
        } else {
          foundFriend(friendsFound, tabId);
        }
      } else {
        console.log("Only 1 players was found");
        refreshTab(tabId);
      }
    }
  }

  // Updates values in storage
  function updateStorage() {
    chrome.storage.sync.get(
      [
        "gamesJoined",
        "startTime",
        "runTime",
        "totalGamesJoined"
      ],
      function(response) {
        console.dir(response);
        let newGamesJoined = response.gamesJoined + 1;
        $("#games-joined").text(newGamesJoined);

        let startTime = response.startTime;
        let newRunTime = new Date().getTime() - startTime;
        $("#run-time").text(msToTime(newRunTime));

        let newTotalGamesJoined = 1;
        if (typeof response.totalGamesJoined !== 'undefined') {
          newTotalGamesJoined += response.totalGamesJoined;
        }

        chrome.storage.sync.set(
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
  function updatePlayersFound(playersArray) {
    chrome.storage.sync.get(
      [
        "playersFound",
        "totalPlayersSeen"
      ],
      function(response) {
        console.dir(response);

        let playersFound = response.playersFound;
        let newPlayersFound = [];
        playersArray.forEach(
          (element) => {
            console.log();
            if (playersFound.indexOf(element) === -1) {
              newPlayersFound.push(element);
            }
          }
        );

        let totalPlayersFound = newPlayersFound.concat(playersFound);

        let newTotalPlayersSeen = playersArray.length;
        if (typeof response.totalPlayersSeen !== 'undefined') {
          newTotalPlayersSeen += response.totalPlayersSeen;
        }

        chrome.storage.sync.set(
          {
            "playersFound": totalPlayersFound,
            "totalPlayersSeen": newTotalPlayersSeen
          }
        );

        $("#players-found").text(totalPlayersFound.length);
      }
    );
  }

  // Retrieves the friends entered
  function getFriendsArray() {
    let friendsArray = []
    Array.from(document.querySelector("#friends").children).forEach(
      (item, index) => {
        let friend = item.innerText.split(" ").slice(0, -1).join(" ");
        friendsArray.push(friend);
      }
    )

    return friendsArray;
  }


  // Refreshes a tab
  function refreshTab(tabId) {
    chrome.storage.sync.get(
      [
        "status"
      ],
      function(response) {
        if (response.status !== "pause") {
          console.log("Refreshing");
          chrome.tabs.reload(
            tabId,
            function() {
              console.log("Sending message to start new game");
              joinNewGameAfterPageLoad(tabId);
            }
          );
        }
      }
    );
  }

  // Steps to take when one or more friends are found
  function foundFriend(friendsArray, tabId) {
    stopSearch();
    console.log(`Friend(s) found: ${friendsArray.to_s}`);

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

    chrome.tabs.update(
      tabId,
      {
        active: true
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

  function wait(ms) {
    console.log("Waiting");
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
    }
  }
}, false);
