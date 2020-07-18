console.log("frienddl.io popup script loaded");

// Create port to send messages to background
let backgroundPort = chrome.runtime.connect(
  {
    name: "p2b"
  }
);

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const SEARCH_BADGE_COLOR = "#28a745";
const PAUSE_BADGE_COLOR = "#ffc107";
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

// Listen for changes to storage
chrome.storage.onChanged.addListener(
  function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      switch(key) {
        case "state":
          if (storageChange.newValue === "stop") {
            searchIsStopped();
          }
          break;
        case "friendsFound":
          if (storageChange.newValue.length > 0) {
            foundFriend(storageChange.newValue);
          }
          break;
        case "gamesJoined":
          $("#games-joined").text(storageChange.newValue);
          break;
        case "runTime":
          $("#run-time").text(msToTime(storageChange.newValue));
          break;
        case "playersFound":
          $("#players-found").text(storageChange.newValue.length);
          break;
      }
    }
  }
);

// Steps to take when one or more friends are found
function foundFriend(friendsArray) {
  updatePopupAndBadge("success");

  updateDisabledPropOfForm(false);
  $("#spinner").hide();
  $("#search-buttons").hide();
  $("#start-button").show();
  $("#minimized-toggle").prop("disabled", false);

  if (friendsArray.length > 1) {
    $("#found-friend-title").text("Friends");
  }
  $("#found-friend-p").text(friendsArray.join(", "));
  $("#found-friend").show();

  chrome.storage.sync.get(
    [
      "runTime"
    ],
    function(response) {
      $("#run-time").text(msToTime(response.runTime));
    }
  );
}

// Steps to take when searching has been stopped
function searchIsStopped() {
  $("#spinner").hide();
  $("#search-buttons").hide();
  updateDisabledPropOfForm(false);
  $("#start-button").show()
  $("#minimized-toggle").prop("disabled", false);
}

// Updates the popup to a predefined HTML file
function updatePopupAndBadge(state) {
  let popupFile = "";

  console.log(`Making popup & badge updates for: ${state}`)
  switch(state) {
    case "search":
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: SEARCH_BADGE_COLOR
        }
      );
      popupFile = "html/search.html";
      break;
    case "pause":
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: PAUSE_BADGE_COLOR
        }
      );
      popupFile = "html/pause.html";
      break;
    case "stop":
      chrome.browserAction.setBadgeText(
        {
          text: ""
        }
      );
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: STOP_BADGE_COLOR
        }
      );
      popupFile = "html/default.html";
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
      popupFile = "html/success.html";
      break;
  }
  if (popupFile !== "") {
    chrome.browserAction.setPopup(
      {
        popup: popupFile
      }
    );
  } else {
    console.error(`State to update popup invalid: ${state}`);
  }
}

