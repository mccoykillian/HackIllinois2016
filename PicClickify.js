function convertFileToDataURLviaFileReader(url, callback, img) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = 'blob';
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result, img);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.send();
}

function getBase64Image(img, callback) {
  var prefix = img.src.substr(0, 4);
  if (prefix === "http") {
    convertFileToDataURLviaFileReader(img.src, callback, img);
  } else if (prefix === "data") {
    callback(img.src);
  }
}

var fromDate = "2016-03-04";
var toDate = "2016-03-11";

// TODO: clean method up. Can locations even not exist? If it doesn't exist, should search for it
function getLandmarkReqCallback(img) {
  return function(data) {
    if (data && data.responses[0] && data.responses[0].landmarkAnnotations && data.responses[0].landmarkAnnotations[0].description) {
      var landmark = data.responses[0].landmarkAnnotations[0].description;
      console.log("Landmark: " + landmark + "\n");
      if (data.responses[0].landmarkAnnotations[0].locations) {
        var coords = data.responses[0].landmarkAnnotations[0].locations[0].latLng;
        getNearestAirport(
          coords.latitude,
          coords.longitude,
          function(data) {
            var destAirport = data[0].airport;
            getLowFare(
              ourAirport,
              destAirport,
              fromDate,
              toDate,
              function(data) {
                var flight = data.results[0].flight_number;
                var flightFare = data.results[0].fare.total_price;

                getCheapestHotel(
                  coords.latitude,
                  coords.longitude,
                  45,
                  fromDate,
                  toDate,
                  function(data) {
                    var total = Number(flightFare);
                    if(data.results && data.results.length > 0) {
                      var hotelPrice = data.results[0].total_price.amount;
                      var hotelName = data.results[0].property_name;
                      total += Number(hotelPrice);
                      total = total.toFixed(0);
                      console.log("Want to visit " + landmark + "? Round-trip air travel and a week-long hotel stay for $" + total + "\n");
                    } else {
                      total = total.toFixed(0);
                      console.log("Want to visit " + landmark + "? Round-trip for as low as $" + total + "\n");
                    }
                  }
                );
              }
            );
          }
        );
      }
    }
  };
}

// TODO: error handling for failed location getting
function getLocation(callback) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(callback);
  } else {
    // for debug purposes, use the lat/long of hack illinois's
    var position;
    position.coords.latitude = config.hack_lat;
    position.coords.longitude = config.hack_long;
    callback(position);
  }
}

function getCheapestHotel(latitude, longitude, radius, checkIn, checkOut, callback) {
  $.ajax({
    url: "https://api.sandbox.amadeus.com/v1.2/hotels/search-circle?apikey=" +
      config.amadeus_key +
      "&latitude=" + latitude +
      "&longitude=" + longitude +
      "&radius=" + radius +
      "&check_in=" + checkIn +
      "&check_out=" + checkOut +
      "&currency=" + "USD" +
      "&number_of_results=" + "1",
    contentType: 'application/x-www-form-urlencoded;charset=utf-8',
    success: callback,
    error: function(xhr, ajaxOptions, thrownError) {
      console.log(xhr.responseText);
    }
  });
}

function getLowFare(origin, destination, departureDate, returnDate, callback) {
  $.ajax({
    url: "https://api.sandbox.amadeus.com/v1.2/flights/low-fare-search?apikey=" +
      config.amadeus_key +
      "&origin=" + origin +
      "&destination=" + destination +
      "&departure_date=" + departureDate +
      "&return_date=" + returnDate,
    contentType: 'application/x-www-form-urlencoded;charset=utf-8',
    success: callback,
    error: function(xhr, ajaxOptions, thrownError) {
      console.log(xhr.responseText);
    }
  });
}

function getNearestAirport(lat, long, callback) {
  $.ajax({
    url: "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" +
      config.amadeus_key +
      "&latitude=" + lat +
      "&longitude=" + long,
    contentType: 'application/x-www-form-urlencoded;charset=utf-8',
    success: callback,
    error: function(xhr, ajaxOptions, thrownError) {
      console.log(xhr.responseText);
    }
  });
}

var ourAiport;
getLocation(
  function(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    console.log("Latitude: " + lat + ", Longitude: " + long);
    getNearestAirport(
      lat,
      long,
      function(data) {
        ourAirport = data[0].airport;
        console.log("OUR AIRPORT: " + ourAirport + "\n");
      }
    );
  }
);

var imgs = document.getElementsByTagName("img");
var len = imgs.length;
if (len > 15) {
  len = 15;
}
var index = 0;
for (var i = 0; i < len; ++i) {
  setTimeout(
    function() {
      getBase64Image(
        imgs[index++],
        function(dato, htmlImg) {
          if (dato) {
            dato = dato.substring(dato.indexOf("base64,") + 7);

            $.ajax({
              url: "https://vision.googleapis.com/v1/images:annotate?key=" + config.browser_key,
              type: 'POST',
              dataType: 'json',
              contentType: 'application/json',
              processData: true,
              data: '{"requests": [{ "image" : {"content": "' + dato + '"},"features": [{"type": "LANDMARK_DETECTION","maxResults": 1}]}]}',
              success: getLandmarkReqCallback(htmlImg),
              error: function(xhr, ajaxOptions, thrownError) {
                console.log(xhr.responseText);
              }
            });
          }
        }
      );
    }, 300 * i);
}
