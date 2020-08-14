function initMap(servicePointsInput) {
  var points = [];
  var polygon;

  // Hook up embedded Map.
  const map = new google.maps.Map(document.getElementById("serviceAreaMap"), {
    center: { lat: 32.783333, lng: -79.933333 },
    zoom: 11,
    disableDefaultUI: true,
    mapTypeControl: false
  });

  initPoints();
  updatePolygon();
  clickToAdd();

  function initPoints() {
    var parts = servicePointsInput.split(",");
    for (i = 0; i + 1 < parts.length; i+=2) {
      var lat = parseFloat(parts[i])
      var lng = parseFloat(parts[i+1])
      console.log(lat, lng);
      placeMarker(new google.maps.LatLng(lat, lng))
    }
  }

  function clickToAdd() {
    google.maps.event.addListener(map, "click", function(event) {
      addPoint(event.latLng);
    })
  }

  function placeMarker(position) {
    const marker = new google.maps.Marker({
      position: position,
      map: map
    })
    google.maps.event.addListener(marker, 'click', function() {
      removeMarker(marker)
    })
    points.push({
      position: position,
      marker: marker
    })
  }

  function addPoint(position) {
    placeMarker(position)
    updateComputed()
  }

  function removeMarker(marker) {
    console.log(marker);
    for (var i = 0; i < points.length; ++i) {
      if (points[i].marker == marker) {
        points.splice(i, 1)
        break;
      }
    }
    marker.setMap(null);
    updateComputed()
  }

  function updateComputed() {
    document.querySelector("input[name='servicePoints']").value = serializePoints(points);
    updatePolygon()
  }

  function updatePolygon() {
    const polygonCoords = computePolygonCoords()
    if (polygon) {
      polygon.setMap(null);
    }
    polygon = new google.maps.Polygon({
      paths: polygonCoords,
      strokeColor: "#ffcccc",
      strokeOpacity: 0.8,
      strokeWeight: 1.5,
      fillColor: "#ffcccc",
      fillOpacity: 0.33
    })
    polygon.setMap(map)
  }

  function computePolygonCoords() {
    var polygonCoords = [];
    for (var i = 0; i < points.length; ++i) {
      polygonCoords.push({ lat: points[i].position.lat(), lng: points[i].position.lng() })
    }
    return polygonCoords;
  }

  function serializePoints() {
    var buf = "";
    for (var i = 0; i < points.length; ++i) {
      if (buf.length > 0) buf += ",";
      buf += points[i].position.lat().toString();
      buf += ",";
      buf += points[i].position.lng().toString();
    }
  }
}
