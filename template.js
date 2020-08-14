/**
 * Happy Cans Service Locator.
 */
(function(config) {
  /**
   * UI state.
   */
  var place;            // The most recently selected Place.
  var widget;           // The root element of the widget.
  var contentElement;   // The content element of the widget.

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
   * Data helpers.
   */

  function parseServiceAreaPaths(str) {
    var paths = []
    var parts = str.split(",")
    for (var i = 0; i + 1 < parts.length; i += 2) {
      paths.push({ lat: parseFloat(parts[i]), lng: parseFloat(parts[i + 1]) })
    }
    return paths;
  }

  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  /**
   * DOM / styling helpers.
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
        "fontSize", "18px")
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
        "fontSize", "20px")(
        "fontWeight", 300)(
        "border", "solid 1px #c5c5c5")(
        "borderRadius", "8px")(
        "padding", "8px")(
        "boxSizing", "border-box")
      break;
    case "messageContainer":
      styler(
        "fontSize", "18px")(
        "fontFamily", config.fontFamily)(
        "fontWeight", 300)(
        "marginTop", "6px")(
        "marginBottom", "24px")
      break;
    case "titleBar":
      styler(
        "textAlign", "center")(
        "fontSize", "22px")(
        "fontFamily", config.fontFamily)(
        "fontWeight", 500)(
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
    input.className = "happy-cans-address-input";
    var inputContainer = createAndStyleContainer("inputContainer", [ input ])

    var submitButton = createAndStyleButton("Continue", null, function() {
      if (place) {
        var serviceAreaPaths = parseServiceAreaPaths(config.serviceArea)
        var serviceArea = new google.maps.Polygon({ paths: serviceAreaPaths })
        if (google.maps.geometry.poly.containsLocation(place.geometry.location, serviceArea)) {
          navigate("happy");
        }
        else {
          navigate("outside");
        }
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
      place = autocomplete.getPlace()
      submitButton.disabled = false;
    })

    return createAndStyleContainer(null, [
      instructionsContainer, inputContainer, submitContainer
    ])
  }

  function createHappyTransition() {
    // Navigate away after a short pause.
    setTimeout(function() { window.location.href = config.jobberUrl; }, 2500)

    return createMessageContainer(config.happyTransitionText)
  }

  function createOutsideView(navigate) {
    var instructionsContainer = createMessageContainer(config.emailPromptText)

    var input = createAndStyleElement("input", "textInput")
    input.type = "email";
    input.placeholder = "Your email address";
    input.oninput = function() {
      submitButton.disabled = validateEmail(input.value) ? "" : "disabled";
    }

    var inputContainer = createAndStyleContainer("inputContainer", [ input ])

    var backButton = createAndStyleButton("< Back", null, function() {
      navigate("addressPicker")
    })

    var submitButton = createAndStyleButton("Submit", null, function() {
      navigate("confirmation")
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
      case "happy":
        contentElement = createHappyTransition();
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
    console.log('closeWidget', widget)
    if (widget) {
      widget.remove()
    }
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
