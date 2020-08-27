console.log('frienddl.io popup script loaded');

// Hide elements based on the state
chrome.storage.local.get(
  [
    'state',
  ],
  (response) => {
    let state;
    if (response.state === undefined) {
      state = 'stop';
    } else {
      state = response.state;
    }
    console.log(`state: ${state}`);

    $(`.${state}-hidden`).addClass('hidden');
    if (state === 'stop') {
      $('#stats').hide();
    }
  },
);

// Load translations
$('#instructions').text(chrome.i18n.getMessage('instructions'));
$('#friend-input').attr('placeholder', chrome.i18n.getMessage('addFriendPlaceholder'));
$('#pencil').attr('alt', chrome.i18n.getMessage('altPencil'));
$('#add-friend-button').text(chrome.i18n.getMessage('addFriendButton'));
$('#minimized-text').text(chrome.i18n.getMessage('windowMinimized'));

$('#character-error').text(chrome.i18n.getMessage('characterError'));
$('#duplicate-error').text(chrome.i18n.getMessage('duplicateError'));
$('#friend-error').text(chrome.i18n.getMessage('friendError'));
$('#pause-instruction').text(chrome.i18n.getMessage('pauseInstruction'));

$('#spinner-icon').attr('alt', chrome.i18n.getMessage('altSpinner'));
$('#spinner-text').text(chrome.i18n.getMessage('searchText'));
$('#games-joined th').text(chrome.i18n.getMessage('gamesJoined'));
$('#players-found th').text(chrome.i18n.getMessage('playersFound'));
$('#run-time th').text(chrome.i18n.getMessage('runTime'));
$('#found-friend-title').text(chrome.i18n.getMessage('foundFriendSingular'));

// Text for badge
const SUCCESS_BADGE_TEXT = '!';

// Colors for badge
const SEARCH_BADGE_COLOR = '#28a745';
const PAUSE_BADGE_COLOR = '#ffc107';
const STOP_BADGE_COLOR = '#dc3545';
const SUCCESS_BADGE_COLOR = '#17A2B8';

// Converts ms to a readable time format (MM:SS.M)
function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100, 10);
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);

  minutes = (minutes < 10) ? `0${minutes}` : minutes;
  seconds = (seconds < 10) ? `0${seconds}` : seconds;

  return `${minutes}:${seconds}.${milliseconds}`;
}

// Updates all form elements to be either enabled or disabled
function updateDisabledPropOfForm(state, pause = false) {
  $('#friend-input').prop('disabled', state);
  $('#add-friend-button').prop('disabled', state);
  $('#friends button').prop('disabled', state);

  if (!pause) {
    $('#minimized-toggle').prop('disabled', state);
  }

  if (state) {
    $('#friends button').removeClass('enabled-friend-button');
  } else {
    $('#friends button').addClass('enabled-friend-button');
  }
}

// Updates the popup to a predefined HTML file
function updatePopupAndBadge(state) {
  let found = false;

  console.log(`Making popup & badge updates for: ${state}`);
  switch (state) {
    case 'search':
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: SEARCH_BADGE_COLOR,
        },
      );
      found = true;
      break;
    case 'pause':
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: PAUSE_BADGE_COLOR,
        },
      );
      found = true;
      break;
    case 'stop':
      chrome.browserAction.setBadgeText(
        {
          text: '',
        },
      );
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: STOP_BADGE_COLOR,
        },
      );
      found = true;
      break;
    case 'success':
      chrome.browserAction.setBadgeText(
        {
          text: SUCCESS_BADGE_TEXT,
        },
      );
      chrome.browserAction.setBadgeBackgroundColor(
        {
          color: SUCCESS_BADGE_COLOR,
        },
      );
      found = true;
      break;
    default:
      console.error(`State not found ${state}`);
      break;
  }

  if (found) {
    const states = [
      'search',
      'pause',
      'stop',
      'success',
    ];

    const index = states.indexOf(state);
    states.splice(index, 1);

    const statesAsClasses = states.map(
      (element) => `.${element}-hidden`,
    ).join(', ');

    console.log(`Remove hidden elements for other states: ${statesAsClasses}`);
    $(statesAsClasses).removeClass('hidden');

    const hiddenStateClass = `.${state}-hidden`;
    console.log(`Hiding elements based on the state: ${hiddenStateClass}`);
    $(hiddenStateClass).addClass('hidden');
  } else {
    console.error(`State to update popup invalid: ${state}`);
  }
}