// Updates all form elements to be either enabled or disabled
function updateDisabledPropOfForm(state) {
  $("#friend-input").prop("disabled", state);
  $("#add-friend").prop("disabled", state);
  $("#friends button").prop("disabled", state);

  if (state) {
    $("#friends button").removeClass("enabled-friend-button");
    $("#input-while-searching").show();
    $("#minimized-toggle").prop("disabled", state);
  } else {
    $("#friends button").addClass("enabled-friend-button");
    $("#input-while-searching").hide();
  }
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
  // Set values of friends and stats from storage on popup startup
  chrome.storage.sync.get(
    [
      "friendsFound",
      "friends",
      "gamesJoined",
      "playersFound",
      "state",
      "startTime",
      "runTime",
      "windowMinimized"
    ],
    function(response) {
      let currentlySearching = response.state === "search";
      let friendsArray = response.friends;
      if (friendsArray !== undefined) {
        friendsArray.forEach(
          function(friendName) {
            let id = `${friendName}-entered`;
            addFriendButton(id, friendName);
          }
        );

        if (currentlySearching) {
          updateDisabledPropOfForm(true);
        }
      }

      if (response.windowMinimized !== undefined && response.windowMinimized === false) {
        console.log("Changing minimized toggle to unchecked");
        $("#minimized-toggle").prop('checked', false);
      } else {
        console.log("Keeping minimized toggle checked");
      }

      if (response.gamesJoined !== undefined) {
        $("#games-joined").text(response.gamesJoined);
      }

      if (response.gamesJoined !== undefined) {
        $("#players-found").text(response.playersFound.length);
      }

      let runtime = "";
      if (currentlySearching) {
        runtime = getCurrentRunTime(response.startTime);
      } else if (response.state === "pause") {
        runtime = response.runTime;
      }

      if (runtime !== "") {
        $("#run-time").text(msToTime(runtime));
      }

      if (response.friendsFound !== undefined && response.friendsFound.length > 0) {
        foundFriend(response.friendsFound)
      }
    }
  );

  // Check for enter press on friend input
  $("#friend-input").keypress(
    function(event) {
      let keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        console.log("Enter was pressed on input");
        addFriend();
      }
    }
  );

  // Listen for button that adds a friend
  $("#add-friend").bind("click", addFriend);

  // Steps to take when a friend is to be added
  function addFriend() {
    this.blur();
    $("#friend-error").hide();

    let friendName = $("#friend-input").val();
    if (friendName === "") {
      $("#character-error").show();
    } else {
      $("#character-error").hide();
      $("#friend-input").val('');

      let id = `${friendName}-entered`;
      let exists = $(`#${id}`).length !== 0;

      if (!exists) {
        $("#duplicate-error").hide();
        console.log(`Adding friend: ${friendName}`);

        chrome.storage.sync.get(
          [
            "friends"
          ],
          function(response) {
            let friendsArray = [];
            if (response.friends !== undefined) {
              friendsArray = friendsArray.concat(response.friends);
            }

            friendsArray.push(friendName);
            chrome.storage.sync.set(
              {
                "friends": friendsArray
              },
              function() {
                addFriendButton(id, friendName);
              }
            );
          }
        );
      } else {
        console.log(`Friend has already been added: ${friendName}`);
        $("#duplicate-error").show();
      }
    }
  }

  // Creates a button for a friend
  function addFriendButton(id, friendName) {
    let btn = document.createElement("BUTTON");

    btn.id = id;
    btn.type = "button";
    btn.classList.add("btn");
    btn.classList.add("rounded");
    btn.classList.add("btn-outline-danger");
    btn.classList.add("friend-button");
    btn.classList.add("enabled-friend-button");

    btn.innerHTML = friendName + " <span aria-hidden='true'>&times;</span>";
    btn.onclick = removeFriend;

    console.log(`Adding friend button: ${friendName}`);
    document.querySelector('#friends').append(btn);
  }

  // Removes a button for a friend and updates storage
  function removeFriend() {
    let friendName = getFriendNameFromButton(this);
    console.log(`Removing friend: ${friendName}`);
    this.parentElement.removeChild(this);

    chrome.storage.sync.get(
      [
        "friends"
      ],
      function(response) {
        let friendsArray = response.friends;
        let newFriendsArray = [];

        for(let i = 0; i < friendsArray.length; i++) {
          if (friendsArray[i] !== friendName) {
            newFriendsArray.push(friendsArray[i])
          }
        }

        chrome.storage.sync.set(
          {
            "friends": newFriendsArray
          }
        )
      }
    );
  }

  // Listen for minimized toggle
  $("#minimized-toggle").bind("click", minimizeToggled);

  function minimizeToggled() {
    let checked = $(this).is(':checked');
    console.log(`Setting windowMinimized to ${checked}`);
    chrome.storage.sync.set(
      {
        "windowMinimized": checked
      }
    );
  }

  // Listen for button that starts search
  $("#start-button").bind("click", startSearch);

  // Steps to take when searching needs to be started
  function startSearch() {
    console.log("Starting search");

    this.blur();
    $("#character-error").hide();
    $("#duplicate-error").hide();

    let friendsArray = getFriendsEntered();

    if (friendsArray.length === 0) {
      $("#friend-error").show();
    } else {
      updatePopupAndBadge("search");
      chrome.storage.sync.set(
        {
          "friends": friendsArray,
          "state": "search",
          "gamesJoined": 0,
          "endTime": -1,
          "runTime": -1,
          "playersFound": [],
          "friendsFound": []
        },
        function() {
          $("#friend-error").hide();
          updateDisabledPropOfForm(true);

          $("#resume-col").hide();
          $("#pause-col").show();
          $("#stop-col").show();
          $("#search-buttons").show();
          $("#start-button").hide();
          $("#found-friend").hide();

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

              if (response.totalTimesSearched !== undefined) {
                newTotalTimesSearched += response.totalTimesSearched;
              }

              chrome.storage.sync.set(
                {
                  "totalTimesSearched": newTotalTimesSearched
                }
              );
            }
          );

          let windowSettings = {};
          let minimizeChecked = $("#minimized-toggle").is(':checked');
          if (minimizeChecked) {
            console.log("Setting window to minimized");
            windowSettings["state"] = "minimized";
          }

          chrome.windows.create(
            windowSettings,
            function(window) {
              let currentTime = new Date().getTime();
              chrome.storage.sync.set(
                {
                  "windowId": window.id,
                  "startTime": currentTime
                },
                function() {
                  joinNewGame(window.id, window.tabs[0].id);
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
    console.log("Pausing search");

    this.blur();
    updatePopupAndBadge("pause");

    chrome.storage.sync.set(
      {
        "state": "pause"
      },
      function() {
        updateDisabledPropOfForm(false);

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
                "endTime": currentTime,
                "runTime": getCurrentRunTime(response.startTime, currentTime)
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
    console.log("Resuming search");

    this.blur();
    updatePopupAndBadge("search");
    chrome.storage.sync.set(
      {
        "state": "search"
      },
      function() {
        updateDisabledPropOfForm(true)

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
                      joinNewGame(window.id, tabId);
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

  // Extracts the name of a friend from a button
  function getFriendNameFromButton(element) {
    return element.innerText.split(" ").slice(0, -1).join(" ");
  }

  // Retrieves the friends entered
  function getFriendsEntered() {
    let friendsArray = []
    Array.from(document.querySelector("#friends").children).forEach(
      (element, index) => {
        let friend = getFriendNameFromButton(element);
        friendsArray.push(friend);
      }
    )

    return friendsArray;
  }

  // Steps to take when a new game needs to be joined
  function joinNewGame(windowId, tabId) {
    console.log("Sending join new game message");
    backgroundPort.postMessage(
      {
        windowId: tabId,
        tabId: tabId,
        task: "joinNewGame"
      }
    );
  }

  // Listen for button that pauses search
  $("#stop-button").bind("click", stopSearch);

  // Steps to take when searching needs to be stopped
  function stopSearch() {
    console.log("Stopping search");

    this.blur();
    updatePopupAndBadge("stop");
    chrome.storage.sync.get(
      [
        "state",
        "startTime",
        "windowId"
      ],
      function(response) {
        let state = response.state;
        chrome.storage.sync.set(
          {
            "state": "stop"
          },
          function() {
            searchIsStopped();

            let currentTime = new Date().getTime();
            let storageUpdate = {
              "endTime": currentTime
            };
            if (state !== "pause") {
              console.log("Updating runTime");
              storageUpdate["runTime"] = getCurrentRunTime(response.startTime, currentTime)
            } else {
              console.log("Not updating runTime due to previous pause state");
            }
            chrome.storage.sync.set(storageUpdate);

            chrome.windows.remove(response.windowId);
          }
        );
      }
    );
  }

  // Returns the current run time
  function getCurrentRunTime(startTime, currentTime = undefined) {
    if (currentTime === undefined) {
      currentTime = new Date().getTime();
    }
    return currentTime - startTime;
  }
}, false);
