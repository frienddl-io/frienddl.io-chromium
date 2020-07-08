console.log("Frienddl.io popup script loaded");

// Create port to send messages to background
let backgroundPort = chrome.runtime.connect(
  {
    name: "p2b"
  }
);

// Colors for badge
const SEARCH_BADGE_COLOR = {
  color: "#28a745"
};
const PAUSE_BADGE_COLOR = {
  color: "#ffc107"
};
const STOP_BADGE_COLOR = {
  color: "#dc3545"
};
const SUCCESS_BADGE_COLOR = {
  color: "#007bff"
};

// Listen for changes to storage
chrome.storage.onChanged.addListener(
  function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      switch(key) {
        case "foundFriends":
          foundFriend(storageChange.newValue);
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
  updatePopup("success");
  chrome.browserAction.setBadgeBackgroundColor(SUCCESS_BADGE_COLOR);

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
      "friends",
      "gamesJoined",
      "playersFound",
      "state",
      "startTime",
      "runTime"
    ],
    function(response) {
      let friendsArray = response.friends;
      if (friendsArray !== undefined) {
        friendsArray.forEach(
          function(friendName) {
            console.log(friendName);
            let id = `${friendName}-entered`;
            addFriendButton(id, friendName);
          }
        );

        if (response.state === "search") {
          updateDisabledPropOfForm(true);
        }
      }

      if (response.gamesJoined !== undefined) {
        $("#games-joined").text(response.gamesJoined);
      }

      if (response.gamesJoined !== undefined) {
        $("#players-found").text(response.playersFound.length);
      }

      let runtime = "";
      if (response.state === "search") {
        runtime = getCurrentRunTime(response.startTime);
      } else if (response.state === "pause") {
        runtime = response.runTime;
      }

      if (runtime !== "") {
        $("#run-time").text(msToTime(runtime));
      }
    }
  );

  // Check for enter press on friend input
  $("#friend-name").keypress(
    function(event) {
      let keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == '13') {
        console.log("Enter was pressed on input");
        addFriend();
      }
    }
  );

  // Listen for button that adds a friend
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
      console.log("Checking exists");
      let exists = $(`#${id}`).length !== 0;

      if (!exists) {
        $("#duplicate-error").hide();
        chrome.storage.sync.get(
          [
            "friends"
          ],
          function(response) {
            let friendsArray = [];
            if (friendsArray !== undefined) {
              friendsArray.concat(response.friends);
            }

            friendsArray.push(friendName);
            chrome.storage.sync.set(
              {
                "friends": friendsArray
              },
              function() {
                console.log("Adding friend");
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
      updatePopup("search");
      chrome.storage.sync.set(
        {
          "friends": friendsArray,
          "state": "search",
          "gamesJoined": 0,
          "endTime": -1,
          "runTime": -1,
          "playersFound": []
        },
        function() {
          $("#friend-error").hide();
          updateDisabledPropOfForm(true);

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
            {},
            function(window) {
              let currentTime = new Date().getTime();
              chrome.storage.sync.set(
                {
                  "windowId": window.id,
                  "startTime": currentTime
                },
                function() {
                  chrome.browserAction.setBadgeBackgroundColor(SEARCH_BADGE_COLOR);
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
    console.log("Pausing search");

    this.blur();
    updatePopup("pause");
    chrome.browserAction.setBadgeBackgroundColor(PAUSE_BADGE_COLOR);
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
            chrome.storage.sync.set(
              {
                "runTime": getCurrentRunTime(response.startTime)
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
    updatePopup("search");
    chrome.browserAction.setBadgeBackgroundColor(SEARCH_BADGE_COLOR);
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
    console.log("Stopping search");

    this.blur();
    updatePopup("stop");
    chrome.browserAction.setBadgeBackgroundColor(STOP_BADGE_COLOR);
    chrome.storage.sync.set(
      {
        "state": "stop"
      },
      function() {
        console.log("Stopping search");

        $("#spinner").hide();
        $("#search-buttons").hide();
        updateDisabledPropOfForm(false);
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
                "runTime": getCurrentRunTime(response.startTime, currentTime)
              }
            );
            chrome.windows.remove(response.windowId);
          }
        );
      }
    );
  }

  // Updates all form elements to be either enabled or disabled
  function updateDisabledPropOfForm(state) {
    $("#friend-name").prop("disabled", state);
    $("#add").prop("disabled", state);
    $("#friends button").prop("disabled", state);

    if (state) {
      $("#friends button").removeClass("enabled-friend-button");
    } else {
      $("#friends button").addClass("enabled-friend-button");
    }
  }

  // Updates the popup to a predefined HTML file
  function updatePopup(state) {
    let popupFile = "";

    switch(state) {
      case "search":
        popupFile = "html/search.html";
        break;
      case "pause":
        popupFile = "html/pause.html";
        break;
      case "stop":
        popupFile = "html/default.html";
        break;
      case "success":
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
      console.log(`State invalid: ${state}`);
    }
  }

  // Returns the current run time
  function getCurrentRunTime(startTime, currentTime = undefined) {
    if (currentTime === undefined) {
      currentTime = new Date().getTime();
    }
    return currentTime - startTime;
  }
}, false);
