console.log("frienddl.io popup script loaded");

// Hide elements based on the state
chrome.storage.local.get(
  [
    "state"
  ],
  function(response) {
    let state = response.state;
    if (response.state === undefined) {
      state = "stop";
    }
    console.log(`Friend finder search state: ${state}`);

    $(`.${state}-hidden`).addClass("hidden");
    if (state === "stop") {
      $("#stats").hide();
    }
  }
);

// Load translations
$("#friend-finder-tab").text(chrome.i18n.getMessage("friendFinderTabName"));
$("#friend-finder .description").text(chrome.i18n.getMessage("friendFinderDescription"));
$("#friend-input").attr("placeholder", chrome.i18n.getMessage("addFriendPlaceholder"));
$("#pencil").attr("alt", chrome.i18n.getMessage("altPencil"));
$("#add-friend-button").text(chrome.i18n.getMessage("addFriendButton"));
$("#minimized-text").text(chrome.i18n.getMessage("windowMinimized"));
$("#audio-alert-text").text(chrome.i18n.getMessage("audioAlert"));

$("#character-error").text(chrome.i18n.getMessage("characterError"));
$("#duplicate-error").text(chrome.i18n.getMessage("duplicateError"));
$("#friend-error").text(chrome.i18n.getMessage("friendError"));
$("#pause-instruction").text(chrome.i18n.getMessage("pauseInstruction"));

$(".spinner-icon").attr("alt", chrome.i18n.getMessage("altSpinner"));
$("#friend-finder .spinner-text").text(chrome.i18n.getMessage("searchText"));
$("#games-joined th").text(chrome.i18n.getMessage("gamesJoined"));
$("#players-found th").text(chrome.i18n.getMessage("playersFound"));
$("#run-time th").text(chrome.i18n.getMessage("runTime"));
$("#found-friend-title").text(chrome.i18n.getMessage("foundFriendSingular"));

$("#score-keeper-tab").text(chrome.i18n.getMessage("scoreKeeperTabName"));
$("#automatic-toggle-text").text(chrome.i18n.getMessage("scoreKeeperAutomatic"));
$("#manual-toggle-text").text(chrome.i18n.getMessage("scoreKeeperManual"));
$("#manual-update-button span").text(chrome.i18n.getMessage("scoreKeeperUpdateButton"));
$("#score-keeper .spinner-text").text(chrome.i18n.getMessage("updateText"));

$("#high-scores-header span").text(chrome.i18n.getMessage("highScores"));
$("#crown").attr("alt", chrome.i18n.getMessage("altCrown"));
$("#total-points-header span").text(chrome.i18n.getMessage("totalPoints"));
$("#rolling-die").attr("alt", chrome.i18n.getMessage("altRollingDie"));

$(".last-day th").text(chrome.i18n.getMessage("lastDay"));
$(".last-seven-days th").text(chrome.i18n.getMessage("lastSevenDays"));
$(".last-thirty-days th").text(chrome.i18n.getMessage("lastThirtyDays"));
$(".all-time th").text(chrome.i18n.getMessage("allTime"));

$("button.reset span").text(chrome.i18n.getMessage("resetButton"));
$(".reset-warning").text(chrome.i18n.getMessage("resetWarning"));

// Text for badge
const SUCCESS_BADGE_TEXT = "!";

// Colors for badge
const SEARCH_BADGE_COLOR = "#28a745";
const PAUSE_BADGE_COLOR = "#ffc107";
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

