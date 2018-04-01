// Watches for the Live Login Popup to store token and closes the
// window.
window.addEventListener("load", function() {
  console.log("Loading scripts from Journomini");

  chrome.storage.local.get("code", function(result) {
    if (result.code) {
      return;
    }

    if (window.location.origin + window.location.pathname == "https://anoxic.me/journal/callbackJournomini.html") {
      var search = window.location.search;
      // Get refresh token
      var prefix = "?code=";

      var start = search.indexOf(prefix);
      if (start >= 0) {
        start = start + prefix.length;

        var code = search.substring(start);

        // Store it
        chrome.storage.local.set({"code": code});

        // Close the window
        window.close();
      }
    }
  });

  // For other scripts
  chrome.storage.local.get("scripts", function(data) {
    "use strict";

    var scripts = data.scripts,
      address = window.location.origin + window.location.pathname,
      matchedNames = [];

    for (var key in scripts) {
      if (scripts.hasOwnProperty(key)) {
        var value = scripts[key];
        var name = value.name;

        // Test if the address matches
        for (var i = 0; i !== value.match.length; ++i) {
          var match = value.match[i];
          var regex = new RegExp(match.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            '\\$&'));
          if (address.match(regex)) {
            // Add to the queue
            matchedNames.push(name);
            break;
          }
        }
      }
    }

    // Do a little processing here
    var copy = matchedNames.slice();
    for (i = 0; i !== copy.length; ++i) {
      copy[i] += "Disabled";
    }
    copy.push.apply(copy, matchedNames);
    copy.push("scripts");

    // Load the script
    chrome.storage.local.get(copy, function(newData) {
      // Iterate thru each matched name
      for (i = 0; i !== matchedNames.length; ++i) {
        var name = matchedNames[i];
        // Test if it is enabled
        if (!newData[name + "Disabled"]) {
          // Grab the script
          var command = newData[name] || "";
          eval(scripts[name].execute + "('" + command + "')");
        }
      }
    });
  });
});

/**
 * Load the dependencies
 * @param dependencies - a list of file names of dependencies
 * @param callback - the callback function after everything is loaded
 */
function loadScriptDependencies(dependencies, callback) {
  "use strict";
  var leftUnloaded = dependencies.length;

  for (var i = 0; i !== dependencies.length; ++i) {
    var s = document.createElement("script");
    s.src = chrome.extension.getURL(dependencies[i]);
    s.onload = () => {
      if (--leftUnloaded === 0) {
        callback();
      }
    };

    (document.head || document.documentElement).appendChild(s);
  }
}

/**
 * Load CSS dependencies
 * @param dependencies - a list of file names of css dependencies
 */
function loadCssDependencies(dependencies) {
  "use strict";

  for (var i = 0; i !== dependencies.length; ++i) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = dependencies[i];
    link.media = 'all';
    head.appendChild(link);
  }
}

/**
 * Add your new scripts here ...
 */

function eBayPreProcessor() {
  var $process = document.createElement("a");
  $process.style.cssText = "padding: 0 10px 10px;display: block;";
  $process.setAttribute("href", "javascript:;");
  $process.innerText = "Process!";

  $process.addEventListener("click", function() {
    // Surround the area
    var __decode = function(str) {
      var ret = "";
      for (var i = 0; i !== str.length; ++i) {
        ret += String.fromCharCode(str.charCodeAt(i) ^ 3);
      }
      return ret;
    };

    var $input = document.getElementById("msg_cnt_cnt");
    $input.value = __decode(
      "Wkbmhp#elq#zlvq#jmwfqfpw-#Kfqf$p#zlvq#`lgf9#		") +
      $input.value +
      __decode(
        "		Sofbpf#ofbuf#nf#b#slpjwjuf#effgab`h#je#zlv#fmilz-#Kbuf#b#dqfbw#gbz#9*");
  });

  var $parent = document.querySelector("#CUSubmitForm .tas");
  $parent.insertBefore($process, $parent.firstChild);

  // Make the item price changable
  var $itemPrice = document.getElementById("itemPrice");
  $itemPrice
    .outerHTML = '<input onclick="this.select()" id="itemPrice" value="' + $itemPrice
    .textContent
    .substr(1) + '">';
}


/**
 * This is used as default words to be filtered out
 * @type {string}
 */
var filterAdWords = "suggested post,sponsored,trump,hillary,politics,imwithher";

