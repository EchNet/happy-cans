/**
 * Happy Cans Service Locator.
 */
(function(config) {
  /**
   * UI state.
   */
  var widget;           // The root element of the widget.
  var contentElement;   // The content element of the widget.

  /**
   * Input data.
   */
  var place;            // The most recently selected Place.
  var address;          // The contents of the address field.
  var email;            // The contents of the email field.
  var written;          // Data already written to spreadsheet.

  /**
   * Insert required scripts into the document.
   */
  function insertRequiredScriptElements() {
    var script = document.createElement("script")
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + config.apiKey + "&libraries=places,geometry";
    document.lastChild.appendChild(script)
  }

  /**
   * Insert styles for Google Maps elements into the document.
   */
  function insertRequiredStyles() {
    var sheet = document.createElement("style")
    sheet.innerHTML = 
      ".pac-container { z-index: 10011; } " + 
      ".pac-container, .pac-item { min-width: 300px; font-family: " + config.fontFamily + "; }";
    document.lastChild.appendChild(sheet)
  }

  /**
   * Write data to spreadsheet.
   */
  function writeDataToSpreadsheet() {
    if (!written && address) {
      var ssUrl = "https://us-central1-happy-cans.cloudfunctions.net/sspush"
      var a = address;
      var b = place ? place.geometry.location.lat() + "," + place.geometry.location.lng() : "";
      var c = !place ? "U" : (placeIsInRange() ? "Y" : "N");
      var d = email || "";
      var image = new Image()
      image.src = ssUrl + "?apiKey=" + config.apiKey +
          "&a=" + a + "&b=" + b + "&c=" + c + "&d=" + d;
      written = true;
    }
  }

  /**
   * Service area is expressed as a comma-separated string of lat/lng coordinates.  Parse
   * the string into a list usable to construct a Polygon.
   */
  function parseServiceAreaPaths(str) {
    var paths = []
    var parts = str.split(",")
    for (var i = 0; i + 1 < parts.length; i += 2) {
      paths.push({ lat: parseFloat(parts[i]), lng: parseFloat(parts[i + 1]) })
    }
    return paths;
  }

  /**
   * Return true if there is a selected Place within the service area.
   */
  function placeIsInRange() {
    if (place && place.geometry) {
      var serviceAreaPaths = parseServiceAreaPaths(config.serviceArea)
      var serviceArea = new google.maps.Polygon({ paths: serviceAreaPaths })
      return google.maps.geometry.poly.containsLocation(place.geometry.location, serviceArea)
    }
  }

  /**
   * Is correctly formatted email address?
   */
  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * DOM/styling helper.
   */
  function createAndStyleElement(tag, styleClass) {
    var element = document.createElement(tag)
    var styler = function(style, value) {
      element.style[style] = value;
      return styler;
    }
    styleClass = styleClass || tag;
    switch (styleClass) {
    case "button":
      styler(
        "padding", "4px 8px")(
        "fontFamily", config.fontFamily)(
        "fontSize", "16px")
      break;
    case "closeButton":
      styler(
        "padding", "0px 4px")(
        "background", "white")(
        "color", "black")(
        "border", "none")(
        "fontSize", "14px")(
        "fontFamily", config.fontFamily)(
        "fontWeight", 400)
      break;
    case "closeButtonContainer":
      styler(
        "position", "absolute")(
        "top", "6px")(
        "right", "6px")(
        "padding", "2px")(
        "border", "solid 1px white");
      element.onmouseenter = function() { element.style.borderColor = "#c5c5c5"; }
      element.onmouseleave = function() { element.style.borderColor = "white"; }
      break;
    case "textInput":
      styler(
        "width", "100%")(
        "fontFamily", config.fontFamily)(
        "fontSize", "18px")(
        "fontWeight", 300)(
        "border", "solid 1px #c5c5c5")(
        "borderRadius", "8px")(
        "padding", "8px")(
        "boxSizing", "border-box")
      break;
    case "messageContainer":
      styler(
        "fontSize", "16px")(
        "fontFamily", config.fontFamily)(
        "fontWeight", 300)(
        "marginTop", "6px")(
        "marginBottom", "24px")
      break;
    case "titleBar":
      styler(
        "textAlign", "center")(
        "fontSize", "48px")(
        "letterSpacing", "2px")(
        "fontWeight", 400)(
        "color", "#228")(
        "marginTop", "6px")(
        "marginBottom", "24px")
      break;
    case "inputContainer":
      styler("marginBottom", "24px")
      break;
    case "buttonContainer":
      styler("display", "flex")("justifyContent", "space-around")
      break;
    case "screen":
      styler(
        "position", "fixed")(
        "top", 0)(
        "left", 0)(
        "background", "rgba(169,169,169,0.5)")(
        "width", "100%")(
        "height", "100%")(
        "zIndex", 10010);
      break;
    case "dialog":
      styler(
        "position", "absolute")(
        "top", "150px")(
        "left", "50%")(
        "transform", "translateX(-50%)")(
        "background", "white")(
        "borderRadius", "16px")(
        "border", "solid 1px #e5e5e5")(
        "width", "480px")(
        "maxWidth", "85%")(
        "padding", "25px")(
        "boxShadow", "0px 8px 16px 0px rgba(0,0,0,0.2)")
      break;
    }
    return element;
  }

  function createAndStyleButton(label, styleClass, clickHandler) {
    var button = createAndStyleElement("button", styleClass)
    button.appendChild(document.createTextNode(label));
    button.onclick = clickHandler;
    return button;
  }

  function createAndStyleContainer(styleClass, children) {
    var container = createAndStyleElement("div", styleClass);
    for (var i = 0; i < children.length; ++i) {
      container.appendChild(children[i]);
    }
    return container;
  }

  function createCloseButton() {
    return createAndStyleContainer("closeButtonContainer", [
      createAndStyleButton("X", "closeButton", closeWidget)
    ])
  }

  function createTitleBar(title) {
    return createAndStyleContainer("titleBar", [
      document.createTextNode(title)
    ])
  }

  function createMessageContainer(message) {
    return createAndStyleContainer("messageContainer", [
      document.createTextNode(message)
    ])
  }

  function createAddressPicker(navigate) {
    var instructionsContainer = createMessageContainer(config.addressInstructionText)

    var input = createAndStyleElement("input", "textInput")
    input.type = "text";
    input.placeholder = "Your address";
    input.className = "happy-cans-address-input";
    input.oninput = function() {
      address = input.value;
      place = null;
      written = false;
      submitButton.disabled = input.value.length < 5 ? "disabled" : false;
    }

    var inputContainer = createAndStyleContainer("inputContainer", [ input ])

    var submitButton = createAndStyleButton("Continue", null, function() {
      if (placeIsInRange()) {
        navigate("success");
        writeDataToSpreadsheet()
      }
      else {
        navigate("outside");
      }
    })
    submitButton.disabled = "disabled";

    var submitContainer = createAndStyleContainer("buttonContainer", [ submitButton ]);

    // Wire in Google Places.
    var autocomplete = new google.maps.places.Autocomplete(input, {
      types: ["address"],
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(32.248625, -81.698344),
        new google.maps.LatLng(33.594990, -78.984722))
    })
    google.maps.event.addListener(autocomplete, "place_changed", function() {
      address = input.value;
      place = autocomplete.getPlace()
      written = false;
      submitButton.disabled = false;
    })

    return createAndStyleContainer(null, [
      instructionsContainer, inputContainer, submitContainer
    ])
  }

  function createSuccessView() {
    return createAndStyleContainer(null, [
      createMessageContainer(config.happyTransitionText),
      createAndStyleContainer("buttonContainer", [
        createAndStyleButton("Continue", null, function() {
          window.location.href = config.jobberUrl;
        })
      ])
    ])
  }

  function createOutsideView(navigate) {
    var instructionsContainer = createMessageContainer(
        place ? config.emailPromptOutOfArea : config.emailPromptUnknown)

    var input = createAndStyleElement("input", "textInput")
    input.type = "email";
    input.placeholder = "Your email address";
    input.oninput = function() {
      const isValid = validateEmail(input.value)
      submitButton.disabled = isValid ? "" : "disabled";
      if (isValid) email = input.value;
    }

    var inputContainer = createAndStyleContainer("inputContainer", [ input ])

    var backButton = createAndStyleButton("< Back", null, function() {
      navigate("addressPicker")
      writeDataToSpreadsheet()
    })

    var submitButton = createAndStyleButton("Submit", null, function() {
      navigate("confirmation")
      writeDataToSpreadsheet()
    })
    submitButton.disabled = "disabled";

    var buttonContainer = createAndStyleContainer("buttonContainer", [
      backButton, submitButton
    ])

    return createAndStyleContainer(null, [
      instructionsContainer, inputContainer, buttonContainer
    ])
  }

  function createConfirmationView() {
    var instructionsContainer = createMessageContainer(config.emailConfirmationText)

    var closeButton = createAndStyleButton("Close", null, closeWidget)

    var buttonContainer = createAndStyleContainer("buttonContainer", [ closeButton ])

    return createAndStyleContainer(null, [ instructionsContainer, buttonContainer ])
  }

  function createDialogBox() {
    var dialog = createAndStyleContainer("dialog", [
      createCloseButton(), createTitleBar(config.title)
    ])
    
    function navigate(viewStateName) {
      if (contentElement) {
        contentElement.remove();
        contentElement = null;
      }
      switch (viewStateName) {
      case "addressPicker":
        contentElement = createAddressPicker(navigate);
        break;
      case "success":
        contentElement = createSuccessView();
        break;
      case "outside":
        contentElement = createOutsideView(navigate);
        break;
      case "confirmation":
        contentElement = createConfirmationView();
        break;
      }
      dialog.appendChild(contentElement);
    }
    navigate("addressPicker");

    return dialog;
  }

  /**
   * Create and show the widget.
   */
  function openWidget() {
    widget = createAndStyleContainer("screen", [ createDialogBox() ])
    document.querySelector("body").appendChild(widget)

    // Set focus to address input.
    setTimeout(  // Resorting to timer here.  Is there no DOM event that will serve?
      function() { document.querySelector("input.happy-cans-address-input").focus() }, 240)
  }

  /**
   * Remove the widget and clean up.
   */
  function closeWidget() {
    if (widget) {
      widget.remove()
    }
    writeDataToSpreadsheet()
  }

  /**
   * Find all service request links in the document.  Override their click actions with
   * a call to open the widget.
   */
  function overrideServiceRequestHandlers() {
    function overrideClickHandler(event) {
      event.preventDefault();
      openWidget();
    }
    var allServiceRequestLinks = document.querySelectorAll("a[href='" + config.jobberUrl + "']")
    for (var i = 0; i < allServiceRequestLinks.length; ++i) {
      allServiceRequestLinks[i].onclick = overrideClickHandler;
    }
  }

  /**
   * Main flow.
   */
  insertRequiredScriptElements()
  insertRequiredStyles()
  overrideServiceRequestHandlers()

})("***CONFIG***");
