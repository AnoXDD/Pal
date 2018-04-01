"use strict";

// What to show up in the final result, case SENSITIVE
var filter = ["eBay"];
const STATUS_RED_CLASS = "mdl-color-text--red-600";
const STATUS_GREEN_CLASS = "mdl-color-text--green-500";

/**
 * Set the visitiblity of the progress bar
 * @param isVisible
 */
function setProgressBarVisibility(isVisible) {
  if (isVisible) {
    $("#passcode-progress").fadeIn();
  } else {
    $("#passcode-progress").fadeOut();
  }
}

/**
 * Process the raw fetched data from the server
 * @param data - raw plain csv fetched from server
 */
function processRawData(data) {
  // Split the data into groups
  var groups = data.replace(/\r/g, "").split('\n');

  for (var i = 0; i !== groups.length; ++i) {
    if (groups[i].length) {
      groups[i] = groups[i].split(',');
    } else {
      groups.splice(i--, 1);
    }
  }

  return groups;
}

/**
 * Get the transaction ID and total from PayPal
 * @param $html - the html element of the page
 * @returns {{transactionID: *, total: string}}
 */
function getTransactionIDandTotalFromPayPal($html) {
  var $panels = $html.find(
      ".transactionRow .highlightTransactionPanel:not(.hide)"),
      transactionID = $panels.find(":contains('Transaction ID')")
          .filter(function() {
            return $(this).children().length === 0;
          })
          .next()
          .text(),
      total = $panels.find(":contains('Total')").filter(function() {
        return $(this).children().length === 0;
      }).parent().next().text().substr(1);

  return {
    transactionID: transactionID,
    total        : total
  };
}

/**
 * Get the transaction ID and total from eBay
 * @param $html - the html element of the page
 * @returns {{transactionID: *, total: *}}
 */
function getTransactionIDandTotalFromeBay($html) {
  var userName = $html.find("#CUSubmitForm .greet-user").text().substr(3, 4),
      total = parseInt($html.find("#itemPrice").val() || $html.find(
                  "#itemPrice").text().substr(1)) * 0.87 - 0.03;

  if (total) {
    total = total.toFixed(2);
  } else {
    total = undefined;
  }

  var transactionID = ($html.find("#itemDetailsBody .fnt_14px")
          .eq(1)
          .text() || "") + " " + userName;

  return {
    transactionID: transactionID,
    total        : total
  };
}

/**
 * Get the transaction ID and total from webpage. The bahavior is different
 * depending on if it's eBay or PayPal
 * @param document - the document to be processed
 * @returns {{transactionID: *, total: string}}
 */
function getTransactionIDandTotalFromPage(document) {
  if (document.url.indexOf("contact.ebay.com") !== -1) {
    return getTransactionIDandTotalFromeBay($(document.data));
  } else {
    return getTransactionIDandTotalFromPayPal($(document.data));
  }
}

/**
 * Add a passcode entry to the whole history
 * @param passcode - The passcode that fetched
 * @param transactionID - the ID of this transaction
 * @param total - the total of this transaction ($34, e.g.)
 * @param date - the date the passcode was processed
 */
function addEntryToPasscodeHistory(passcode,
                                   transactionID,
                                   total,
                                   date,
                                   title) {
  $("#passcode-history").find("tbody").append(
      '<tr class="passcode-history-row">\
                  <td class="mdl-data-table__cell--non-numeric">' + new Date(
          date || Date.now()).toISOString()
          .substr(0, 16) + '</td>\
                            <td class="mdl-data-table__cell--non-numeric passcode-col" title="' + (title || "") + '">' + passcode + '</td>\
                            <td class="mdl-data-table__cell--non-numeric transaction-id-col">' + transactionID + '</td>\
                            <td>' + total + '</td>\
                            </tr>\
                            ');
}

/**
 * Clears the history table
 */
function clearHistoryTable() {
  $("#passcode-history").find("tbody").empty();
}

/**
 * For debug only. Push a new entry to the history table
 */
