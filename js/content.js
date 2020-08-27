console.log('frienddl.io content script loaded');

console.log('Setting up port');
chrome.runtime.connect(
  {
    name: 'c2b',
  },
);

function checkDisconnected() {
  const disconnectButton = $('#modalDisconnect button:contains("Ok")');
  const disconnectVisible = disconnectButton.is(':visible');
  if (disconnectVisible) {
    console.log('Disconnected');
    disconnectButton.click();
    return true;
  }

  return false;
}

function receiveRequest(request, sender, sendResponse) {
  console.log('Request received');
  console.dir(request);

  chrome.storage.local.get(
    [
      'state',
    ],
    (response) => {
      if (response.state === 'search') {
        console.log('Waiting for play button');
        const checkIfPlayButtonExists = setInterval(
          () => {
            if ($('button[type="submit"]').length >= 2) {
              console.log('Play button exists, clicking now');

              const playButton = $('button[type="submit"]')[0];
              console.log('Clicking play button');
              playButton.click();
              clearInterval(checkIfPlayButtonExists);
            } else {
              console.log('Play button doesn\'t exist');
            }
          },
          100,
        );

        console.log('Waiting for players');
        const checkIfPlayersExist = setInterval(
          () => {
            const disconnected = checkDisconnected();
            if (disconnected) {
              sendResponse(
                {
                  players: [],
                  tabId: request.tabId,
                },
              );
            }

            if ($('.player').length >= 2) {
              console.log('Players exist');

              const playersArray = [];
              $('.player').each(
                () => {
                  const playerName = $(this).find('.name').html();
                  if (playerName !== null && playerName !== '' && !(playersArray.includes(playerName))) {
                    playersArray.push(playerName);
                  }
                },
              );

              clearInterval(checkIfPlayersExist);
              console.log(`Sending response with playersArray: ${playersArray.toString()}`);
              sendResponse(
                {
                  players: playersArray,
                  tabId: request.tabId,
                },
              );
            } else {
              console.log('Players don\'t exist');
            }
          },
          100,
        );
      }
    },
  );

  return true;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener(receiveRequest);
