function initMap(servicePointsInput) {
  var points = [];
  var markers = [];
  var polygon;
  var showPolygon = document.querySelector("#showPolygonControl").checked;
  var showMarkers = document.querySelector("#showMarkersControl").checked;
  var clickToPlace = true;
  var clickToDelete = true;

  const map = new google.maps.Map(document.getElementById("serviceAreaMap"), {
    center: { lat: 32.783333, lng: -79.933333 },
    zoom: 11,
    disableDefaultUI: true
  });

  initZoomControl();
  initMapTypeControl();
  initPoints();
  updatePolygon();
  updateMarkers();
  enableControls();

  function initZoomControl() {
    document.querySelector(".zoom-control-in").onclick = function() {
      map.setZoom(map.getZoom() + 1);
    };
    document.querySelector(".zoom-control-out").onclick = function() {
      map.setZoom(map.getZoom() - 1);
    };
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      document.querySelector(".zoom-control")
    );
  }

  function initMapTypeControl() {
    const mapTypeControlDiv = document.querySelector(".maptype-control");

    document.querySelector(".maptype-control-map").onclick = function() {
      mapTypeControlDiv.classList.add("maptype-control-is-map");
      mapTypeControlDiv.classList.remove("maptype-control-is-satellite");
      map.setMapTypeId("roadmap");
    };

    document.querySelector(".maptype-control-satellite").onclick = function() {
      mapTypeControlDiv.classList.remove("maptype-control-is-map");
      mapTypeControlDiv.classList.add("maptype-control-is-satellite");
      map.setMapTypeId("hybrid");
    };
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(mapTypeControlDiv);
  }

  function initPoints() {
    var parts = servicePointsInput.split(",");
    for (i = 0; i + 1 < parts.length; i+=2) {
      points.push({ lat: parseFloat(parts[i]), lng: parseFloat(parts[i+1]) })
    }
  }

  function updatePolygon() {
    if (polygon) {
      polygon.setMap(null);
    }
    if (showPolygon) {
      polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: "#dd8888",
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
        fillColor: "#ffcccc",
        fillOpacity: 0.33
      });
      google.maps.event.addListener(polygon, "click", handleClick)
      polygon.setMap(map)
    }
  }

  function updateMarkers() {
    for (var i = 0; i < markers.length; ++i) {
      markers[i].setMap(null);
    }
    markers = []
    if (showMarkers) {
      for (var i = 0; i < points.length; ++i) {
        markers.push(createMarker(points[i]))
      }
    }
  }

  function createMarker(point) {
    var marker = new google.maps.Marker({
      position: point,
      draggable: true,
      map: map
    })
    google.maps.event.addListener(marker, "click", function() {
      if (clickToDelete) {
        deletePointOfMarker(marker);
      }
    })
    google.maps.event.addListener(marker, "dragend", function() {
      point.lat = marker.position.lat()
      point.lng = marker.position.lng()
      updateAll()
    })
    return marker;
  }

  function deletePointOfMarker(marker) {
    points.splice(findMarker(marker), 1)
    updateAll();
  }

  function findMarker(marker) {
    for (var i = 0; i < markers.length; ++i) {
      if (markers[i] === marker) {
        return i;
      }
    }
    return -1;
  }

  function enableControls() {
    document.querySelector("#showPolygonControl").onchange = function(event) {
      showPolygon = event.target.checked;
      updatePolygon();
    }
    document.querySelector("#showMarkersControl").onchange = function(event) {
      showMarkers = event.target.checked;
      updateMarkers();
    }
    document.querySelector("#clickToPlaceControl").onchange = function(event) {
      clickToPlace = event.target.checked;
    }
    document.querySelector("#clickToDeleteControl").onchange = function(event) {
      clickToDelete = event.target.checked;
    }
    google.maps.event.addListener(map, "click", handleClick);
  }

  function handleClick(event) {
    if (clickToPlace) {
      placePoint({ lat: event.latLng.lat(), lng: event.latLng.lng() })
    }
  }

  function placePoint(point) {
    var insertAt = 0;
    var minDistance = false;
    forEachPairOfPoints(function(p1, p2, index) {
      var d = distancePointAndSegment(point, [ p1, p2 ])
      if (minDistance === false || d < minDistance) {
        minDistance = d;
        insertAt = index + 1;
      }
    })
    points.splice(insertAt, 0, point)
    updateAll();
  }

  function updateAll() {
    updatePolygon();
    updateMarkers();
    updateFormValues()
  }

  function forEachPairOfPoints(func) {
    for (i = 0; i < points.length; ++i) {
      func(points[i], points[(i + 1) % points.length], i)
    }
  }

  function distancePointAndSegment(p, seg) {
    function pDistance(x, y, x1, y1, x2, y2) {
      var A = x - x1;
      var B = y - y1;
      var C = x2 - x1;
      var D = y2 - y1;

      var dot = A * C + B * D;
      var len_sq = C * C + D * D;
      var param = -1;
      if (len_sq != 0) param = dot / len_sq;

      var xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      }
      else if (param > 1) {
        xx = x2;
        yy = y2;
      }
      else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      var dx = x - xx;
      var dy = y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    }
    return pDistance(p.lat, p.lng, seg[0].lat, seg[0].lng, seg[1].lat, seg[1].lng)
  }

  function updateFormValues() {
    document.querySelector("input[name='serviceArea']").value = serializePoints(points);
  }

  function serializePoints() {
    var buf = "";
    for (i = 0; i < points.length; ++i) {
      if (buf.length > 0) buf += ",";
      buf += points[i].lat.toString()
      buf += ",";
      buf += points[i].lng.toString()
    }
    return buf;
  }
}