function debug__addEntryToPasscodeHistory(lineOfPasscode) {
  lineOfPasscode = lineOfPasscode || 1;

  var passcode = [];
  for (var i = 0; i !== lineOfPasscode; ++i) {
    passcode.push("Passcode PASSCODELONGENOUGH");
  }

  addEntryToPasscodeHistory(passcode.join('\n'),
      "00000000000000000",
      parseInt(Math.random() * 1000) / 100);
}

function debug__displayTransactionId() {
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.sendMessage(tab.id,
        {method: "fetchActiveTabHtml"},
        function(response) {
          if (response.method === "fetchActiveTabHtml") {
            console.log(getTransactionIDandTotalFromPage({
              data: response.data,
              url : tab.url
            }));
          }
        });
  });
}

function updateTableInformation() {

  /**
   * Get eligible cards from passcode sheet
   * @param passcodeSheet
   */
  function getEligibleCards(passcodeSheet) {
    var eligibleCards = {};

    for (var i = 0; i !== passcodeSheet.length; ++i) {
      for (var j = 0; j !== filter.length; ++j) {
        if (passcodeSheet[i].indexOf(filter[j]) !== -1 && !passcodeSheet[i][5].length) {
          // Eligible for a code to be given
          var entry = passcodeSheet[i];
          var type = entry[1] === "Card" ?
              entry[0] + " card" :
              (entry[0] === "Loadout" ? " Loadout (" + entry[1] + ")" : entry[1]);

          eligibleCards[type] = eligibleCards[type] || [];

          eligibleCards[type].push(i);
        }
      }
    }

    return eligibleCards;
  }

  /**
   * Append the action bar in the table tab
   */
  function appendActionBar() {
    if (!$("#passcode-actions").length) {
      var $list = $(
          '<div id="passcode-actions" class="mdl-card__actions mdl-card--border" style="min-height: 0;">\
          <button id="passcode-amount-minus" class="mdl-button mdl-js-button mdl-button--icon">\
              <i class="material-icons">remove</i>\
          </button>\
          <p id="passcode-amount">1</p>\
          <button id="passcode-amount-plus" class="mdl-button mdl-js-button mdl-button--icon">\
              <i class="material-icons">add</i>\
          </button>\
          <button id="passcode-get" class="mdl-button mdl-js-button mdl-button--icon">\
              <i class="material-icons">file_download</i>\
          </button>\
          <button class="mdl-button mdl-js-button mdl-button--icon">\
              <i class="material-icons">delete</i>\
          </button>\
          <button id="passcode-copy" class="mdl-button mdl-js-button mdl-button--icon" disabled>\
              <i class="material-icons">content_copy</i>\
          </button>\
          <div class="mdl-textfield mdl-js-textfield passcode-result-wrapper">\
              <textarea class="mdl-textfield__input" type="text" rows= "1" id="passcode-result" readonly></textarea>\
              <label class="mdl-textfield__label" for="passcode-result" style="font-family: Roboto"></label>\
          </div>\
          </div>');

      $list.insertAfter("#passcode-table");
    }
  }

  /**
   * Get sorted cards from eligible cards, by the number of available cards
   * @param eligibleCards
   * @returns {Array}
   */
  function getSortedCards(eligibleCards) {
    // Sort them based on the card type
    var sortedCards = [];
    for (var card in eligibleCards) {
      if (eligibleCards.hasOwnProperty(card)) {
        sortedCards.push({
          type: card,
          data: eligibleCards[card]
        });
      }
    }

    sortedCards = sortedCards.sort((lhs, rhs) => {
      return (rhs.data.length === lhs.data.length) ? lhs.type.localeCompare(rhs.type) : (rhs.data.length - lhs.data.length);
    });
    return sortedCards;
  }

  /**
   * Construct the passcode table
   * @param sortedCards - the data to be translated into table
   */
  function constructPasscodeTable(sortedCards) {
    $("#passcode-table").remove();
    var $list = '<table id="passcode-table" class="mdl-data-table mdl-shadow--2dp">\
                    <thead><tr>\
                    <th class="checkbox-col"></th>\
                    <th class="mdl-data-table__cell--non-numeric type-col">Type</th>\
                    <th>Quantity</th>\
                    </tr></thead>\
                    <tbody>';

    for (var i = 0; i !== sortedCards.length; ++i) {
      var type = sortedCards[i].type;
      var idName = "passcode" + type.replace(/ /g, "-");

      $list +=
          '<tr>\
          <td>\
              <label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect mdl-data-table__select" for="' + idName + '">\
                            <input type="checkbox" id="' + idName + '" class="mdl-checkbox__input" />\
                            </label>\
                        </td>\
                        <td class="mdl-data-table__cell--non-numeric">' + type + '</td>\
                        <td>' + sortedCards[i].data.length + '</td></tr>';
    }

    $list += '</tbody></table>';

    $list = $($list);
    $list.prependTo("#passcode-table-panel");
  }

  /**
   * Upload passcode data to the server, with a callback. This function does
   * NOT do any UI change
   * @param {function} callback - the callback function on success
   */
  function uploadPasscodeData(callback) {
    chrome.runtime.sendMessage({
      task: "passcodeSave",
      data: passcodeSheet.join("\n")
    }, (response) => {
      if (response.fail) {
        $passcodeStatus.addClass(STATUS_RED_CLASS)
            .text(response.data);
        setProgressBarVisibility(false);
        return;
      }

      // Success!
      if (typeof callback === "function") {
        callback();
      }

      // Refresh the table because something was just changed
      updateTableInformation();
    });
  }


  /**
   * Get recent redemption history
   * @param passcodeSheet - the passcode sheet
   * @param num - the limit of number to be shown on the table
   */
  function getRecentHistory(passcodeSheet, num) {
    num = num || 50;

    var recentHistory = passcodeSheet.sort((lhs, rhs) => {
      return (Date.parse(rhs[4] || 0) || 0) - (Date.parse(lhs[4] || 0) || 0);
    });

    // Remove element shown as redeemed
    for (var i = 0; i !== num; ++i) {
      if (!Date.parse(recentHistory[i][4])) {
        break;
      }
    }

    return recentHistory.slice(0, i);
  }

  /**
   * Append the history to the table
   * @param recentHistory - the recent history
   */
  function appendHistoryToTable(recentHistory) {
    for (var i = 0; i !== recentHistory.length; ++i) {
      addEntryToPasscodeHistory(recentHistory[i][2],
          recentHistory[i][6],
          recentHistory[i][5],
          recentHistory[i][4],
          recentHistory[i][1] + " (" + recentHistory[i][0] + ")");
    }
  }

  /**
   * Check for `passcodeQueryIndex` to disable/enable it
   */
  function refreshPasscodeQueryEditability() {
    $(".passcode-query-edit").prop("disabled", passcodeQueryIndex >= 0);
  }

  var passcodeSheet,
      passcodeQueryIndex = -1,
      isNetworkBusy = false;

  setProgressBarVisibility(true);

  $("#passcode-status").removeClass(STATUS_RED_CLASS).text("Fetching ...");

  $(".passcode-query-edit").each(function(i) {
    $(this).keypress(function(e) {
      if (e.which === 13) {
        if (passcodeQueryIndex >= 0) {
          // Change the item
          var val = $(this).val();

          if (passcodeSheet[passcodeQueryIndex][i] != val) {
            if (!isNetworkBusy) {
              setProgressBarVisibility(true);
              isNetworkBusy = true;
              $("#passcode-status").text("Updating ...");

              passcodeSheet[passcodeQueryIndex][i] = val;
              uploadPasscodeData(() => {
                setProgressBarVisibility(false);
                isNetworkBusy = false;
                $("#passcode-status").text("Done");
              });
            }
          }
        }
        return false;
      }

    });
  });

  // In ADD panel, enable go to next input on enter
  $(".passcode-add-input").each(function(i) {
    $(this).keypress(function(e) {
      if (e.which === 13) {
        // Test if this is textarea because we want to add a new line
        // if it is
        if (!$(this).hasClass("passcode-add-textarea")) {
          // No it's not
          $(this)
              .parent()
              .parent()
              .next()
              .children()
              .children()
              .focus();
        }
      }
    });
  });

  // In ADD panel, add the passcode on ctrl+enter
  $(".passcode-add-textarea").keydown(function(e) {
    if (e.ctrlKey && e.keyCode === 13) {
      setProgressBarVisibility(true);
      $("#passcode-status")
          .removeClass(STATUS_RED_CLASS)
          .text("Uploading new passcode ...");

      // Get the data from UI
      var anomaly, type, owner, passcode;
      $(".passcode-add-input").each(function(i) {
        switch (i) {
          case 0:
            anomaly = $(this).val();
            break;
          case 1:
            type = $(this).val();
            break;
          case 2:
            owner = $(this).val();
            break;
          case 3:
            passcode = $(this).val().toUpperCase().split('\n');
            break;
        }
      });

      // Test for validity
      if (!anomaly || !type || !owner || !passcode || !passcode.length) {
        setProgressBarVisibility(false);
        $("#passcode-status")
            .addClass(STATUS_RED_CLASS)
            .text("Missing information");
        return false;
      }

      for (var i = 0; i != passcode.length; ++i) {
        if (passcode[i] || passcode[i].length == 0) {
          passcodeSheet.push([
            anomaly,
            type,
            passcode[i],
            owner,
            "",
            "",
            "",
            new Date().toISOString()
          ]);
        }
      }

      // Upload it
      uploadPasscodeData(() => {
        // Clean the UI to avoid multiple upload
        $(".passcode-add-input").val("");

        setProgressBarVisibility(false);
        $("#passcode-status")
            .removeClass(STATUS_RED_CLASS)
            .text("Uploaded");
      })
    }
  });

  chrome.runtime.sendMessage({task: "passcodeFetch"}, (response) => {
    setProgressBarVisibility(false);

    // Test if fetching is successful
    if (response.fail) {
      $("#passcode-status")
          .addClass(STATUS_RED_CLASS)
          .text(response.data);
      return;
    }

    passcodeSheet = processRawData(response.data);

    // Update the history
    clearHistoryTable();
    var recentHistory = getRecentHistory(passcodeSheet);
    appendHistoryToTable(recentHistory);

    // Process the cards to be shown in the dialog
    var eligibleCards = getEligibleCards(passcodeSheet),
        sortedCards = getSortedCards(eligibleCards);

    // Construct DOMs
    constructPasscodeTable(sortedCards);

    // Append the action bar
    appendActionBar();

    // Update message
    var $passcodeStatus = $("#passcode-status");
    $passcodeStatus.text("Fetched");

    componentHandler.upgradeDom();

    // These can only be done when all the components are loaded
    setProgressBarVisibility(false);
    $("#passcode-table").find("td:nth-child(1)").width(0);

    // Add event listener for changing the amount of passcode to be fetched
    var $passcodeAmount = $("#passcode-amount");
    $("#passcode-amount-plus").unbind("click").click(() => {
      $passcodeAmount.text(1 + parseInt($passcodeAmount.text()));
    });
    $("#passcode-amount-minus").unbind("click").click(() => {
      $passcodeAmount.text((parseInt($passcodeAmount.text()) - 1) || 1);
    });

    // Add event listener: save the data
    $("#passcode-get").unbind("click").click(() => {
      setProgressBarVisibility(true);
      $passcodeStatus.removeClass(STATUS_RED_CLASS)
          .text("Updating passcode ...");

      // Get the transantion ID and amount of money
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id,
            {method: "fetchActiveTabHtml"},
            function(html) {
              if (html.method === "fetchActiveTabHtml") {
                var __ret = getTransactionIDandTotalFromPage({
                  data: html.data,
                  url : tab.url
                });
                var transactionID = __ret.transactionID;
                var total = __ret.total;

                // Abort if no transaction ID and total is fetched
                if (!transactionID || !total) {
                  $passcodeStatus
                      .addClass(STATUS_RED_CLASS)
                      .text("No transaction ID or total found");
                  setProgressBarVisibility(false);
                  return;
                }

                // Get the types of passcode to be fetched
                $("#passcode-table")
                    .find("input")
                    .each(function(index) {
                      if ($(this).prop("checked")) {
                        // This is selected
                        sortedCards[index].selected = true;
                      }
                    });

                // Get the indices of passcode to be fetched
                var indexToBeProcessed = [],
                    passcodeResult = "",
                    passcodeAmount = parseInt($passcodeAmount.text());
                $.each(sortedCards, (index, data) => {
                  if (data.selected) {
                    // Yes this is a type of which we want code
                    for (var i = 0;
                         i < passcodeAmount && i < data.data.length;
                         ++i) {
                      var index = data.data[i];

                      indexToBeProcessed.push(index); // 0
                                                      // for
                                                      // fetching
                                                      // the
                                                      // first
                                                      // element
                      passcodeResult += data.type + " " + passcodeSheet[index][2] + "\n";
                    }
                  }
                });

                // Abort if nothing is selected
                if (!indexToBeProcessed.length) {
                  $passcodeStatus
                      .addClass(STATUS_RED_CLASS)
                      .text("Nothing is selected");
                  setProgressBarVisibility(false);
                  return;
                }

                // Update the passcode sheet
                $.each(indexToBeProcessed, (i, index) => { // `index` is what we want
                  passcodeSheet[index][4] = new Date().toISOString();
                  passcodeSheet[index][5] = (total / indexToBeProcessed.length).toFixed(
                      2);
                  passcodeSheet[index][6] = transactionID;
                });

                // Finally, upload it
                uploadPasscodeData(() => {
                  passcodeResult = passcodeResult.substr(0,
                      passcodeResult.length - 1);
                  $("#passcode-result").val(passcodeResult);
                  $("#passcode-copy").prop("disabled", false);
                });
              }
            });
      });

    });

    // Add event listener for copy
    $("#passcode-copy").unbind("click").click(() => {
      // Copy to the clipboard
      var result = document.getElementById("passcode-result");
      result.focus();
      result.setSelectionRange(0, result.value.length);

      document.execCommand("copy");
    });

    // Add event listener for querying the passcode
    $("#passcode-query").unbind("input").on("input", () => {
      var query = $("#passcode-query").val().toUpperCase();

      passcodeQueryIndex = -1;

      if (query.length >= 3) {
        // Do a linear search
        for (var i = 0; i !== passcodeSheet.length; ++i) {
          if (passcodeSheet[i][2].startsWith(query)) {
            if (passcodeQueryIndex !== -1) {
              // Multiple entries found
              passcodeQueryIndex = -2;
              break;
            }

            passcodeQueryIndex = i;
          }
        }

        if (passcodeQueryIndex === -1) {
          // Nothing found
          $passcodeStatus.addClass(STATUS_RED_CLASS)
              .text("Not found");
        } else if (passcodeQueryIndex === -2) {
          // Multiple found
          $passcodeStatus.removeClass(STATUS_RED_CLASS)
              .text("Multiple found");
        } else {
          // Found a single one
          $passcodeStatus.removeClass(STATUS_RED_CLASS).text("Found");
        }

        // Display the result
        var result = passcodeSheet[passcodeQueryIndex] || [];

        $("#passcode-query-result")
            .find(".passcode-query-edit")
            .each(function(index) {
              var text = result[index],
                  placeholder = "",
                  elemClass;

              if (text === undefined) {
                text = "";
                placeholder = "N/A";
                elemClass = STATUS_RED_CLASS;
              } else if (text === "") {
                text = "";
                placeholder = "[Empty]";
                elemClass = STATUS_RED_CLASS;
              }

              $(this)
                  .prop({
                    class      : "passcode-query-edit",
                    value      : text,
                    placeholder: placeholder
                  })
                  .addClass(elemClass)
                  .val(text);

              // Render the class if hit certain word
              if (text === "eBay" || !$(this)
                      .hasClass(STATUS_RED_CLASS) && $(this)
                      .parent()
                      .prev()
                      .text() === "Redeemed at") {
                $(this).addClass(STATUS_GREEN_CLASS);
              }
            });
      } else {
        $(".passcode-query-edit").val("");
      }
    });
  });


  $("#passcode-fetcher").fadeIn();
}

$(document).ready(() => {
  updateTableInformation();
});


