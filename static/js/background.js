/**
 * Omnibox plugin for my own use.
 * Author Anoxic
 * Created 042516
 */

// TODOs
/**
 * - Not allowing login if not enabled
 * - Copy what's pushed to the clipboard
 */

var lastItemID;

/**
 * Scripts from an extension. Thank you so much
 * https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi
 */
'use strict';

/**
 * Load the scripts here, strictly follow the first example
 * *****
 * What to do if you want to add more scripts to be loaded:
 * 1) add appropriate info below
 * 2) in script.js, add a function to execute.
 *    If `command` is set to true, don't forget to have a `command`
 * param
 *
 * *****
 * @type {Array}
 */
var scripts = {
  "FreeFacebook"    : {
    name       : "FreeFacebook", // The name of the script. Must
                                 // match the key value
    match      : ["www.facebook.com"], // The website(s) to match
    description: "To remove annoying words on Facebook", // The
                                                         // description
    command    : true, // Accepting commands
    execute    : "freeFacebook" // The function to be called in
                                // `script.js`, do not include `()`
  },
  "BetterTabs"      : {
    name       : "BetterTabs",
    match      : ["."], // match every site!
    description: "Improve the functions of tabs, including shortcuts to close left or right tabs and move tab around",
    command    : false,
    execute    : "betterTabs"
  },
  "eBayPreProcessor": {
    name       : "eBayPreProcessor",
    match      : ["www.ebay.com/contact"],
    description: "Preprocess eBay message to make my passcode fetcher work",
    command    : false,
    execute    : "eBayPreProcessor",
  },
  "FreeGooglePlus"  : {
    name       : "FreeGooglePlus",
    match      : ["plus.google.com"],
    description: "To remove annoying words on Google+",
    command    : true,
    execute    : "freeGooglePlus"
  },
  "CleanMessenger"  : {
    name       : "CleanMessenger",
    match      : ["www.messenger.com"],
    description: "Blur things on messenger",
    command    : true,
    execute    : "cleanMessenger",
  }
};

var DefaultSettings = {
    'active'        : true,
    /////////////////// If the login url changes, update this url
    'urls'          : ['*://login.live.com/*'],
    'exposedHeaders': '',
    'Origin'        : 'http://evil.com/'
  },
  accessControlRequests = {};

var exposedHeaders;

var requestRules = [{
  'data'     : {
    'name' : 'Origin',
    'value': 'http://evil.com/'
  },
  'mandatory': true,
  'fn'       : null
}, {
  'data'     : {
    'name' : 'Access-Control-Request-Headers',
    'value': null
  },
  'mandatory': false,
  'fn'       : function(rule, header, details) {
    if (accessControlRequests[details.requestId] === void 0) {
      accessControlRequests[details.requestId] = {};
    }
    accessControlRequests[details.requestId].headers = header.value;
  }
}];


var responseRules = [{
  'data'     : {
    'name' : 'Access-Control-Allow-Origin',
    'value': '*'
  },
  'mandatory': true,
  'fn'       : null
}, {
  'data'     : {
    'name' : 'Access-Control-Allow-Headers',
    'value': null
  },
  'mandatory': true,
  'fn'       : function(rule, header, details) {
    if (accessControlRequests[details.requestId] !== void 0) {
      header.value = accessControlRequests[details.requestId].headers;
    }

  }
}, {
  'data'     : {
    'name' : 'Access-Control-Allow-Credentials',
    'value': 'true'
  },
  'mandatory': false,
  'fn'       : null
}, {
  'data'     : {
    'name' : 'Access-Control-Allow-Methods',
    'value': 'POST, GET, OPTIONS, PUT, DELETE'
  },
  'mandatory': true,
  'fn'       : null
},
  {
    'data'     : {
      'name' : 'Allow',
      'value': 'POST, GET, OPTIONS, PUT, DELETE'
    },
    'mandatory': true,
    'fn'       : null
  }];

var requestListener = function(details) {
  // console.info('request details', details);
  requestRules.forEach(function(rule) {
    var flag = false;

    details.requestHeaders.forEach(function(header) {
      if (header.name === rule.data.name) {
        flag = true;
        if (rule.fn) {
          rule.fn.call(null, rule, header, details);
        } else {
          header.value = rule.data.value;
        }
      }
    });

    //add this rule anyway if it's not present in request headers
    if (!flag && rule.mandatory) {
      if (rule.data.value) {
        details.requestHeaders.push(rule.data);
      }
    }
  });

  //////@todo REMOVE test
  ////console.groupCollapsed("%cRequest", "color:red;");
  ////console.log(JSON.stringify(details, null, 2));
  ////console.groupEnd('Request');

  return {
    requestHeaders: details.requestHeaders
  };
};

