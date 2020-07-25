// Text for badge
const SUCCESS_BADGE_TEXT = "!";
const STOP_BADGE_TEXT = "";

// Colors for badge
const SEARCH_BADGE_COLOR = "#28a745";
const PAUSE_BADGE_COLOR = "#ffc107";
const STOP_BADGE_COLOR = "#dc3545";
const SUCCESS_BADGE_COLOR = "#17A2B8";

export class Popup {
  constructor() {
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
        console.log(`state: ${state}`);

        $(`.${state}-hidden`).addClass("hidden");
        if (state === "stop") {
          $("#stats").hide();
        }
      }
    );

    // Load translations
    $("#instructions").text(chrome.i18n.getMessage("instructions"));
    $("#friend-input").attr("placeholder", chrome.i18n.getMessage("addFriendPlaceholder"));
    $("#pencil").attr("alt", chrome.i18n.getMessage("altPencil"));
    $("#add-friend-button").text(chrome.i18n.getMessage("addFriendButton"));
    $("#minimized-text").text(chrome.i18n.getMessage("windowMinimized"));

    $("#character-error").text(chrome.i18n.getMessage("characterError"));
    $("#duplicate-error").text(chrome.i18n.getMessage("duplicateError"));
    $("#friend-error").text(chrome.i18n.getMessage("friendError"));
    $("#pause-instruction").text(chrome.i18n.getMessage("pauseInstruction"));

    $("#spinner-icon").attr("alt", chrome.i18n.getMessage("altSpinner"));
    $("#spinner-text").text(chrome.i18n.getMessage("searchText"));
    $("#games-joined th").text(chrome.i18n.getMessage("gamesJoined"));
    $("#players-found th").text(chrome.i18n.getMessage("playersFound"));
    $("#run-time th").text(chrome.i18n.getMessage("runTime"));
    $("#found-friend-title").text(chrome.i18n.getMessage("foundFriendSingular"));

    // Listen for changes to storage
    chrome.storage.onChanged.addListener(
      function(changes, namespace) {
        for (let key in changes) {
          let storageChange = changes[key];
          switch(key) {
            case "state":
              if (storageChange.newValue === "stop") {
                Popup.searchIsStopped();
              }
              break;
            case "friendsFound":
              if (storageChange.newValue.length > 0) {
                Popup.foundFriend(storageChange.newValue);
              }
              break;
            case "gamesJoined":
              $("#games-joined td").text(storageChange.newValue);
              break;
            case "runTime":
              $("#run-time td").text(Popup.msToTime(storageChange.newValue));
              break;
            case "playersFound":
              $("#players-found td").text(storageChange.newValue.length);
              break;
          }
        }
      }
    );
  }

  // Steps to take when one or more friends are found
  static foundFriend(friendsArray) {
    Popup.stateUpdates("success");
    Popup.updateDisabledPropOfForm(false);

    if (friendsArray.length > 1) {
      $("#found-friend-title").text(chrome.i18n.getMessage("foundFriendPlural"));
    }
    $("#found-friend-p").text(friendsArray.join(", "));

    chrome.storage.local.get(
      [
        "runTime"
      ],
      function(response) {
        $("#run-time td").text(Popup.msToTime(response.runTime));
      }
    );
  }

  // Steps to take when searching has been stopped
  static searchIsStopped() {
    Popup.stateUpdates("stop");
    Popup.updateDisabledPropOfForm(false);
  }

  // Updates the popup based on the state
  static stateUpdates(state) {
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
            text: STOP_BADGE_TEXT
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
  static updateDisabledPropOfForm(state, pause = false) {
    $("#friend-input").prop("disabled", state);
    $("#add-friend-button").prop("disabled", state);
    $("#friends button").prop("disabled", state);

    if (!pause) {
      $("#minimized-toggle").prop("disabled", state);
    }

    if (state) {
      $("#friends button").removeClass("enabled-friend-button");
    } else {
      $("#friends button").addClass("enabled-friend-button");
    }
  }

  // Converts ms to a readable time format (MM:SS.M)
  static msToTime(duration) {
    let milliseconds = parseInt((duration % 1000) / 100);
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds + "." + milliseconds;
  }

  onLoad() {
    // Set values of friends and stats from storage
    chrome.storage.local.get(
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
            function (friendName) {
              let id = `${friendName}-entered`;
              Popup.addFriendButton(id, friendName);
            }
          );

          if (currentlySearching) {
            Popup.updateDisabledPropOfForm(true);
          }
        }

        if (response.windowMinimized !== undefined && response.windowMinimized === false) {
          console.log("Changing minimized toggle to unchecked");
          $("#minimized-toggle").prop('checked', false);
        } else {
          console.log("Keeping minimized toggle checked");
        }

        if (response.gamesJoined !== undefined) {
          $("#games-joined td").text(response.gamesJoined);
        }

        if (response.gamesJoined !== undefined) {
          $("#players-found td").text(response.playersFound.length);
        }

        let runtime = "";
        if (currentlySearching) {
          runtime = Popup.getCurrentRunTime(response.startTime);
        } else if (response.state === "pause") {
          runtime = response.runTime;
        }

        if (runtime !== "") {
          $("#run-time td").text(Popup.msToTime(runtime));
        }

        if (response.friendsFound !== undefined && response.friendsFound.length > 0) {
          Popup.foundFriend(response.friendsFound)
        }
      }
    );

    // Check for enter press on friend input
    $("#friend-input").keypress(
      function(event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
          console.log("Enter was pressed on input");
          Popup.addFriend();
        }
      }
    );

    // Listen for button that adds a friend
    $("#add-friend-button").bind("click", Popup.addFriend);

    // Listen for minimized toggle
    $("#minimized-toggle").bind("click", Popup.minimizeToggled);

    // Listen for button that starts search
    $("#start-button").bind("click", Popup.startSearch);

    // Listen for button that pauses search
    $("#pause-button").bind("click", Popup.pauseSearch);

    // Listen for button that resumes search
    $("#resume-button").bind("click", Popup.resumeSearch);

    // Listen for button that pauses search
    $("#stop-button").bind("click", Popup.stopSearch);
  }

  // Steps to take when a friend is to be added
  static addFriend() {
    $("#add-friend-button").blur();
    console.log("User wants to add friend");
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
                Popup.addFriendButton(id, friendName);
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
  static addFriendButton(id, friendName) {
    let btn = document.createElement("BUTTON");

    btn.id = id;
    btn.type = "button";
    btn.classList.add("btn");
    btn.classList.add("rounded");
    btn.classList.add("btn-outline-danger");
    btn.classList.add("friend-button");
    btn.classList.add("enabled-friend-button");

    btn.innerHTML = friendName + " <span aria-hidden='true'>&times;</span>";
    btn.onclick = Popup.removeFriend;

    console.log(`Adding friend button: ${friendName}`);
    document.querySelector('#friends').append(btn);
  }

  // Removes a button for a friend and updates storage
  static removeFriend() {
    let friendName = Popup.getFriendNameFromButton(this);
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

  static minimizeToggled() {
    let checked = $(this).is(':checked');
    console.log(`Setting windowMinimized to ${checked}`);
    chrome.storage.local.set(
      {
        "windowMinimized": checked
      }
    );
  }

  // Steps to take when searching needs to be started
  static startSearch() {
    this.blur();
    console.log("User wants to start search");

    $("#character-error").hide();
    $("#duplicate-error").hide();

    let friendsArray = Popup.getFriendsEntered();

    if (friendsArray.length === 0) {
      $("#friend-error").show();
    } else {
      console.log("Starting search");
      Popup.stateUpdates("search");
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
          Popup.updateDisabledPropOfForm(true);

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
          let minimizeChecked = $("#minimized-toggle").is(':checked');
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
                  Popup.joinNewGame(window.id, window.tabs[0].id);
                }
              );
            }
          );
        }
      );
    }
  }

  // Steps to take when searching needs to be paused
  static pauseSearch() {
    console.log("Pausing search");

    this.blur();
    Popup.stateUpdates("pause");

    chrome.storage.local.set(
      {
        "state": "pause"
      },
      function() {
        Popup.updateDisabledPropOfForm(false, true);

        chrome.storage.local.get(
          [
            "startTime"
          ],
          function(response) {
            let currentTime = new Date().getTime();
            chrome.storage.local.set(
              {
                "endTime": currentTime,
                "runTime": Popup.getCurrentRunTime(response.startTime, currentTime)
              }
            );
          }
        );
      }
    );
  }

  // Steps to take when searching needs to be resumed
  static resumeSearch() {
    console.log("Resuming search");

    this.blur();
    Popup.stateUpdates("search");
    chrome.storage.local.set(
      {
        "state": "search"
      },
      function() {
        Popup.updateDisabledPropOfForm(true)

        $("#character-error").hide();
        $("#duplicate-error").hide();

        let friendsArray = Popup.getFriendsEntered();

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
                      Popup.joinNewGame(window.id, tabId);
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
  static getFriendNameFromButton(element) {
    return element.innerText.split(" ").slice(0, -1).join(" ");
  }

  // Retrieves the friends entered
  static getFriendsEntered() {
    let friendsArray = []
    Array.from(document.querySelector("#friends").children).forEach(
      (element, index) => {
        let friend = Popup.getFriendNameFromButton(element);
        friendsArray.push(friend);
      }
    )

    return friendsArray;
  }

  // Steps to take when a new game needs to be joined
  static joinNewGame(windowId, tabId) {
    // Create port to send messages to background
    let backgroundPort = chrome.runtime.connect(
      {
        name: "p2b"
      }
    );

    console.log("Sending join new game message");
    backgroundPort.postMessage(
      {
        windowId: tabId,
        tabId: tabId,
        task: "joinNewGame"
      }
    );
  }

  // Steps to take when searching needs to be stopped
  static stopSearch() {
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
            Popup.searchIsStopped();

            let currentTime = new Date().getTime();
            let storageUpdate = {
              "endTime": currentTime
            };
            if (state !== "pause") {
              console.log("Updating runTime");
              storageUpdate["runTime"] = Popup.getCurrentRunTime(response.startTime, currentTime)
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
  static getCurrentRunTime(startTime, currentTime = undefined) {
    if (currentTime === undefined) {
      currentTime = new Date().getTime();
    }
    return currentTime - startTime;
  }

  // For debugging
  // function wait(ms) {
  //   console.log("Waiting");
  //   var start = new Date().getTime();
  //   var end = start;
  //   while(end < start + ms) {
  //     end = new Date().getTime();
  //   }
  // }
}
