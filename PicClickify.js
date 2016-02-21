(function() {
  'use strict';

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
      callback(img.src, img);
    }
  }

  var checkIn = "2016-03-04";
  var checkOut = "2016-03-07";
  var fromDate = "2016-03-04";
  var toDate = "2016-03-07";
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
              if (ourAirport === destAirport) {
                overLayText(img, landmark + ": You live close by!");
                return;
              }
              getLowFare(
                ourAirport,
                destAirport,
                fromDate,
                toDate,
                function(data) {
                  var flight1 = data.results[0].itineraries[0].inbound.flights[0].flight_number;
                  var flight2 = data.results[0].itineraries[0].outbound.flights[0].flight_number;
                  var flightFare = data.results[0].fare.total_price;

                  getCheapestHotel(
                    coords.latitude,
                    coords.longitude,
                    45,
                    checkIn,
                    checkOut,
                    function(data) {
                      var total = Number(flightFare);
                      var hotelName;
                      if (data.results && data.results.length > 0) {
                        var hotelPrice = data.results[0].total_price.amount;
                        hotelName = data.results[0].property_name;
                        total += Number(hotelPrice);
                      }
                      var urlPrefix = "http://google.com/search?q=";
                      var hotelURL;
                      if(hotelName) {
                        hotelURL = urlPrefix + hotelName;
                      }
                      var flightURL =
                        "https://www.google.com/flights/#search" +
                        ";f=" + ourAirport +
                        ";t=" + destAirport +
                        ";d=" + fromDate +
                        ";r="+ toDate;

                      total = total.toFixed(0);
                      overLayText(img, "Visit " + landmark + ": $" + total + "\n", hotelURL, flightURL, urlPrefix + landmark);
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
        "&return_date=" + returnDate +
        "&number_of_results=" + "1" +
        "&non_stop=" + "false",
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

  var ourAirport = "ORD";
  /*getLocation(
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
  );*/

  var imgs = document.getElementsByTagName("img");
  var len = imgs.length;
  if (len > 50) {
    len = 50;
  }
  for (let i = 0; i < len; ++i) {
    if(imgs[i].width < 100 || imgs[i].height < 100) {
      continue;
    }
    setTimeout(
      function() {
        getBase64Image(
          imgs[i],
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
      }, 200 * i);
  }

  function overLayText(img, text, hotelURL, flight1, destinationURL) {
    var parentNode = img.parentNode;
    var height = img.height;
    var width = img.width;

    var newDiv = document.createElement('div');

    newDiv.style.cssText = `
      position: absolute;
      height: ${height}px;
      width: ${width}px;
      z-index: 999999;
    `;

    if (hotelURL) {
      newDiv.innerHTML = `
      <div class="ClickPicOverlay">
        <div>
        ${text}
        </div>
        <br>
        <div><a class="ClickPicAnchor" href="${hotelURL}" target="_blank"> <i class="fa fa-bed grow shrink"></i></a></div>
        <div><a class="ClickPicAnchor" href="${flight1}" target="_blank"><i class="fa fa-plane grow shrink"></i></a></div>
        <div><a class="ClickPicAnchor" href="${destinationURL}" target="_blank"> <i class="fa fa-search grow shrink"></i></a></div>
      </div>
      `;
    } else {
      newDiv.innerHTML = `
      <div class="ClickPicOverlay">
        <div>
        ${text}
        </div>
        <br>
        <div><a class="ClickPicAnchor" href="${flight1}" target="_blank"><i class="fa fa-plane grow shrink"></i></a></div>
        <div><a class="ClickPicAnchor" href="${destinationURL}" target="_blank"><i class="fa fa-search grow shrink"></i></a></div>
      </div>
      `;
    }

    cancelEvents(newDiv);

    parentNode.insertBefore(newDiv, parentNode.firstChild);
  }

  function cancelEvents(div) {
    div.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

}());