var responseListener = function(details) {
  // console.info('response details', details);
  /*  var headers = responseRules.filter(function (rule) {
   console.info('rule filter', rule);
   return rule.value !== void 0 && rule.value !== null;
   });*/

  responseRules.forEach(function(rule) {
    var flag = false;

    details.responseHeaders.forEach(function(header) {
      // if rule exist in response - rewrite value
      if (header.name === rule.data.name) {
        flag = true;
        if (rule.fn) {
          rule.fn.call(null, rule.data, header, details);
        } else {
          if (rule.data.value) {
            header.value = rule.data.value;
          } else {
            //@TODO DELETE this header
          }
        }
      }
    });

    //add this rule anyway if it's not present in request headers
    if (!flag && rule.mandatory) {
      if (rule.fn) {
        rule.fn.call(null, rule.data, rule.data, details);
      }

      if (rule.data.value) {
        details.responseHeaders.push(rule.data);
      }
    }
  });

  //details.responseHeaders = details.responseHeaders.concat(headers);


  //////@todo REMOVE test
  ////console.groupCollapsed('Response');
  ////console.log(JSON.stringify(details, null, 2));
  ////console.groupEnd('Response');
  return {
    responseHeaders: details.responseHeaders
  };
};

/*Reload settings*/
var reload = function() {
  console.info("reload");
  chrome.storage.local.get(DefaultSettings,
    function(result) {
      exposedHeaders = result.exposedHeaders;
      console.info("get localStorage", result);

      /*Remove Listeners*/
      chrome.webRequest.onHeadersReceived.removeListener(
        responseListener);
      chrome.webRequest.onBeforeSendHeaders.removeListener(
        requestListener);

      if (result.active) {
        if (result.urls.length) {
          /*Add Listeners*/
          chrome.webRequest.onHeadersReceived.addListener(
            responseListener,
            {
              urls: result.urls
            },
            ['blocking', 'responseHeaders']);

          chrome.webRequest.onBeforeSendHeaders.addListener(
            requestListener,
            {
              urls: result.urls
            },
            ['blocking', 'requestHeaders']);
        }
      }
    });
};

/*On install*/
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('previousVersion', JSON.stringify(details, null, 2));

  chrome.storage.local.clear();

  reload();

  // Update the scripts library
  chrome.storage.local.set({scripts: scripts});
});

/**
 * For fetching login detail from Microsoft
 */

function onAuthCallback(code) {
  var appinfo = getAppInfo();
  // Redeem the code: post to get authentication token
  $.ajax({
    type       : "POST",
    url        : "https://login.live.com/oauth20_token.srf",
    contentType: "application/x-www-form-urlencoded",
    data       : "client_id=" + appinfo.clientId +
    "&redirect_uri=" + appinfo.redirectUri +
    "&client_secret=" + appinfo.clientSecret +
    "&code=" + code +
    "&grant_type=authorization_code"
  }).done(function(data, status, xhr) {
    // Try to get the access token and expiry
    var token = data["access_token"],
      refresh = data["refresh_token"];
    chrome.storage.local.set({
      token  : token,
      refresh: refresh
    });
  }).fail(function() {
    sendNotification("Error", "Cannot get the `refresh_token`");
  });
}

function getAuthInfoFromUrl() {
  if (window.location.search) {
    var authResponse = window.location.search.substring(1);
    var authInfo = JSON.parse(
      "{\"" + authResponse.replace(/&/g, "\",\"")
        .replace(/=/g, "\":\"") + "\"}",
      function(key, value) {
        return key === "" ? value : decodeURIComponent(value);
      });
    return authInfo;
  } else {
    sendNotification("Error", "failed to receive auth token");
  }
}

/**
 * Gets the local storage component of this extension specifying the
 * name
 * @param {string} name - the name to be searched
 * @param {function} callback - the callback function after
 *   retrieving is done, taking a paramter which is not undefined if
 *   the key is valid
 */
function getFromStorage(name, callback) {
  chrome.storage.local.get(name, function(result) {
    callback(result[name]);
  });
}

/**
 * Refreshes the token to get a new access token, then call the
 * callback
 * @param {function} callback - A callback function that can have a
 *   parameter to handle the ACCESS TOKEN passed in. This function
 *   will only be called if the token is successfully refreshed
 */