// Steps to take when one or more friends are found
function foundFriend(friendsArray) {
  updatePopupAndBadge('success');
  updateDisabledPropOfForm(false);

  if (friendsArray.length > 1) {
    $('#found-friend-title').text(chrome.i18n.getMessage('foundFriendPlural'));
  }
  $('#found-friend-p').text(friendsArray.join(', '));

  chrome.storage.local.get(
    [
      'runTime',
    ],
    (response) => {
      $('#run-time td').text(msToTime(response.runTime));
    },
  );
}

// Steps to take when searching has been stopped
function searchIsStopped() {
  updatePopupAndBadge('stop');
  updateDisabledPropOfForm(false);
}

// Listen for changes to storage
chrome.storage.onChanged.addListener(
  (changes) => {
    Object.keys(changes).forEach(
      (key) => {
        const storageChange = changes[key];
        switch (key) {
          case 'state':
            if (storageChange.newValue === 'stop') {
              searchIsStopped();
            }
            break;
          case 'friendsFound':
            if (storageChange.newValue.length > 0) {
              foundFriend(storageChange.newValue);
            }
            break;
          case 'gamesJoined':
            $('#games-joined td').text(storageChange.newValue);
            break;
          case 'runTime':
            $('#run-time td').text(msToTime(storageChange.newValue));
            break;
          case 'playersFound':
            $('#players-found td').text(storageChange.newValue.length);
            break;
          case 'windowMinimized':
            break;
          default:
            console.log(`Key not found ${key}`);
            break;
        }
      },
    );
  },
);

// For debugging
// function wait(ms) {
//   console.log('Waiting');
//   var start = new Date().getTime();
//   var end = start;
//   while(end < start + ms) {
//     end = new Date().getTime();
//   }
// }

