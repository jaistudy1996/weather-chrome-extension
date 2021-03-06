/* jshint esversion:6 */

//TODO Change icons
//TODO Add important alerts from darksky
//TODOD clear intervals on update.
//TODO make creation of notification a seperate funtion
//TODO Fix weather does not update after computer wakes up from sleep. Webworker maybe?
//TODO Fix bug where updated alert clears the end of alert that was retrieved in update before that update
//TODOD fix bug in getLocation where the refresh is not working. remove test to undefined


// Global variables
var ERROR = "error";
var locationCords = {};
var openWeatherMapKey = 'bad43f7b54535ae3baeb52cbe1beff28';
var googleMapsApiKey = "AIzaSyDizy6zNKrzN5nSZF7uoDmV_UQZM4aEfUI";
var googelMapsLatLngKey = "AIzaSyD2gNxs_Kcp_QMcoEfndYw0L4ykMG3P-24";
var weatherUnits = "Metric"; //Default: Kelvin, Metric: Celsius, Imperial: Fahrenheit.
var ACTION = ""; //action string "change loc"
var INTERVALS = []; // initialize array to store all intervals.

/**
 * @function getLocation Get user's current location
 * @return {[type]} [description]
 */
function getLocation() {
  if ("geolocation" in navigator) {
    locationCords.status = "available";
    navigator.geolocation.getCurrentPosition(loc_success, loc_error);
  }
	else {
    locationCords.status = ERROR;
		getWeather(locationCords);
  }
}

/**
 * @function loc_success this function is a callback when locaitons are returned successfully
 */
function loc_success(position) {
  let lat = position.coords.latitude;
  let lng = position.coords.longitude;

  locationCords.lat = lat;
  locationCords.lng = lng;

  getWeather(locationCords); // call this funtion everytime we have new location cordinats.
  //getAlerts(locationCords);
}

/**
 * @function loc_error this function is a callback when there is an error with locations
 */
function loc_error() {
  locationCords.status = ERROR;
  getWeather(locationCords); // call this funtion even if we have errors
  //getAlerts(locationCords);
}

// run for the first time.
getLocation();

// set interval to check for location every 15 minutes.
var intvlGetLoc = setInterval(function(){
	let localDate = new Date();
	console.log("Last updated at: ", localDate.getTime());
	getLocation();
}, 600000);

/**
 * This function will get latest weather update
 * @function getWeather
 * @param {object} _locationCords containing lat and lng properties respectively
 */
function getWeather(_locationCords) {
  if (_locationCords.lat != undefined && _locationCords.lng != undefined) {
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    let url = `http://api.openweathermap.org/data/2.5/weather?lat=${_locationCords.lat}&lon=${_locationCords.lng}&units=${weatherUnits}&APPID=${openWeatherMapKey}`;
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        console.log(xhr.response);
        // chrome.browserAction.setBadgeText({
        //   text: `${xhr.response.main.temp}${weatherUnits == "Metric" ? "C" : "F"}`
        // });
        chrome.browserAction.setTitle({
          title: `${xhr.response.name}: ${xhr.response.main.temp_min}° - ${xhr.response.main.temp_max}°:  ${xhr.response.weather[0].description}`
        });
				// original URL: http://openweathermap.org/img/w/${xhr.response.weather[0].icon}.png
				// after using RSZ.io http://openweathermap.org.rsz.io/img/w/${xhr.response.weather[0].icon}.png
        chrome.browserAction.setIcon({
          imageData: {'16': drawIcon(16, `${Math.round(xhr.response.main.temp)}`),
											'19': drawIcon(19, `${Math.round(xhr.response.main.temp)}`),
											'38': drawIcon(38, `${Math.round(xhr.response.main.temp)}`),
											'48': drawIcon(48, `${Math.round(xhr.response.main.temp)}`),
											'128': drawIcon(128, `${Math.round(xhr.response.main.temp)}`)
								}
        });
        chrome.browserAction.setBadgeBackgroundColor({
          color: [0, 0, 0, 1]
        });
      }
    };
    xhr.open("GET", url, true);
    xhr.send();
  } else {
    // get location based on IP is navigator is not available
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    let url = 'http://freegeoip.net/json/';
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        ACTION = "change loc";
        getLatLngForSelectedSuggestion(`${xhr.response.city}, ${xhr.response.region_code}, ${xhr.response.country_name}`);
      } else if (this.status == 403) {
        getWeather(_locationCords = {
          lat: undefined,
          lng: undefined
        });
        //getAlerts(_locationCords);
        //no need to call getAlerts when there are no lat and lng available
        //getWeather should remain independent from any other funtions
      }
    };
    xhr.open("GET", url, true);
    xhr.send();
  }
}

/**
 * @function loadScript
 * Load Google maps api script.
 */
function loadScript() {
  let script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.defer = true;
  script.src = "https://maps.googleapis.com/maps/api/js";
  let head = document.getElementsByTagName("head")[0];
  head.appendChild(script);
}

loadScript();


var omniboxSuggestionArray;
/**
 * @function omniboxSuggestions this funtion shows relevant suggestions in the chrome for locations
 * @param {string} user_input The string input by the user
 * @param {function} suggest this is the internal chrome funtion that shows suggestions in address bar
 */
