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
$("#minimized-text").text(chrome.i18n.getMessage("windowMinimized"));

$(".spinner-icon").attr("alt", chrome.i18n.getMessage("altSpinner"));

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

const DEFAULT_AVATAR = '<div class="container"><div class="avatar fit"><div class="color bounce" style="background-position: -200% 0%;"></div><div class="eyes bounce" style="background-position: -500% 0%;"></div><div class="mouth bounce" style="background-position: -200% 0%;"></div><div class="special" style="display: none;"></div><div class="owner" style="display: none;"></div></div></div>';

// Listen for changes to storage
chrome.storage.onChanged.addListener(
  function(changes, namespace) {
    for (let key in changes) {
      let storageChange = changes[key];
      switch(key) {
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
        case "scoreKeeperSpinner":
          $("#score-keeper .spinner").addClass("hidden");
          $("#manual-update-button").prop("disabled", false);
          break;
        case "state":
        case "endTime":
        case "startTime":
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
  // Set values of stats from storage on popup startup
  chrome.storage.local.get(
    [
      "state",
      "startTime",
      "windowMinimized",
      "playerName",
      "playerAvatar"
    ],
    function(response) {
      if (response.windowMinimized !== undefined && response.windowMinimized === false) {
        console.log("Changing minimized toggle to unchecked");
        $("#minimized-toggle").prop("checked", false);
      } else {
        console.log("Keeping minimized toggle checked");
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