function refreshToken(callback) {
  getFromStorage("refresh", function(refresh) {
    var appinfo = getAppInfo();
    if (refresh) {
      $.ajax({
        type       : "POST",
        url        : "https://login.live.com/oauth20_token.srf",
        contentType: "application/x-www-form-urlencoded",
        data       : "client_id=" +
        appinfo.clientId +
        "&redirect_uri=" +
        appinfo.redirectUri +
        "&client_secret=" +
        appinfo.clientSecret +
        "&refresh_token=" +
        refresh +
        "&grant_type=refresh_token"
      })
        .done(function(data, status, xhr) {
          var token = data["access_token"],
            refresh = data["refresh_token"],
            expiry = parseInt(data["expires_in"]);
          setToken(refresh, token);
          if (typeof (callback) === "function") {
            callback(token);
          }
        })
        .fail(function() {
          sendNotification("Error",
            "Unable to get `access_token`, try again.")
        });
    } else {
      sendNotification("Error",
        "Unable to get `refresh`, try re-signin");
    }
  })

}

/**
 * Sets the token of refresh_token and current token, both in the
 * plug in and in some specific website
 * @param refresh
 * @param token
 */
function setToken(refresh, token) {
  chrome.storage.local.set({
    token  : token,
    refresh: refresh
  });
  setTokenInCookies(token);
}

/**
 * Sets the cookie in specific website, e.g. journoxic
 * @param token
 */
function setTokenInCookies(token) {
  chrome.cookies.set({
    url  : "http://anoxic.me",
    name : "odauth",
    value: token
  }, () => {
    console.log("New token has been fetched");
  });
}

function getAppInfo() {
  var appInfo = {
    clientId    : "00000000481C075F",
    clientSecret: "moEfmzqqPiDCWLLxJiBGOKo",
    scopes      : "wl.signin wl.offline_access onedrive.readwrite onedrive.appfolder",
    redirectUri : "https://anoxdd.github.io/journal/callbackJournomini.html"
  };

  return appInfo;
}

function challengeForAuth() {
  var appInfo = getAppInfo();
  var url =
    "https://login.live.com/oauth20_authorize.srf" +
    "?client_id=" + appInfo.clientId +
    "&scope=" + encodeURIComponent(appInfo.scopes) +
    "&response_type=code" +
    "&redirect_uri=" + encodeURIComponent(appInfo.redirectUri);
  console.log(url);
  popup(url);
}

function popup(url) {
  var width = 525,
    height = 525,
    screenX = window.screenX,
    screenY = window.screenY,
    outerWidth = window.outerWidth,
    outerHeight = window.outerHeight;

  var left = screenX + Math.max(outerWidth - width, 0) / 2;
  var top = screenY + Math.max(outerHeight - height, 0) / 2;

  var features = [
    "width=" + width,
    "height=" + height,
    "top=" + top,
    "left=" + left,
    "status=no",
    "resizable=yes",
    "toolbar=no",
    "menubar=no",
    "scrollbars=yes"];
  var popup = window.open(url, "oauth", features.join(","));
  if (!popup) {
    alert("failed to pop up auth window");
  }

  popup.focus();
}

function onAuthenticated(token, authWindow) {
  if (token) {
    if (authWindow) {
      authWindow.close();
    }
  }
}


// My original code

// This event is fired each time the user updates the text in the
// omnibox, as long as the extension's keyword mode is still active.

/**
 * The first function to be called to process raw bulb input
 * @param text
 */
function processRawBulbInput(text) {
  if (text.startsWith("`")) {
    // This is a command
    processCommand(text.substr(1));
  } else {
    saveChanges(text);
  }
}

/**
 * Processes a command
 * Whenever a new command is added, do not forget to update the
 * listener above
 * @param {string} cmd - a command to be processed, without $
 */
function processCommand(cmd) {
  if (cmd == "e" || cmd === "enable") {
    // Enable sign-in to get the code
    chrome.storage.local.set({"enable": "enable"});
    sendNotification("Command",
      "Auto-close Microsoft Login menu enabled");
  } else if (cmd == "d" || cmd === "disable") {
    // Disable automatically closing anoxic.me/journal/callback.html
    chrome.storage.local.set({"enable": ""});
    sendNotification("Command",
      "Auto-close Microsoft Login menu disabled");
  } else if (cmd == "c" || cmd === "clear") {
    chrome.storage.local.clear();
    sendNotification("Command", "All local data memory is cleared");
  } else if (cmd == "u" || cmd === "undo") {
    undoBulb();
  } else if (cmd == "a" || cmd.startsWith("a ")) {
    attemptSetAddress(cmd);
  } else {
    sendNotification("Command", "Unknown command");
  }
}