const DEFAULT_AVATAR = "<div id=\"loginAvatarCustomizeContainer\"><div id=\"buttonAvatarCustomizerRandomize\"></div><div class=\"avatarArrows\" id=\"loginAvatarArrowsLeft\"><div class=\"avatarArrow avatarArrowLeft\" data-avatarindex=\"1\"></div><div class=\"avatarArrow avatarArrowLeft\" data-avatarindex=\"2\"></div><div class=\"avatarArrow avatarArrowLeft\" data-avatarindex=\"0\"></div></div><div class=\"avatarContainer\"><div class=\"avatar avatar-fit\" id=\"loginAvatar\"><div class=\"color\" style=\"background-size: 960px 960px; background-position: -576px 0px;\"></div><div class=\"eyes\" style=\"background-size: 960px 960px; background-position: -864px -96px;\"></div><div class=\"mouth\" style=\"background-size: 960px 960px; background-position: -672px 0px;\"></div><div class=\"special\" style=\"display: none;\"></div></div></div><div class=\"avatarArrows\" id=\"loginAvatarArrowsLeft\"><div class=\"avatarArrow avatarArrowRight\" data-avatarindex=\"1\"></div><div class=\"avatarArrow avatarArrowRight\" data-avatarindex=\"2\"></div><div class=\"avatarArrow avatarArrowRight\" data-avatarindex=\"0\"></div></div></div>";

// Listen for changes to storage
chrome.storage.onChanged.addListener(
  function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      switch(key) {
        case "friendsFound":
          if (storageChange.newValue.length > 0) {
            foundFriend(storageChange.newValue);
          }
          break;
        case "gamesJoined":
          $("#games-joined td").text(storageChange.newValue.toLocaleString());
          break;
        case "playerName":
          $("#playerName").text(storageChange.newValue);
          break;
        case "playerAvatar":
          let playerAvatar = storageChange.newValue;
          if (playerAvatar === undefined || playerAvatar === null) {
            $("#playerAvatar").html(DEFAULT_AVATAR);
          } else {
            $("#playerAvatar").html(playerAvatar.toString());
          }
          break;
        case "playersFound":
          $("#players-found td").text(storageChange.newValue.length.toLocaleString());
          break;
        case "runTime":
          $("#run-time td").text(msToTime(storageChange.newValue));
          break;
        case "scoreKeeperSpinner":
          $("#score-keeper .spinner").addClass("hidden");
          $("#manual-update-button").prop("disabled", false);
          break;
        case "state":
          if (storageChange.newValue === "stop") {
            searchIsStopped();
          }
          break;
        case "audioAlert":
        case "currentTab":
        case "endTime":
        case "friends":
        case "totalFriendsFound":
        case "totalGamesJoined":
        case "startTime":
        case "totalPlayersSeen":
        case "totalRunTime":
        case "totalTimesSearched":
        case "windowId":
        case "windowMinimized":
          break;
        default:
          updateScoreKeeperValues();
          break;
      }
    }
  }
);

let language = chrome.i18n.getUILanguage().split("-")[0];
console.log(`Using language: ${language}`);
if (language === "fr") {
  $("#score-keeper th").css("width", "70%");
}

// Steps to take when one or more friends are found
function foundFriend(friendsArray) {
  updatePopupAndBadge("success");
  updateDisabledPropOfForm(false);

  if (friendsArray.length > 1) {
    $("#found-friend-title").text(chrome.i18n.getMessage("foundFriendPlural"));
  }
  $("#found-friend-p").text(friendsArray.join(", "));

  chrome.storage.local.get(
    [
      "runTime"
    ],
    function(response) {
      $("#run-time td").text(msToTime(response.runTime));
    }
  );

  $("#found-friend").removeClass("hidden");
}

// Steps to take when searching has been stopped
function searchIsStopped() {
  updatePopupAndBadge("stop");
  updateDisabledPropOfForm(false);
}

// Updates the popup to a predefined HTML file
function updatePopupAndBadge(state) {
  let found = false;

  console.log(`Making popup & badge updates for: ${state}`)
  switch(state) {
    case "search":
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: SEARCH_BADGE_COLOR
        }
      );
      found = true;
      break;
    case "pause":
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: PAUSE_BADGE_COLOR
        }
      );
      found = true;
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
      found = true;
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
      found = true;
      break;
  }

  if (found) {
    let states = [
      "search",
      "pause",
      "stop",
      "success"
    ];

    // Credit: https://stackoverflow.com/questions/3954438/how-to-remove-item-from-array-by-value
    Array.prototype.remove = function() {
      var what, a = arguments, L = a.length, ax;
      while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
      }
      return this;
    };

    states.remove(state);

    let statesAsClasses = states.map(
      function(element) {
        return "." + element + "-hidden";
      }
    ).join(", ");

    console.log(`Remove hidden elements for other states: ${statesAsClasses}`);
    $(statesAsClasses).removeClass("hidden");

    let hiddenStateClass = `.${state}-hidden`;
    console.log(`Hiding elements based on the state: ${hiddenStateClass}`);
    $(hiddenStateClass).addClass("hidden");
  } else {
    console.error(`State to update popup invalid: ${state}`);
  }
}

