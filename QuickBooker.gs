var RECURRING_KEY = "recurring";
var ARGUMENTS_KEY = "arguments";

/**
 * Sets up the arguments for the given trigger.
 *
 * @param {Trigger} trigger - The trigger for which the arguments are set up
 * @param {*} functionArguments - The arguments which should be stored for the function call
 * @param {boolean} recurring - Whether the trigger is recurring; if not the 
 *   arguments and the trigger are removed once it called the function
 */
function setupTriggerArguments(trigger, functionArguments, recurring)
{
  var triggerUid = trigger.getUniqueId();
  var triggerData = {};
  triggerData[RECURRING_KEY] = recurring;
  triggerData[ARGUMENTS_KEY] = functionArguments;

  PropertiesService.getScriptProperties().setProperty(triggerUid, JSON.stringify(triggerData));
}

/**
 * Function which should be called when a trigger runs a function. Returns the stored arguments 
 * and deletes the properties entry and trigger if it is not recurring.
 *
 * @param {string} triggerUid - The trigger id
 * @return {*} - The arguments stored for this trigger
 */
function handleTriggered(triggerUid)
{
  var scriptProperties = PropertiesService.getScriptProperties();
  var triggerData = JSON.parse(scriptProperties.getProperty(triggerUid));

  if (!triggerData[RECURRING_KEY])
  {
    deleteTriggerByUid(triggerUid);
  }

  return triggerData[ARGUMENTS_KEY];
}

/**
 * Deletes trigger arguments of the trigger with the given id.
 *
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerArguments(triggerUid)
{
  PropertiesService.getScriptProperties().deleteProperty(triggerUid);
}

/**
 * Deletes a trigger with the given id and its arguments.
 * When no project trigger with the id was found only an error is 
 * logged and the function continues trying to delete the arguments.
 * 
 * @param {string} triggerUid - The trigger id
 */
function deleteTriggerByUid(triggerUid)
{
  if (!ScriptApp.getProjectTriggers().some(function (trigger)
    {
      if (trigger.getUniqueId() === triggerUid)
      {
        ScriptApp.deleteTrigger(trigger);
        return true;
      }

      return false;
    }))
  {
    console.error("Could not find trigger with id '%s'", triggerUid);
  }

  deleteTriggerArguments(triggerUid);
}

/**
 * Deletes a trigger and its arguments.
 * 
 * @param {Trigger} trigger - The trigger
 */
function deleteTrigger(trigger)
{
  ScriptApp.deleteTrigger(trigger);
  deleteTriggerArguments(trigger.getUniqueId());
}