/**
 * Attempts to set the address
 * @param cmd - the raw input, starting with 'a '. If the cmd is just
 *   'a ', the address will be removed
 */
function attemptSetAddress(cmd) {
  // Filter out "a "
  cmd = cmd.substr(2);
  if (cmd.length) {
    // Validate it
    var arr = cmd.substr(2).split(" ");
    if (arr.length == 2) {
      // Do implicit conversion here to make sure they are both valid
      // numbers
      if (parseFloat(arr[0]) == arr[0] && parseFloat(arr[1]) == arr[1]) {
        chrome.storage.local.set({"address": cmd});
        sendNotification("Command",
          `Local coordinate is set to ${cmd}`);
        return;
      }
    }

    chrome.storage.local.get("address", (data) => {
      sendNotification("Error",
        `Unable to set new coordinates. The old address is ${JSON.stringify(
          data.address)}`);
    });
  } else {
    // Remove it
    chrome.storage.local.set({"address": ""});

    sendNotification("Command", "Local coordinate is removed");
  }
}

/**
 * Signs in. Requires help from the extension to close the sign-in
 * page
 * @param initiated - whether this has been called before
 * @returns {boolean} - always true
 */
function signin(initiated) {
  if (!initiated) {
    challengeForAuth();

    initiated = true;
    var checkIntervalCode = setInterval(function() {
      getFromStorage("code", function(code) {
        if (code) {
          clearInterval(checkIntervalCode);
          onAuthCallback(code);
        }
      })
    }, 1000);
  }
  return initiated;
}

/**
 * Signs in or refresh token
 * @param {function} callbackOnSuccess - the callback function when
 *   it gets the token
 */
function signInOrRefreshToken(callbackOnSuccess) {
  var initiated = false;

  var checkInterval = setInterval(function() {
    getFromStorage("refresh",
      function(refresh) {
        if (refresh) {
          // Stop checking refresh token
          clearInterval(checkInterval);
          // Get the token
          refreshToken(token => {
            // Create a new file and upload it
            if (typeof callbackOnSuccess === "function") {
              callbackOnSuccess(token);
            }
          })
        } else {
          initiated = signin(initiated);
        }
      });
  }, 1000);
}

/**
 * Saves the changes and upload it to onedrive folder
 * @param {string} value - The content to be uploaded
 */
function saveChanges(value) {
  // Check if we have refresh_token
  signInOrRefreshToken((token) => {

    chrome.storage.local.get("address", (address) => {
      // Get the current position anyways
      navigator.geolocation.getCurrentPosition((e) => {
        var locationArray = [];

        if (address && address.address) {
          // Convert from the object
          address = address.address;
          // Try to validate it
          locationArray = address.split(" ");
          if (!(locationArray.length === 2 &&
              locationArray[0] == parseFloat(locationArray[0]) &&
              locationArray[1] == parseFloat(locationArray[1]))) {
            locationArray = [];
          } else {
            var latitude = locationArray[0],
              longitude = locationArray[1];
          }
        }

        // If address is invalid, use current address
        if (!locationArray.length) {
          latitude = e.coords.latitude;
          longitude = e.coords.longitude;

          locationArray = [latitude, longitude];
        }

        $.ajax({
          type: "GET",
          url : "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude + "&key=AIzaSyBlGNER0WjTkyMuyJQKN73H3vYkrbtXIXU"
        }).done((data) => {
          if (data && data.results && data.results[0]) {
            var address = data.results[0]["formatted_address"];
            // Push to the front of the array
            locationArray.splice(0, 0, address);
          }
          uploadFileBulb(value, token, locationArray)
        }).fail(() => {
          // The data was not fetched
          uploadFileBulb(value, token, locationArray);
        })
      }, () => {
        // Failed
        uploadFileBulb(value, token);
      });
    });
  });
}

/**
 * Uploads journal.archive.data to OneDrive and creates a backup
 * @param {string} data - The data to be uploaded
 * @param {string} token - a valid token
 * @param {Array} locationArray - an array of current location
 * @param {function()} callback - what to do after everything is done
 */