function omniboxSuggestions(user_input, suggest) {
  let xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${user_input}&key=${googleMapsApiKey}`;
  xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log(xhr.response);
      let suggestions = [];
      for (let i = 0; i < xhr.response.predictions.length; i++) {
        suggestions.push({
          content: xhr.response.predictions[i].description,
          description: xhr.response.predictions[i].description
        });
      }
      suggest(suggestions);
    }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

/**
 * @function getLatLngForSelectedSuggestion this function will get lat and lng for suggestion
 * @param {string} address string text
 */
function getLatLngForSelectedSuggestion(address) {
  let xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${googelMapsLatLngKey}`;
  xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log(xhr.response);
      let _locationCords = {};
      _locationCords.lat = xhr.response.results[0].geometry.location.lat;
      _locationCords.lng = xhr.response.results[0].geometry.location.lng;
      if (ACTION === "change loc") {
        // console.log(ACTION, _locationCords);
        locationCords = _locationCords;
        //getAlerts(_locationCords);
        ACTION = "";
      }
      getWeather(_locationCords);
    }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

/**
 * Add click listener to icon which will trigger getLocation to get new weather and new location.
 */
chrome.browserAction.onClicked.addListener(function() {
  getWeather(locationCords);
	//getAlerts(locationCords);
});

chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    // suggest is a function that takes an array of objects containing content and description
    if (text.includes("change location ") || text.includes("change location")) {
      console.log(text.replace("change location ", ""));
      ACTION = "change loc";
      omniboxSuggestions(text.replace("change location", ""), suggest);
    } else if (text.includes("change units ") || text.includes("change units")) {
      suggest([{
          content: "F",
          description: "Fahrenheit"
        },
        {
          content: "C",
          description: "Celsius"
        },
        {
          content: "K",
          description: "Kelvin"
        }
      ]);
    } else {
      omniboxSuggestions(text, suggest);
    }

    // console.log('inputChanged: ' + text);
  });

// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(
  function(text) {
    // console.log('inputEntered: ' + text);
    // Change units and refresh weather.
    text.includes("change units ") ? (text = text.replace("change units ")) : (text = text.replace("change units"));
    if (["F", "f"].indexOf(text[0]) > -1) {
      weatherUnits = "Imperial";
      getWeather(locationCords);
      return;
    } else if (["C", "c"].indexOf(text[0]) > -1) {
      weatherUnits = "Metric";
      getWeather(locationCords);
      return;
    } else if (["K", "k"].indexOf(text[0]) > -1) {
      weatherUnits = "Default";
      getWeather(locationCords);
      return;
    }
    getLatLngForSelectedSuggestion(text);
  });

/**
 * @function getAlerts get warning alerts from darksky api
 * @param {object} _locationCords location object with lat and lng
 */
function getAlerts(_locationCords) {
  let xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  let url = `https://api.darksky.net/forecast/08ac2bd43d658159d9a934bb46167302/${_locationCords.lat},${_locationCords.lng}/`;
  xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      // console.log(xhr.response);
      let lastNotifCounter = "";
			intervalClearer(); // this will clear all existing intervals on update of data.
												 // if there are new updates they will be added otherwise old ones
												 // will be removed
      for (let i = 0; i < xhr.response.hourly.data.length; i++) {
        if (xhr.response.hourly.data[i].precipProbability > 0.05 && (lastNotifCounter === "")) {
          // console.log("interval set :", i);
          // console.log(xhr.response.hourly.data[i]);
          lastNotifCounter = i;
					let intvl = setInterval(function(){
						chrome.notifications.create(`weather_update_${i}`, {
					    type: 'basic',
					    iconUrl: '../../icons/sun64.png',
					    title: "Weather Update",
					    message: `${xhr.response.hourly.data[i].summary} in 30 minutes`,
					    requireInteraction: true
					  }, function() {  });
					  clearInterval(intvl);
					}, (xhr.response.hourly.data[i].time - 1800 - Math.round(Date.now() / 1000)) * 1000);
					INTERVALS.push(intvl);
          // subtract 30 mins to show notification 30 mins before it rains.
          continue;
					// if it is raining for few hours take dont add notification
        }
				else if (xhr.response.hourly.data[i].precipProbability <= 0.05 && (lastNotifCounter !== "") && (i > lastNotifCounter)) {
					// console.log("2 interval set :", i);
          // console.log("2", xhr.response.hourly.data[i]);
					let intvl = setInterval(function(){
						chrome.notifications.create(`weather_update_${i}`, {
					    type: 'basic',
					    iconUrl: '../../icons/sun64.png',
					    title: "Weather Update",
					    message: `${xhr.response.hourly.data[i].summary} in 30 minutes`,
					    requireInteraction: true
					  }, function() {  });
					  clearInterval(intvl);
					}, (xhr.response.hourly.data[i].time - 1800 - Math.round(Date.now() / 1000)) * 1000);
					INTERVALS.push(intvl);
          // subtract 30 mins to show notification 30 mins before it rains.
          lastNotifCounter = "";
        }
      }
			console.log(INTERVALS);
    }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

/**
 * @function intervalClearer Clear INTERVALS object and intervals in it as well.
 */
function intervalClearer(){
	for(let i = 0; i<INTERVALS.length; i++){
		clearInterval(INTERVALS[i]);
	}
	INTERVALS = [];
}

/**
 * @function drawIcon This function will draw the icon in numbers
 * @param {number} pixels Number of pixels for height and width of icon
 * @param  {string} temp Temperature to be displayed
 * @return {binary}      Binary imageData is returned.
 */
function drawIcon(pixels, temp){
	let canvas = document.createElement("canvas");
	canvas.height = pixels;
	canvas.width = pixels;

	let context = canvas.getContext("2d");
	context.fillStyle = "rgba(255, 255, 255, 0.5)";//"#FFFFFF";
  context.fillRect(0, 0, pixels, pixels);

  context.fillStyle = "#000000";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${pixels-(0.1*pixels)}px Arial`;
  context.fillText(temp, pixels/2, pixels/2);

  return context.getImageData(0, 0, pixels, pixels);
}