function doPost(e)
{

  var triggerArguments = {
    commandReceived: e.parameter["text"],
    userName: e.parameter["user_name"],
    emailAddress: e.parameter["user_name"] + "@352inc.com",
    responseUrl: e.parameter['response_url']
  };

  var command = triggerArguments.commandReceived;
  var responseRes = triggerArguments.responseUrl;


  if (typeof command == 'undefined' || !command || command.length === 0 ||
    command === "" || !/[^\s]/.test(command) || /^\s*$/.test(command) ||
    command.replace(/\s/g, "") === "")
  {
    showWelcome(responseRes);
    return ContentService.createTextOutput(JSON.stringify(
    {
      text: 'Now, Try Booking a Conference Room!'
    })).setMimeType(ContentService.MimeType.JSON);

  }
  else
  {
    var trigger = ScriptApp.newTrigger('handleBooking').timeBased().after(2).create();
    setupTriggerArguments(trigger, triggerArguments, false);
    return ContentService.createTextOutput(JSON.stringify(
    {
      text: 'Booking Conference Room...Will take a literal minute.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

}


function handleBooking(event)
{
  var argumentsFromTrigger = handleTriggered(event.triggerUid);
  var commandReceived = argumentsFromTrigger.commandReceived;
  var responseURL = argumentsFromTrigger.responseUrl;
  var email = argumentsFromTrigger.emailAddress;

  console.log(argumentsFromTrigger, commandReceived);

  var message = "";

  if (commandReceived.match(/help/) ||
    commandReceived.match(/Help/))
  {
    message = showHelp();
  }
  if (commandReceived.match(/book/) || (commandReceived.match(/tpa/) || commandReceived.match(/TPA/)) || commandReceived.match(/gnv/) || commandReceived.match(/GNV/) ||
    commandReceived.match(/atl/) || commandReceived.match(/ATL/))

  {
    message = book(email, commandReceived);
  }

  sendMessage(message, responseURL);
}

function showHelp()
{
  var message = "*Available commands:*\n\n";
  message += "- *help*: What you see here.\n";
  message += "- *book*: Books a room  (according to your susbcribed google calendar) that has no event for the next hour.\n";
  message += "- *TPA*: Books a room that has no event for the next hour in the Tampa Office.\n";
  message += "- *GNV*: Books a room that has no event for the next hour in the Gainesville Office.\n";
  message += "- *ATL*: Books a room that has no event for the next hour in the Atlanta Office.\n";

  return message;
}

function showWelcome(responseURL)
{
  var message = "*Welcome to Quick Meet!*\n";
  message += "Books a room that is event free for at least the next hour.\n";
  message += "- _Example Booking_ - \n";
  message += "*/meet  TPA* : Will book an open conference room in Tampa\n";
  message += "*/meet book*  --> Books a room that has no event for the next hour in any Office, as long as subscribed.\n";
  message += "*/meet help*  --> Shows all available commands.\n\n";
  message += "*Available commands:*\n\n";
  message += "- *help*: What you see here.\n";
  message += "- *book*: Books a room that is event free for at least the next hour Dependent on your subscribed calendars.\n";
  message += "- *TPA*: Books a room that has no event for the next hour in the Tampa Office.\n";
  message += "- *GNV*: Books a room that has no event for the next hour in the Gainesville Office.\n";
  message += "- *ATL*: Books a room that has no event for the next hour in the Atlanta Office.\n";
  
  sendMessage(message, responseURL)
}


function book(emailAddress, commandReceivedOffice)
{
  var beltlineRoomId = "352inc.com_6d656c4e7773546546556d36374642324e4d72415167@resource.calendar.google.com";
  var piedmontParkRoomId = "352inc.com_55334c5a67766e3031302d4c7a435749345576485f51@resource.calendar.google.com";
  var theGultchRoomId = "352inc.com_77515f76382d764b2d304f30363047675135366c6267@resource.calendar.google.com";
  var roomsInAtlanta = [beltlineRoomId, piedmontParkRoomId, theGultchRoomId];

  var fortDesotoRoomId = "352inc.com_775974472d726e5462556d30444d4f50396f72737077@resource.calendar.google.com";
  var madeiraRoomId = "352inc.com_31782d7065526f7074456149774d50564a7161726e51@resource.calendar.google.com";
  var stPeteBeach = "352inc.com_50415330743169324b6b477575487468623250334c41@resource.calendar.google.com";
  var sunsetBeachRoomId = "352inc.com_50415330743169324b6b477575487468623250334c41@resource.calendar.google.com";
  var roomsInTampa = [fortDesotoRoomId, madeiraRoomId, stPeteBeach, sunsetBeachRoomId];

  var chromeRoomId = "352inc.com_37726846516d335a5f45793949714a61594f754a4677@resource.calendar.google.com";
  var explorerRoomId = "352inc.com_6974416a6c505374616b5330357234464b6a33637267@resource.calendar.google.com";
  var firefoxRoomId = "352inc.com_3038486f464a62464d30362d4b4c767266796c784451@resource.calendar.google.com";

  var incognitoRoomId = "352inc.com_37464750696657486a556d465039457265392d4f4351@resource.calendar.google.com";
  var operaRoomId = "352inc.com_622d544570554146486b7948794742392d4a4c386567@resource.calendar.google.com";
  var safariRoomID = "352inc.com_616c4132465247504f6b6147635f7853555a444e4e41@resource.calendar.google.com";
  var seamonkeyRoomID = "352inc.com_455841424d503651756b6577684a6131326877745541@resource.calendar.google.com";
  var silkRoomId = "352inc.com_467058326657387a6d6b5357415767464e56584d7541@resource.calendar.google.com";
  var roomsInGainesville = [chromeRoomId, explorerRoomId, firefoxRoomId, incognitoRoomId, operaRoomId, safariRoomID, seamonkeyRoomID, silkRoomId];

  var openRoomsName = [];
  var openRoomsId = [];

  var now = new Date();
  var hourFromNow = new Date(now.getTime() + (1 * 60 * 60 * 1000));
  var endMeeting = new Date(now.getTime() + (0.5 * 60 * 60 * 1000));
  var office = [];


  if (commandReceivedOffice == "GNV" || commandReceivedOffice == "gnv")
  {
    office = roomsInGainesville;
    console.log(office, roomsInGainesville)
  }
  else if (commandReceivedOffice == "TPA" || commandReceivedOffice == "tpa")
  {
    office = roomsInAtlanta;
  }
  else if (commandReceivedOffice == "ATL" || commandReceivedOffice == "atl")
  {
    office = roomsInTampa;
  }

  for (var i = 0; i < office.length; i++)
  {
    var calendar = CalendarApp.getCalendarById(office[i]);
    var meetingInTwoHours = calendar.getEvents(now, hourFromNow);

    if (!Array.isArray(meetingInTwoHours) || !meetingInTwoHours.length || !meetingInTwoHours == null)
    {
      openRoomsName.push(calendar.getName().split('-')[1]);
      openRoomsId.push(calendar.getId());
    }
  }

  var roomCalendar = CalendarApp.getCalendarById(openRoomsId[0]);
  if (roomCalendar == null)
  {
    var messageError = "No rooms found in  " + commandReceivedOffice;
    return messageError;
  }
  else
  {
    var stringCalendarObj = openRoomsId[0];
    var eventTitle = "Quick Meeting";
    var myGuests = emailAddress + ',' + stringCalendarObj;

    var event = CalendarApp.createEvent(eventTitle, now, endMeeting,
    {
      guests: myGuests
    });
    var message = 'We booked ' + openRoomsName[0] + '  From right now until ' + endMeeting;

    console.log(myGuests);
    console.log(emailAddress);
    console.log(stringCalendarObj);
    console.log(commandReceivedOffice);
    return message;
  }
}

function sendMessage(message, responseURL)
{
  var payload = {
    "channel": "#" + getProperty("SLACK_CHANNEL_NAME"),
    "text": message
  };

  var options = {
    'method': 'post',
    'payload': JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(responseURL, options);
}

function getProperty(propertyName)
{
  return PropertiesService.getScriptProperties().getProperty(propertyName);
}