function uploadFileBulb(data, token, locationArray, callback) {
  var d = new Date(),
    month = d.getMonth() + 1,
    day = d.getDate(),
    year = d.getFullYear() % 100,
    hour = d.getHours(),
    minute = d.getMinutes(),
    second = d.getSeconds();
  month = month < 10 ? "0" + month : month;
  day = day < 10 ? "0" + day : day;
  year = year < 10 ? "0" + year : year;
  hour = hour < 10 ? "0" + hour : hour;
  minute = minute < 10 ? "0" + minute : minute;
  second = second < 10 ? "0" + second : second;
  var fileName = "" + month + day + year + "_" + hour + minute + second;

  // Process the location array
  if (locationArray && (locationArray.length === 2 || locationArray.length === 3)) {
    data += " #[" + locationArray.toString() + "]";
  }

  $.ajax({
    type       : "PUT",
    url        : "https://api.onedrive.com/v1.0/drive/root:/Apps/Trak/bulb/" + fileName + ":/content?access_token=" + token,
    contentType: "text/plain",
    data       : data
  })
    .done(function(d) {
      if (d && d["id"]) {
        lastItemID = d["id"];
      }

      sendNotification("Bulb Pushed", data);
    })
    .fail(function(xhr, status, error) {
      alert("Error",
        "Unable to upload the file. The server returns \"" + error + "\"");
    })
    .always(function() {
      if (typeof callback === "function") {
        callback();
      }
    });
}


/**
 * Sends a notification to tell user what is going on
 * @param {string} title - The title of the notification
 * @param {string} body - The body of the notification
 */
function sendNotification(title, body) {
  var notification = new Notification(title, {
    icon: 'icon.png',
    body: body,
  });

  var sound = title == "Error" ? new Audio("static/fail.ogg") : new Audio(
    "static/success.ogg");
  sound.play();
}

/**
 * Undoes the last bulb just pushed. Should only work on bulb just
 * pushed
 * @param {function()} callback - the callback function after
 *   everything is done
 */
function undoBulb(callback) {
  if (lastItemID) {
    getFromStorage("token", function(token) {
      $.ajax({
        type: "DELETE",
        url : "https://api.onedrive.com/v1.0/drive/items/" + lastItemID + "?access_token=" + token
      })
        .done(function(d, status, xhr) {
          if (xhr.status == 204) {
            sendNotification("Bulb removed",
              "The last bulb is removed");
          } else {
            sendNotification("Error", "Unable to remove the bulb");
            console.log(d);
            console.log(status);
            console.log(xhr);
          }
          lastItemID = undefined;
        })
        .fail(function(xhr, status, error) {
          sendNotification("Error",
            "Unable to remove the bulb. The server returns \"" + error + "");
        })
        .always(function() {
          if (typeof callback === "function") {
            callback();
          }
        });
    })
  } else {
    sendNotification("Error", "Track to the last bulb lost");
  }
}


// Something about tab navigation
// region Tab Navigation

// To receive the message from foreground
chrome.runtime.onMessage.addListener(function(request,
                                              sender,
                                              sendResponse) {
  console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
  if (!sender.tab) {
    return;
  }

  if (request.task == "closeLeftTabs") {
    closeLeftTabs(sender.tab);
  } else if (request.task == "closeRightTabs") {
    closeRightTabs(sender.tab);
  } else if (request.task === "reallocateTab") {
    reallocateTab(sender.tab, request.data);
  }
});

function closeLeftTabs(tab) {
  chrome.tabs.getAllInWindow(tab.windowId, function(tabs) {
    tabs.some(function(_t, i) {
      if (_t.id !== tab.id && !_t.pinned) {
        chrome.tabs.remove(_t.id);
      } else {
        return true;
      }
    });
  });
}

function closeRightTabs(tab) {
  chrome.tabs.getAllInWindow(tab.windowId, function(tabs) {
    tabs.reverse().some(function(_t, i) {
      if (_t.id !== tab.id && !_t.pinned) {
        chrome.tabs.remove(_t.id);
      } else {
        return true;
      }
    });
  });
}

function reallocateTab(tab, data) {
  if (data || data === 0) {
    chrome.tabs.move(tab.id, {index: data});
  }
}

// endregion

// Something about fetching passcode
// region PasscodeFetch

// region PasscodeFetchUtilFunctions
/**
 * Uploads journal.archive.data to OneDrive and creates a backup
 * @param {string} data - The data to be uploaded
 * @param {string} token - a valid token
 * @param {function()} success - what to do if upload is a success
 * @param {function()} callback - what to do after everything is done
 */
