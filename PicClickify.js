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
  } else if(prefix === "data"){
    callback(img.src);
  }
}

function getLandmarkReqCallback(img) {
  return function(data) {
    if (data && data.responses[0] && data.responses[0].landmarkAnnotations && data.responses[0].landmarkAnnotations[0].description) {
      console.log(data.responses[0].landmarkAnnotations[0].description + "\n");
    }
  };
}

function getLocation(callback) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(callback);
  } else {
    // for debug purposes, use the lat/long of hack illinois's
    callback(config.hack_lat, config.hack_long);
  }
}

getLocation(
  function(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    console.log("Latitude: " + lat + ", Longitude: " + long);
    getNearestAirport(
      lat,
      long,
      function(data) {
        console.log("AIRPORT FOUND: " + data[0].airport + "\n");
      }
    );
  }
);

function getNearestAirport(lat, long, callback) {
  $.ajax({
    url: "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" + config.amadeus_key + "&latitude=" + lat + "&longitude=" + long,
    contentType: 'application/x-www-form-urlencoded;charset=utf-8',
    success: callback,
    error: function(xhr, ajaxOptions, thrownError) {
      console.log(xhr.responseText);
    }
  });
}

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