function freeFacebook(command) {
  function __plugin_removeAnnoyingStuffs() {
    console.log("FreeFacebook activated");
    var keywords = (command || filterAdWords)
      .split(",");

    // Remove the sidebar ads
    document.getElementById("pagelet_ego_pane").style.display = "none";

    // Yeah I know it's ugly. But so what? It fucking works!
    setInterval(() => {
      var contents = document.getElementsByClassName("fbUserContent");

      for (var i = 0; i !== contents.length; ++i) {
        var item = contents.item(i);
        for (var j = 0; j !== keywords.length; ++j) {
          var re = new RegExp(keywords[j], "i");
          if (item.textContent.match(re)) {
            var frame = contents.item(i).parentNode.parentNode.parentNode;
            frame.parentNode.removeChild(frame);
            --i;
            console.log("An annoying stuff has been removed");
          }
        }
      }
    }, 1000);
  }

  /**
   * $(document).ready(() =>)
   */
  function __plugin_ready(f) {
    if (document.readyState !== "loading") {
      f();
    } else {
      document.addEventListener("DOMContentLoaded", f);
    }
  }

  __plugin_ready(__plugin_removeAnnoyingStuffs);
}

function freeGooglePlus(command) {
  "use strict";

  function __plugin_removeAnnoyingStuffs() {
    console.log("FreeGooglePlus activated");
    var keywords = (command || filterAdWords)
      .split(",");

    // Yeah I know it's ugly. But so what? It fucking works!
    setInterval(() => {
      var contents = document.getElementsByClassName("V2SCpf");

      for (var i = 0; i !== contents.length; ++i) {
        var item = contents.item(i);
        for (var j = 0; j !== keywords.length; ++j) {
          var re = new RegExp(keywords[j], "i");
          if (item.textContent.match(re)) {
            var frame = contents.item(i);
            frame.parentNode.removeChild(frame);
            --i;
            console.log("An annoying stuff has been removed");
          }
        }
      }
    }, 1000);
  }

  /**
   * $(document).ready(() =>)
   */
  function __plugin_ready(f) {
    if (document.readyState !== "loading") {
      f();
    } else {
      document.addEventListener("DOMContentLoaded", f);
    }
  }

  __plugin_ready(__plugin_removeAnnoyingStuffs);
}

let lastPushedBulb = "";
const bulbStartsWith = "## ";

function cleanMessenger(command) {
  "use strict";

  function __plugin_removeAnnoyingStuffs() {
    console.log("Clean messenger activated");
    var keywords = command.split(",");

    // Yeah I know it's ugly. But so what? It fucking works!
    setInterval(() => {
      var contents = document.getElementsByClassName("_58nk");

      for (var i = 0; i !== contents.length; ++i) {
        var item = contents.item(i);
        let text = item.innerText;
        for (var j = 0; j !== keywords.length; ++j) {
          var re = new RegExp(keywords[j], "ig");
          if (item.textContent.match(re)) {
            text = text.replace(re,
              `<span style="filter:blur(6px);opacity:0.2">${keywords[j]}</\span>`);
          }
        }
        if (text !== item.innerHTML) {
          item.innerHTML = text;
        }
      }

      // Push the last bulb if ends with
      if (contents.length) {
        let lastItem = contents.item(contents.length - 1);
        if (lastItem.parentNode.parentNode.getAttribute(
            "data-tooltip-position") === "right") {
          // It's on the right side, sent by me
          let text = lastItem.innerText;
          if (text.startsWith(bulbStartsWith)) {
            if (lastPushedBulb !== text) {
              lastPushedBulb = text;
              chrome.runtime.sendMessage({
                task: "pushBulb",
                body: text.substr(bulbStartsWith.length)
              });
            }
          }
        }
      }
    }, 1000);
  }

  /**
   * $(document).ready(() =>)
   */
  function __plugin_ready(f) {
    if (document.readyState !== "loading") {
      f();
    } else {
      document.addEventListener("DOMContentLoaded", f);
    }
  }

  __plugin_ready(__plugin_removeAnnoyingStuffs);
}

// Send messages for closing the tabs
function betterTabs() {
  document.onkeydown = function(e) {
    if (e.ctrlKey && e.altKey) {
      if (e.keyCode == 65) {
        // A
        chrome.runtime.sendMessage({task: "closeLeftTabs"});
      } else if (e.keyCode == 68) {
        // D
        chrome.runtime.sendMessage({task: "closeRightTabs"});
      } else if (e.keyCode >= 48 && e.keyCode <= 57) {
        // 0 ~ 9
        chrome.runtime.sendMessage({
          task: "reallocateTab",
          data: (e.keyCode - 49)
        });
      }
    }
  };
}

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.method === "fetchActiveTabHtml") {
      sendResponse({
        data  : document.all[0].outerHTML,
        method: "fetchActiveTabHtml"
      });
    }
  }
);