document.addEventListener('DOMContentLoaded', () => {
  // Returns the current run time
  function getCurrentRunTime(startTime, currentTime = undefined) {
    if (currentTime === undefined) {
      return new Date().getTime() - startTime;
    }
    return currentTime - startTime;
  }

  // Extracts the name of a friend from a button
  function getFriendNameFromButton(element) {
    return element.innerText.split(' ').slice(0, -1).join(' ');
  }

  // Removes a button for a friend and updates storage
  function removeFriend() {
    const friendName = getFriendNameFromButton(this);
    console.log(`Removing friend: ${friendName}`);
    this.parentElement.removeChild(this);

    chrome.storage.local.get(
      [
        'friends',
      ],
      (response) => {
        const friendsArray = response.friends;
        const newFriendsArray = [];

        for (let i = 0; i < friendsArray.length; i += 1) {
          if (friendsArray[i] !== friendName) {
            newFriendsArray.push(friendsArray[i]);
          }
        }

        chrome.storage.local.set(
          {
            friends: newFriendsArray,
          },
        );
      },
    );
  }

  // Creates a button for a friend
  function addFriendButton(id, friendName) {
    const btn = document.createElement('BUTTON');

    btn.id = id;
    btn.type = 'button';
    btn.classList.add('btn');
    btn.classList.add('rounded');
    btn.classList.add('btn-outline-danger');
    btn.classList.add('friend-button');
    btn.classList.add('enabled-friend-button');

    btn.innerHTML = `${friendName} <span aria-hidden="true">&times;</span>`;
    btn.onclick = removeFriend;

    console.log(`Adding friend button: ${friendName}`);
    document.querySelector('#friends').append(btn);
  }

  // Retrieves the friends entered
  function getFriendsEntered() {
    const friendsArray = [];
    Array.from(document.querySelector('#friends').children).forEach(
      (element) => {
        const friend = getFriendNameFromButton(element);
        friendsArray.push(friend);
      },
    );

    return friendsArray;
  }

  // Steps to take when a friend is to be added
  function addFriend() {
    this.blur();
    console.log('User wants to add friend');
    $('#friend-error').hide();

    const friendName = $('#friend-input').val();
    if (friendName === '') {
      $('#character-error').show();
    } else {
      $('#character-error').hide();
      $('#friend-input').val('');

      const id = `${friendName}-entered`;
      const exists = $(`#${id}`).length !== 0;

      if (!exists) {
        $('#duplicate-error').hide();
        console.log(`Adding friend: ${friendName}`);

        chrome.storage.local.get(
          [
            'friends',
          ],
          (response) => {
            let friendsArray = [];
            if (response.friends !== undefined) {
              friendsArray = friendsArray.concat(response.friends);
            }

            friendsArray.push(friendName);
            chrome.storage.local.set(
              {
                friends: friendsArray,
              },
              () => {
                addFriendButton(id, friendName);
              },
            );
          },
        );
      } else {
        console.log(`Friend has already been added: ${friendName}`);
        $('#duplicate-error').show();
      }
    }
  }

  // Set values of friends and stats from storage on popup startup
  chrome.storage.local.get(
    [
      'friendsFound',
      'friends',
      'gamesJoined',
      'playersFound',
      'state',
      'startTime',
      'runTime',
      'windowMinimized',
    ],
    (response) => {
      const currentlySearching = response.state === 'search';
      const friendsArray = response.friends;
      if (friendsArray !== undefined) {
        friendsArray.forEach(
          (friendName) => {
            const id = `${friendName}-entered`;
            addFriendButton(id, friendName);
          },
        );

        if (currentlySearching) {
          updateDisabledPropOfForm(true);
        }
      }

      if (response.windowMinimized !== undefined && response.windowMinimized === false) {
        console.log('Changing minimized toggle to unchecked');
        $('#minimized-toggle').prop('checked', false);
      } else {
        console.log('Keeping minimized toggle checked');
      }

      if (response.gamesJoined !== undefined) {
        $('#games-joined td').text(response.gamesJoined);
      }

      if (response.gamesJoined !== undefined) {
        $('#players-found td').text(response.playersFound.length);
      }

      let runtime = '';
      if (currentlySearching) {
        runtime = getCurrentRunTime(response.startTime);
      } else if (response.state === 'pause') {
        runtime = response.runTime;
      }

      if (runtime !== '') {
        $('#run-time td').text(msToTime(runtime));
      }

      if (response.friendsFound !== undefined && response.friendsFound.length > 0) {
        foundFriend(response.friendsFound);
      }
    },
  );

  // Check for enter press on friend input
  $('#friend-input').keypress(
    (event) => {
      const keycode = (event.keyCode ? event.keyCode : event.which);
      if (keycode === '13') {
        console.log('Enter was pressed on input');
        addFriend();
      }
    },
  );

  // Listen for button that adds a friend
  $('#add-friend-button').bind('click', addFriend);

  // Listen for minimized toggle
  $('#minimized-toggle').bind(
    'click',
    () => {
      const checked = $('#minimized-toggle').is(':checked');
      console.log(`Setting windowMinimized to ${checked}`);
      chrome.storage.local.set(
        {
          windowMinimized: checked,
        },
      );
    },
  );

  // Steps to take when a new game needs to be joined
  function joinNewGame(windowId, tabId) {
    // Create port to send messages to background
    const backgroundPort = chrome.runtime.connect(
      {
        name: 'p2b',
      },
    );

    console.log('Sending join new game message');
    backgroundPort.postMessage(
      {
        windowId,
        tabId,
        task: 'joinNewGame',
      },
    );
  }

  // Listen for button that starts search
  $('#start-button').bind(
    'click',
    () => {
      this.blur();
      console.log('User wants to start search');

      $('#character-error').hide();
      $('#duplicate-error').hide();

      const friendsArray = getFriendsEntered();

      if (friendsArray.length === 0) {
        $('#friend-error').show();
      } else {
        console.log('Starting search');
        updatePopupAndBadge('search');
        $('#stats').show();
        chrome.storage.local.set(
          {
            friends: friendsArray,
            state: 'search',
            gamesJoined: 0,
            endTime: -1,
            runTime: -1,
            playersFound: [],
            friendsFound: [],
          },
          () => {
            $('#friend-error').hide();
            updateDisabledPropOfForm(true);

            $('#players-found td').text(0);
            $('#games-joined td').text(0);
            $('#run-time td').text('00:00.0');

            chrome.storage.local.get(
              [
                'totalTimesSearched',
              ],
              (response) => {
                let newTotalTimesSearched = 1;

                if (response.totalTimesSearched !== undefined) {
                  newTotalTimesSearched += response.totalTimesSearched;
                }

                chrome.storage.local.set(
                  {
                    totalTimesSearched: newTotalTimesSearched,
                  },
                );
              },
            );

            const windowSettings = {};
            const minimizeChecked = $('#minimized-toggle').is(':checked');
            if (minimizeChecked) {
              console.log('Setting window to minimized');
              windowSettings.state = 'minimized';
            }

            chrome.windows.create(
              windowSettings,
              (window) => {
                const currentTime = new Date().getTime();
                chrome.storage.local.set(
                  {
                    windowId: window.id,
                    startTime: currentTime,
                  },
                  () => {
                    joinNewGame(window.id, window.tabs[0].id);
                  },
                );
              },
            );
          },
        );
      }
    },
  );

  // Listen for button that pauses search
  $('#pause-button').bind(
    'click',
    () => {
      console.log('Pausing search');

      this.blur();
      updatePopupAndBadge('pause');

      chrome.storage.local.set(
        {
          state: 'pause',
        },
        () => {
          updateDisabledPropOfForm(false, true);

          chrome.storage.local.get(
            [
              'startTime',
            ],
            (response) => {
              const currentTime = new Date().getTime();
              chrome.storage.local.set(
                {
                  endTime: currentTime,
                  runTime: getCurrentRunTime(response.startTime, currentTime),
                },
              );
            },
          );
        },
      );
    },
  );

  // Listen for button that resumes search
  $('#resume-button').bind(
    'click',
    () => {
      console.log('Resuming search');

      this.blur();
      updatePopupAndBadge('search');
      chrome.storage.local.set(
        {
          state: 'search',
        },
        () => {
          updateDisabledPropOfForm(true);

          $('#character-error').hide();
          $('#duplicate-error').hide();

          const friendsArray = getFriendsEntered();

          if (friendsArray === 0) {
            $('#friend-error').show();
          } else {
            chrome.storage.local.set(
              {
                friends: friendsArray,
              },
              () => {
                $('#friend-error').hide();

                chrome.storage.local.get(
                  [
                    'windowId',
                  ],
                  (response) => {
                    chrome.windows.get(
                      response.windowId,
                      {
                        populate: true,
                      },
                      (window) => {
                        const tabId = window.tabs[0].id;
                        joinNewGame(window.id, tabId);
                      },
                    );
                  },
                );
              },
            );
          }
        },
      );
    },
  );

  // Listen for button that stops search
  $('#stop-button').bind(
    'click',
    () => {
      console.log('Stopping search');

      this.blur();

      chrome.storage.local.get(
        [
          'state',
          'startTime',
          'windowId',
        ],
        (response) => {
          chrome.storage.local.set(
            {
              state: 'stop',
            },
            () => {
              searchIsStopped();

              const currentTime = new Date().getTime();
              const storageUpdate = {
                endTime: currentTime,
              };
              if (response.state !== 'pause') {
                console.log('Updating runTime');
                storageUpdate.runTime = getCurrentRunTime(response.startTime, currentTime);
              } else {
                console.log('Not updating runTime due to previous pause state');
              }
              chrome.storage.local.set(storageUpdate);

              chrome.windows.remove(response.windowId);
            },
          );
        },
      );
    },
  );
}, false);