function uploadFilePasscode(data, token, success, callback) {
  $.ajax({
    type       : "PUT",
    url        : "https://api.onedrive.com/v1.0/drive/root:/Documents/Ingress/eBay/Passcode/passcode.csv:/content?@name.conflictBehavior=replace&access_token=" + token,
    contentType: "text/plain",
    data       : data
  })
    .done(function() {
      if (typeof success === "function") {
        success();
      }
    })
    .fail(function(xhr, status, error) {
      alert("Error",
        "Unable to upload the passcode. The server returns \"" + error + "\"");
    })
    .always(function() {
      if (typeof callback === "function") {
        callback();
      }
    });
}


/**
 * Backs up the passcode file
 * @param token - a valid token
 * @param {function} success - what to do if copy is a success, with
 *   the data, e.g. function(data) {console.log(data)}
 * @param {function} fail - what to do if copy is a success
 * @param {function} always - what to do after everything is done
 */
function getPasscode(token, success, fail, always) {
  $.ajax({
    type: "GET",
    url : "https://api.onedrive.com/v1.0/drive/root:/Documents/Ingress/eBay/Passcode/passcode.csv:/content?access_token=" + token,
  }).done((data) => {
    if (typeof success === "function") {
      success(data);
    }
  }).fail((xhr, status, error) => {
    if (typeof fail === "function") {
      fail(error);
    }
  }).always(() => {
    if (typeof always === "function") {
      always();
    }
  });
}

/**
 * Backs up the passcode file
 * @param token - a valid token
 * @param {function} success - what to do if copy is a success
 * @param {function} fail - what to do if copy is a success
 * @param {function} always - what to do after everything is done
 */
function backupPasscode(token, success, fail, always) {
  var d = new Date(),
    month = d.getMonth() + 1,
    day = d.getDate(),
    year = d.getFullYear() % 100,
    hour = d.getHours(),
    minute = d.getMinutes(),
    second = d.getSeconds();
  month = month < 10 ? "0" + month : month;
  day = day < 10 ? "0" + day : day;
  year = year < 10 ? "0" + year : year;
  hour = hour < 10 ? "0" + hour : hour;
  minute = minute < 10 ? "0" + minute : minute;
  second = second < 10 ? "0" + second : second;
  var stringifiedData = "_" + month + day + year + "_" + hour + minute + second,
    filePath = "/Documents/Ingress/eBay/Passcode/passcode.csv";

  $.ajax({
    type       : "POST",
    url        : "https://api.onedrive.com/v1.0/drive/root:" + filePath + ":/action.copy?access_token=" + token,
    contentType: "application/json",
    data       : JSON.stringify({
      name: "passcode" + stringifiedData + ".csv"
    }),
    headers    : {
      Prefer: "respond-async"
    }
  }).done(function() {
    if (typeof success === "function") {
      success();
    }
  }).fail((xhr, status, error) => {
    if (typeof fail === "function") {
      fail(error);
    }
  }).always(() => {
    if (typeof always === "function") {
      always();
    }
  });
}

// endregion

/**
 * Ask to fetch the data.
 * Request: { task : passcodeFetch/passcodeSave, data:
 * {{dataToBeUploaded}} } Response: { fail: true/false, data:
 * rawFetchedPasscode/undefined }
 */
chrome.runtime.onMessage.addListener((request,
                                      sender,
                                      sendResponse) => {
  if (request.task === "passcodeFetch") {
    signInOrRefreshToken((token) => {

      backupPasscode(token, () => {

        // Success, get the passcode
        getPasscode(token, (data) => {
          sendResponse({
            fail: false,
            data: data
          });
        }, (error) => {
          // Fail
          sendResponse({
            fail: true,
            data: "Unable to fetch the passcode: " + error
          });
        });

      }, (error) => {
        // Fail
        sendResponse({
          fail: true,
          data: "Unable to backup the passcode: " + error
        });
      });

    })
  } else if (request.task === "passcodeSave") {

    signInOrRefreshToken((token) => {
      uploadFilePasscode(request.data, token, () => {

        // Success
        sendResponse({
          fail: false
        });

      }, () => {

        // Fail
        sendResponse({
          fail: true,
          data: "Unable to update the passcode sheet. Please try again"
        });

      });
    });
  }

  return true;
});

// endregion

// Recursively update the refresh token every half an hour
refreshToken();
setInterval(() => {
  refreshToken();
}, 1800000);
