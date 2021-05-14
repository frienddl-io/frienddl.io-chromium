console.log("frienddl.io option script loaded");

// Load translations
// $("#friend-finder-tab").text(chrome.i18n.getMessage("friendFinderTabName"));

document.addEventListener("DOMContentLoaded", function () {
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
      "currentTab"
    ],
    function() {
      response.each

      response.forEach(
        function(i) {
          for(key in response) {
            console.log(key + ': ' + response[key]);
          }
        }
      );
    }
  );
});