// Updates all form elements to be either enabled or disabled
function updateDisabledPropOfForm(state, pause = false) {
  $("#friend-input").prop("disabled", state);
  $("#add-friend-button").prop("disabled", state);
  $("#friends button").prop("disabled", state);

  if (!pause) {
    $("#minimized-toggle").prop("disabled", state);
    $("#audio-alert-toggle").prop("disabled", state);
  }

  if (state) {
    $("#friends button").removeClass("enabled-friend-button");
  } else {
    $("#friends button").addClass("enabled-friend-button");
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

function updateScoreKeeperValues() {
  console.log("Updating score keeper values");
  chrome.storage.sync.get(
    [
      "oneDayHighScore",
      "sevenDayHighScore",
      "thirtyDayHighScore",
      "allTimeHighScore",
      "allTimeHighScoreTime"
    ],
    function(response) {
      let oneDayHighScore = response.oneDayHighScore || 0;
      let sevenDayHighScore = response.sevenDayHighScore || 0;
      let thirtyDayHighScore = response.thirtyDayHighScore || 0;
      let allTimeHighScore = response.allTimeHighScore || 0;

      $("#high-scores .last-day td").text(oneDayHighScore.toLocaleString());
      $("#high-scores .last-seven-days td").text(sevenDayHighScore.toLocaleString());
      $("#high-scores .last-thirty-days td").text(thirtyDayHighScore.toLocaleString());
      $("#high-scores .all-time td").text(allTimeHighScore.toLocaleString());

      let language = chrome.i18n.getUILanguage().split("-")[0];
      console.log(`Using language: ${language}`);

      let allTimeHighScoreTime = response.allTimeHighScoreTime;
      console.debug(`allTimeHighScoreTime: ${allTimeHighScoreTime}`);

      if (allTimeHighScoreTime !== null && allTimeHighScoreTime !== 0) {
        let formattedDate = new Intl.DateTimeFormat(language).format(allTimeHighScoreTime);
        console.debug(`formattedDate: ${formattedDate}`);
        $("#all-time-date td").text(formattedDate);
      }
    }
  );

  chrome.storage.sync.get(
    [
      "oneDayPoints",
      "sevenDayPoints",
      "thirtyDayPoints",
      "allTimePoints"
    ],
    function(response) {

      let oneDayPoints = response.oneDayPoints || 0;
      let sevenDayPoints = response.sevenDayPoints || 0;
      let thirtyDayPoints = response.thirtyDayPoints || 0;
      let allTimePoints = response.allTimePoints || 0;

      $("#total-points .last-day td").text(oneDayPoints.toLocaleString());
      $("#total-points .last-seven-days td").text(sevenDayPoints.toLocaleString());
      $("#total-points .last-thirty-days td").text(thirtyDayPoints.toLocaleString());
      $("#total-points .all-time td").text(allTimePoints.toLocaleString());
    }
  );

  $("#score-keeper .spinner").addClass("hidden");
}

document.addEventListener("DOMContentLoaded", function() {
  // Set values of friends and stats from storage on popup startup
  chrome.storage.local.get(
    [
      "friendsFound",
      "friends",
      "gamesJoined",
      "playersFound",
      "state",
      "startTime",
      "runTime",
      "windowMinimized",
      "audioAlert",
      "currentTab",
      "playerName",
      "playerAvatar"
    ],
    function(response) {
      if (response.currentTab === undefined || response.currentTab !== "score-keeper") {
        openTab("friend-finder");
      } else {
        openTab(response.currentTab);
      }

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
        $("#minimized-toggle").prop("checked", false);
      } else {
        console.log("Keeping minimized toggle checked");
      }

      if (response.audioAlert !== undefined && response.audioAlert === false) {
        console.log("Changing audio alert toggle to unchecked");
        $("#audio-alert-toggle").prop("checked", false);
      } else {
        console.log("Keeping audio alert toggle checked");
      }

      if (response.gamesJoined !== undefined) {
        $("#games-joined td").text(response.gamesJoined);
      }

      if (response.gamesJoined !== undefined) {
        $("#players-found td").text(response.playersFound.length);
      }

      let runtime = "";
      if (currentlySearching) {
        runtime = getCurrentRunTime(response.startTime);
      } else if (response.state === "pause") {
        runtime = response.runTime;
      }

      if (runtime !== "") {
        $("#run-time td").text(msToTime(runtime));
      }

      if (response.friendsFound !== undefined && response.friendsFound.length > 0) {
        foundFriend(response.friendsFound)
      }

      $("#playerName").text(response.playerName);

      let playerAvatar = response.playerAvatar;
      if (playerAvatar === undefined || playerAvatar === null) {
        $("#playerAvatar").html(DEFAULT_AVATAR);
      } else {
        $("#playerAvatar").html(playerAvatar.toString());
      }

      chrome.storage.sync.get(
        [
          "scoreKeeperAutomatic"
        ],
        function(response) {
          let scoreKeeperAutomatic = response.scoreKeeperAutomatic;
          console.debug(`scoreKeeperAutomatic: ${scoreKeeperAutomatic}`);

          if (scoreKeeperAutomatic !== false) {
            scoreKeeperAutomatic = true;
          }
          console.debug(`scoreKeeperAutomatic: ${scoreKeeperAutomatic}`);

          $("#score-keeper-type").prop("checked", scoreKeeperAutomatic);

          if (scoreKeeperAutomatic) {
            $("#score-keeper .description").text(chrome.i18n.getMessage("scoreKeeperAutomaticDescription"));
            $("#score-keeper #manual-update-button").css("display", "none");
          } else {
            $("#score-keeper .description").text(chrome.i18n.getMessage("scoreKeeperManualDescription"));
            $("#score-keeper #manual-update-button").css("display", "inline");
          }
          updateScoreKeeperValues();
        }
      );
    }
  );

  $(".tablinks").bind("click", openTab);

  function openTab(tabName) {
    console.log(`Opening tab: ${tabName}`);
    if (typeof tabName !== "string") {
      tabName = this.name;

      $("#tabs label").each(
        function() {
          $(this).removeClass("active");
        }
      );

      $(this).parent().addClass("active");

      chrome.storage.local.set(
        {
          "currentTab": tabName
        },
        function() {
          $(".tabContent").each(
            function() {
              $(this).css("display", "none");
            }
          );

          let tab = $(`#${tabName}`);
          tab.css("display", "block");
        }
      );
    } else {
      let label = $(`input[name="${tabName}"]`).parent();
      label.addClass("active");

      $(".tabContent").each(
        function() {
          $(this).css("display", "none");
        }
      );

      let tab = $(`#${tabName}`);
      tab.css("display", "block");
    }
  }

  // Check for enter press on friend input
  $("#friend-input").keypress(
    function(event) {
      let keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode == "13") {
        console.log("Enter was pressed on input");
        addFriend();
      }
    }
  );

  // Listen for button that adds a friend
  $("#add-friend-button").bind("click", addFriend);

  // Steps to take when a friend is to be added
  function addFriend() {
    this.blur();
    console.log("User wants to add friend");
    $("#friend-error").hide();

    let friendName = $("#friend-input").val();
    if (friendName === "") {
      $("#character-error").show();
    } else {
      $("#character-error").hide();
      $("#friend-input").val("");

      friendName = friendName.replace(",", "");

      let id = `${friendName}-entered`;
      let exists = $(`#${id}`).length !== 0;

      if (!exists) {
        $("#duplicate-error").hide();
        console.log(`Adding friend: ${friendName}`);

        chrome.storage.local.get(
          [
            "friends"
          ],
          function(response) {
            let friendsArray = [];
            if (response.friends !== undefined) {
              friendsArray = friendsArray.concat(response.friends);
            }

            friendsArray.push(friendName);
            chrome.storage.local.set(
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
    document.querySelector("#friends").append(btn);
  }

  // Removes a button for a friend and updates storage
  function removeFriend() {
    let friendName = getFriendNameFromButton(this);
    console.log(`Removing friend: ${friendName}`);
    this.parentElement.removeChild(this);

    chrome.storage.local.get(
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

        chrome.storage.local.set(
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
    let checked = $(this).is(":checked");
    console.log(`Setting windowMinimized to ${checked}`);
    chrome.storage.local.set(
      {
        "windowMinimized": checked
      }
    );
  }

  // Listen for audio alert toggle
  $("#audio-alert-toggle").bind("click", audioAlertToggled);

  function audioAlertToggled() {
    let checked = $(this).is(":checked");
    console.log(`Setting audioAlert to ${checked}`);
    chrome.storage.local.set(
      {
        "audioAlert": checked
      }
    );
  }

  // Listen for button that starts search
  $("#start-button").bind("click", startSearch);

  // Steps to take when searching needs to be started
  function startSearch() {
    this.blur();
    console.log("User wants to start search");

    $("#character-error").hide();
    $("#duplicate-error").hide();

    let friendsArray = getFriendsEntered();

    if (friendsArray.length === 0) {
      $("#friend-error").show();
    } else {
      console.log("Starting search");
      updatePopupAndBadge("search");
      $("#stats").show();
      chrome.storage.local.set(
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

          $("#players-found td").text(0);
          $("#games-joined td").text(0);
          $("#run-time td").text("00:00.0");

          chrome.storage.local.get(
            [
              "totalTimesSearched"
            ],
            function(response) {
              let newTotalTimesSearched = 1;

              if (response.totalTimesSearched !== undefined) {
                newTotalTimesSearched += response.totalTimesSearched;
              }

              chrome.storage.local.set(
                {
                  "totalTimesSearched": newTotalTimesSearched
                }
              );
            }
          );

          let windowSettings = {};
          let minimizeChecked = $("#minimized-toggle").is(":checked");
          if (minimizeChecked) {
            console.log("Setting window to minimized");
            windowSettings["state"] = "minimized";
          }

          chrome.windows.create(
            windowSettings,
            function(window) {
              let currentTime = new Date().getTime();
              chrome.storage.local.set(
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

    chrome.storage.local.set(
      {
        "state": "pause"
      },
      function() {
        updateDisabledPropOfForm(false, true);

        chrome.storage.local.get(
          [
            "startTime"
          ],
          function(response) {
            let currentTime = new Date().getTime();
            chrome.storage.local.set(
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
    chrome.storage.local.set(
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
          chrome.storage.local.set(
            {
              "friends": friendsArray
            },
            function() {
              $("#friend-error").hide();

              chrome.storage.local.get(
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
    // Create port to send messages to background
    let backgroundPort = chrome.runtime.connect(
      {
        name: "p2b"
      }
    );

    console.log("Sending message to join new game");
    backgroundPort.postMessage(
      {
        windowId: windowId,
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

    chrome.storage.local.get(
      [
        "state",
        "startTime",
        "windowId"
      ],
      function(response) {
        let state = response.state;
        chrome.storage.local.set(
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
            chrome.storage.local.set(storageUpdate);

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

  // Listen for score keeper type toggle
  $("#score-keeper-type").bind("click", toggleScoreKeeperType);

  function toggleScoreKeeperType() {
    let toggleIsAutomatic = $("#score-keeper-type").is(":checked");
    console.log(`Toggling score keeper type: ${toggleIsAutomatic}`);

    chrome.storage.sync.set(
      {
        scoreKeeperAutomatic: toggleIsAutomatic
      }
    );

    if (toggleIsAutomatic) {
      $("#score-keeper .description").text(chrome.i18n.getMessage("scoreKeeperAutomaticDescription"));
      $("#score-keeper #manual-update-button").css("display", "none");
    } else {
      $("#score-keeper .description").text(chrome.i18n.getMessage("scoreKeeperManualDescription"));
      $("#score-keeper #manual-update-button").css("display", "inline");
    }
  }

  // Listen for score keeper type toggle
  $("#manual-update-button").bind("click", manualUpdateScoreKeeper);

  function manualUpdateScoreKeeper() {
    this.blur();
    $(this).prop("disabled", true);
    $("#score-keeper .spinner").removeClass("hidden");

    // Create port to send messages to background
    let backgroundPort = chrome.runtime.connect(
      {
        name: "p2b"
      }
    );

    console.log("Sending message to update score keeper");
    backgroundPort.postMessage(
      {
        task: "updateScoreKeeper"
      }
    );
  }

  // Listen for reset toggle
  $(".reset").bind("click", resetButtonClicked);

  function resetButtonClicked() {
    let firstClick = $(this).hasClass("btn-outline-warning");
    console.log(`firstClick: ${firstClick}`);

    let sectionId = $(this).parent()[0].id;
    console.log(`sectionId: ${sectionId}`);

    if (firstClick) {
      $(this).addClass("btn-outline-danger");
      $(this).removeClass("btn-outline-warning");
      $(`#${sectionId} .reset-warning.warning`).removeClass("hidden");
    } else {
      console.log("Resetting data");

      $(`#${sectionId} .reset-warning.warning`).addClass("hidden");

      let resetValues = {};

      function checkEmptyPoints(i) {
        return (i.points !== undefined || i.totalGamePoints !== undefined);
      }

      if (sectionId === "high-scores") {
        chrome.storage.sync.get(
          [
            "pointsArray"
          ],
          function(response) {
            function forEachDeleteTotalGamePoints(i) {
              delete i.totalGamePoints;
            }

            let pointsArray = response.pointsArray;
            if (pointsArray === undefined || pointsArray === null || pointsArray.length === 0) {
              console.debug("pointsArray is undefined, null, or 0");
            } else {
              pointsArray.forEach(forEachDeleteTotalGamePoints);
              pointsArray = pointsArray.filter(checkEmptyPoints);
            }

            resetValues = {
              pointsArray: pointsArray,
              oneDayHighScore: 0,
              oneDayHighScoreTime: 0,
              sevenDayHighScore: 0,
              sevenDayHighScoreTime: 0,
              thirtyDayHighScore: 0,
              thirtyDayHighScoreTime: 0,
              allTimeHighScore: 0,
              allTimeHighScoreTime: 0
            }

            chrome.storage.sync.set(resetValues);
          }
        );

        $("#all-time-date td").css("display", "none");
      } else if (sectionId === "total-points") {
        chrome.storage.sync.get(
          [
            "pointsArray"
          ],
          function(response) {
            function forEachDeletePoints(i) {
              delete i.points;
            }

            let pointsArray = response.pointsArray;
            if (pointsArray === undefined || pointsArray === null || pointsArray.length === 0) {
              console.debug("pointsArray is undefined, null, or 0");
            } else {
              pointsArray.forEach(forEachDeletePoints);
              pointsArray = pointsArray.filter(checkEmptyPoints);
            }

            resetValues = {
              pointsArray: pointsArray,
              oneDayPoints: 0,
              sevenDayPoints: 0,
              thirtyDayPoints: 0,
              allTimePoints: 0
            }

            chrome.storage.sync.set(resetValues);
          }
        );
      }

      $(`#${sectionId} .last-day td`).text(0);
      $(`#${sectionId} .last-seven-days td`).text(0);
      $(`#${sectionId} .last-thirty-days td`).text(0);
      $(`#${sectionId} .all-time td`).text(0);

      $(this).addClass("btn-outline-warning");
      $(this).removeClass("btn-outline-danger");
    }
  }
}, false);
