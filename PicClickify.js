function convertFileToDataURLviaFileReader(url, callback, img) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
        callback(reader.result, img);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.send();
}

function getBase64Image(img, callback) {
  console.log(img.src);
  var prefix = img.src.substr(0, 4);
  if (prefix === "data") {
    convertFileToDataURLviaFileReader(img.src, callback, img);
  } else if(prefix === "http"){
    callback(img.src);
  }
}

function createFunc(img) {
  return function(data) {
    if (data && data.responses[0] && data.responses[0].landmarkAnnotations && data.responses[0].landmarkAnnotations[0].description) {
      console.log(data.responses[0].landmarkAnnotations[0].description + "\n");
    }
  }
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
              success: createFunc(htmlImg),
              error: function(xhr, ajaxOptions, thrownError) {
                console.log(xhr.responseText);
              }
            });
          }
        }
      )
    }, 300 * i);
}
