const MAIN_BUTTON_ID = "#main-button";
const SKRIBBLIO_URL = "https://skribbl.io/";
// let TAB_ID = -1;
let LOCK = false;
// let STATS = {
//   numberOfFriends: 0,
//   gamesJoined: 0,
//   startTime: -1,
//   endTime: -1,
//   runTime: "00:00.0",
//   playersFound: []
// };
let ACTIVE = false;

chrome.storage.sync.set(
  {
    "totalGamesJoined": 0,
    "totalTimesSearched": 0,
    "totalRunTime": 0,
    "totalPlayersSeen": 0,
    "totalFriendsFound": 0
  }
);

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

  function addFriend() {
    this.blur();
    $("#friend-error").hide();
    $("#duplicate-error").hide();

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

  $(MAIN_BUTTON_ID).bind("click", mainButtonPressed);

  function mainButtonPressed() {
    this.blur();
    $("#character-error").hide();
    $("#duplicate-error").hide();

    let action = $(MAIN_BUTTON_ID).text();

    if (action === "Search") {
      if (getFriendsArray().length === 0) {
        $("#friend-error").show();
      } else {
        ACTIVE = true;
        $("#friend-error").hide();
        toggleMainButton();

        chrome.windows.create(
          {
            url: SKRIBBLIO_URL,
            state: "minimized"
          },
          function(window) {
            // WINDOW_ID = window.id;
            TAB_ID = window.tabs[0].id;
            console.log(window);
            console.log(window.tabs);
            console.log("Tab ID: " + TAB_ID);

            let currentTime = new Date().getTime();
            console.log("Setting start time to " + currentTime);
            chrome.storage.sync.set(
              {
                "gamesJoined": 0,
                "startTime": currentTime,
                "endTime": -1,
                "runTime": -1,
                "playersFound": []
              }
            );
            showSearchingContent();
            startNewGame(window.tabs[0].id);
          }
        );
      }
    } else {
      stopSearch();
      chrome.storage.sync.get(
        [
          "startTime"
        ],
        function(response) {
          let currentTime = new Date().getTime();
          chrome.storage.sync.set(
            {
              "endTime": currentTime,
              "runTime": currentTime - response.startTime
            }
          );
        }
      );
    }
  }

  function stopSearch() {
    ACTIVE = false;
    toggleMainButton();
    $("#spinner").hide();
  }

  function startNewGame(correctTabId) {
    chrome.tabs.onUpdated.addListener(
      function(tabId, changeInfo, tab) {
        // console.log("Tab ID: " + tabId);
        if (
          ACTIVE
          && LOCK === false
          && tabId === correctTabId
          && tab.url.indexOf(SKRIBBLIO_URL) != -1
          && changeInfo.status == 'complete'
        )
        {
          console.log("Tab ID matches, sending message to start new game");
          // wait(5000);
          // console.dir(STATS);
          LOCK = true;
          chrome.tabs.sendMessage(
            tabId,
            {
              tabId: tabId
            },
            searchPlayersForFriends
          );
        } //else {
          // console.log("Tab ID doesn't match");
        //}
      }
    );
  }

  function showSearchingContent() {
    // $("#number-of-friends").innerText = getFriendsArray().length;
    // $("#number-of-friends").val(getFriendsArray().length);
    $("#spinner").show();
    $("#players-found").text(0);
    updateStats();
    $("#stats").show();
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

  function toggleMainButton() {
    let btn = document.querySelector(MAIN_BUTTON_ID);
    if (btn.innerHTML == "Search") {
      btn.innerHTML = "Stop";
      btn.classList.add("btn-danger");
      btn.classList.remove("btn-success");
    } else {
      btn.innerHTML = "Search";
      btn.classList.add("btn-success");
      btn.classList.remove("btn-danger");
    }
  }

  // function getPlayers(res) {
  //   console.log("Inside getPlayers");
  //   console.log("res: " + res);
  //   console.dir(res);

  //   // let friendsArray = getIDs("#friends")
  //   // console.log("friendsArray: " + friendsArray);
  // }

  function refreshTab(tabId) {
    console.log("Refreshing");
    // wait(5000);
    chrome.tabs.reload(
      tabId,
      function() {
        console.log("Sending message to start new game");
        LOCK = false;
        // wait(5000);
        startNewGame(tabId);
        // chrome.tabs.sendMessage(
        //   tabId,
        //   {
        //     tabId: tabId
        //   },
        //   searchPlayersForFriends
        // )
      }
    );
  }

  function msToTime(duration) {
    let milliseconds = parseInt((duration % 1000) / 100);
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds + "." + milliseconds;
  }

  function updateStats() {
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
        let newTotalGamesJoined = response.totalGamesJoined + 1;
        chrome.storage.sync.set(
          {
            "gamesJoined": newGamesJoined,
            "totalGamesJoined": newTotalGamesJoined
          }
        );
        $("#games-joined").text(newGamesJoined);

        let startTime = response.startTime;
        console.log("Start time: " + startTime);
        let newRunTime = new Date().getTime() - startTime;
        chrome.storage.sync.set(
          {
            "runTime": newRunTime
          }
        );
        console.log("Setting run time to " + msToTime(newRunTime));
        $("#run-time").text(msToTime(newRunTime));
      }
    );
  }

  function updatePlayersFound(playersArray) {
    chrome.storage.sync.get(
      [
        "playersFound"
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

        chrome.storage.sync.set(
          {
            "playersFound": totalPlayersFound
          }
        );

        console.log("Setting players found to " + totalPlayersFound.length);
        $("#players-found").text(totalPlayersFound.length);
      }
    );
  }

  function foundFriend(friendsArray) {
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
        "totalFriendsFound"
      ],
      function(response) {
        let currentTime = new Date().getTime();
        let finalRunTime = currentTime - response.startTime;
        chrome.storage.sync.set(
          {
            "runTime": finalRunTime,
            "endTime": currentTime,
            "totalFriendsFound": response.totalFriendsFound + 1
          }
        );
        console.log("Setting run time to " + msToTime(finalRunTime));
        $("#run-time").text(msToTime(finalRunTime));
      }
    );
  }

  function searchPlayersForFriends(response) {
    // console.dir(response);
    updateStats();

    if (response === null) {
      console.log("Response was null");
      // console.log("Sending message to start new game");
      // wait(5000);
      // startNewGame();
    } else if (!ACTIVE) {
      console.log("Active: " + ACTIVE);
      if (typeof response.tabId !== 'undefined') {
        console.log(`Closing tab: ${tabId}`);
        chrome.tabs.remove(response.tabId);
      } else {
        console.log("Tab id not defined");
      }
    } else {
      console.log("Searching players for friends");

      let playersArray = response.players;
      let tabId = response.tabId;

      if (playersArray.length > 1) {
        updatePlayersFound(playersArray);

        let friendsFound = [];
        let friendsArray = getFriendsArray();
        console.log("friendsArray: " + friendsArray);

        for (const friend of friendsArray) {
          console.log(`Checking if ${friend} is in playersArray`);
          if (playersArray.includes(friend)) {
            friendsFound.push(friend);
          }
        }

        if (foundFriend.length === 0) {
          console.log("No friends found");
          refreshTab(tabId);
        } else {
          foundFriend(friendsFound);
        }
      } else {
        console.log("Only 1 players was found");
        refreshTab(tabId);
      }
    }
  }

  // function wait(ms){
  //   var start = new Date().getTime();
  //   var end = start;
  //   while(end < start + ms) {
  //     end = new Date().getTime();
  //   }
  // }
}, false);
