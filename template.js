// Happy Cans Service Request Widget
(function(config) {
  (function() { // addScripts
    var script = document.createElement("script")
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + config.apiKey + "&libraries=places,geometry";
    document.lastChild.appendChild(script)
  })();

  (function () { // addStyles
    var sheet = document.createElement("style")
    sheet.innerHTML = 
      ".pac-container { z-index: 10011; } " + 
      ".pac-container, .pac-item { min-width: 300px; font-family: " + config.fontFamily + "; }";
    document.lastChild.appendChild(sheet)
  })();

  var place;
  var serviceRegionPaths = [
    { lat: 25.774, lng: -80.19 },
    { lat: 18.466, lng: -66.118 },
    { lat: 32.321, lng: -64.757 },
    { lat: 25.774, lng: -80.19 }
  ]
  var widget;
  var currentComponent;

  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  function styleElement(element) {
    var func = function(style, value) {
      element.style[style] = value;
      return func;
    }
    return func;
  }

  function styleButton(button) {
    styleElement(button)(
      "padding", "4px 8px")(
      "fontFamily", config.fontFamily)(
      "fontSize", "18px")
  }

  function styleTextInput(input) {
    styleElement(input)(
      "width", "100%")(
      "fontFamily", config.fontFamily)(
      "fontSize", "20px")(
      "fontWeight", 300)(
      "border", "solid 1px #c5c5c5")(
      "borderRadius", "8px")(
      "padding", "8px")(
      "boxSizing", "border-box")
  }

  function styleMessageContainer(messageContainer) {
    styleElement(messageContainer)(
      "fontSize", "18px")(
      "fontFamily", config.fontFamily)(
      "fontWeight", 300)(
      "marginTop", "6px")(
      "marginBottom", "24px")
  }

  function closeWidget() {
    if (widget) {
      widget.remove()
    }
  }

  function createCloseButton() {
    var button = document.createElement("button");
    styleElement(button)(
      "padding", "0px 4px")(
      "background", "white")(
      "color", "black")(
      "border", "none")(
      "fontSize", "14px")(
      "fontFamily", config.fontFamily)(
      "fontWeight", 400);
    button.appendChild(document.createTextNode("X"));
    button.onclick = closeWidget;
    var container = document.createElement("div")
    container.style.position = "absolute";
    container.style.top = "6px";
    container.style.right = "6px";
    container.style.padding = "2px";
    container.style.border = "solid 1px white";
    container.onmouseenter = function() { container.style.borderColor = "#c5c5c5"; }
    container.onmouseleave = function() { container.style.borderColor = "white"; }
    container.appendChild(button);
    return container;
  }

  function createMessageContainer(message) {
    var messageContainer = document.createElement("div")
    styleMessageContainer(messageContainer)
    messageContainer.appendChild(document.createTextNode(message))
    return messageContainer;
  }

  function createAddressPicker(navigate) {
    var instructionsContainer = createMessageContainer(config.addressInstructionText)

    var inputContainer = document.createElement("div")
    inputContainer.style.marginBottom = "24px";
    var input = document.createElement("input")
    input.type = "text";
    input.className = "happy-cans-address-input";
    styleTextInput(input)
    inputContainer.appendChild(input);

    var submitContainer = document.createElement("div")
    submitContainer.style.textAlign = "center";
    var submitButton = document.createElement("button")
    styleButton(submitButton)
    submitButton.disabled = "disabled";
    submitButton.appendChild(document.createTextNode("Continue"))
    submitButton.onclick = function() {
      if (place) {
        const serviceRegion = new google.maps.Polygon({ paths: serviceRegionPaths })
        if (google.maps.geometry.poly.containsLocation(place.geometry.location, serviceRegion)) {
          navigate("happy");
        }
        else {
          navigate("outside");
        }
      }
    }
    submitContainer.appendChild(submitButton);

    (function() {
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
    })()

    var container = document.createElement("div")
    container.appendChild(instructionsContainer)
    container.appendChild(inputContainer)
    container.appendChild(submitContainer)
    return container;
  }

  function createHappyTransition() {
    var container = document.createElement("div")
    container.appendChild(document.createTextNode("HAPPY"));
    return container;
  }

  function createOutsideView(navigate) {
    var instructionsContainer = createMessageContainer(config.emailPromptText)

    var inputContainer = document.createElement("div")
    inputContainer.style.marginBottom = "24px";
    var input = document.createElement("input")
    input.type = "email";
    input.placeholder = "Your email address";
    styleTextInput(input)
    input.oninput = function() {
      submitButton.disabled = validateEmail(input.value) ? "" : "disabled";
    }
    inputContainer.appendChild(input);

    var buttonContainer = document.createElement("div")
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-around";
    var backButton = document.createElement("button")
    styleButton(backButton);
    backButton.appendChild(document.createTextNode("< Back"))
    backButton.onclick = function() {
      navigate("addressPicker")
    }
    buttonContainer.appendChild(backButton);
    var submitButton = document.createElement("button")
    styleButton(submitButton);
    submitButton.type = "submit";
    submitButton.disabled = "disabled";
    submitButton.appendChild(document.createTextNode("Submit"))
    submitButton.onclick = function() {
      navigate("confirmation")
    }
    buttonContainer.appendChild(submitButton);

    var container = document.createElement("div")
    container.appendChild(instructionsContainer)
    container.appendChild(inputContainer)
    container.appendChild(buttonContainer)
    return container;
  }

  function createConfirmationView() {
    var instructionsContainer = createMessageContainer(config.emailConfirmationText)

    var closeButton = document.createElement("button")
    styleButton(closeButton);
    closeButton.appendChild(document.createTextNode("Close"))
    closeButton.onclick = closeWidget;

    var buttonContainer = document.createElement("div")
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.appendChild(closeButton);

    var container = document.createElement("div")
    container.appendChild(instructionsContainer)
    container.appendChild(buttonContainer)
    return container;
  }

  function createDialogBox() {
    var dialog = document.createElement("div")
    styleElement(dialog)(
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
      "boxShadow", "0px 8px 16px 0px rgba(0,0,0,0.2)");
    dialog.appendChild(createCloseButton());
    
    function navigate(viewStateName) {
      if (currentComponent) {
        currentComponent.remove();
        currentComponent = null;
      }
      switch (viewStateName) {
      case "addressPicker":
        currentComponent = createAddressPicker(navigate);
        break;
      case "happy":
        currentComponent = createHappyTransition();
        break;
      case "outside":
        currentComponent = createOutsideView(navigate);
        break;
      case "confirmation":
        currentComponent = createConfirmationView();
        break;
      }
      dialog.appendChild(currentComponent);
    }
    navigate("addressPicker");

    return dialog;
  }

  function createWidget() {
    var screen = document.createElement("div")
    styleElement(screen)(
      "position", "fixed")(
      "top", 0)(
      "left", 0)(
      "background", "rgba(169,169,169,0.5)")(
      "width", "100%")(
      "height", "100%")(
      "zIndex", 10010);
    screen.appendChild(createDialogBox(screen));
    return screen;
  }

  function createAndShowWidget() {
    widget = createWidget()
    document.querySelector("body").appendChild(widget)
    setTimeout(  // Resorting to timer here.  Is there no DOM event that will serve?
      function() { document.querySelector("input.happy-cans-address-input").focus() }, 240)
  }

  function clickHandler(event) {
    event.preventDefault();
    createAndShowWidget();
  }

  var allServiceRequestLinks = document.querySelectorAll("a[href='" + config.jobberUrl + "']")
  for (var i = 0; i < allServiceRequestLinks.length; ++i) {
    allServiceRequestLinks[i].onclick = clickHandler;
  }
})("***CONFIG***");
