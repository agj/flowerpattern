
/*jshint mootools:true*/
/*global signals:false*/
/*global AGJ:false*/
;(function (that) {
	"use strict";

	// Imports.
	var trace = AGJ.trace;
	var Class = AGJ.Class;
	var Point = AGJ.Point;
	var DrawStyle = AGJ.graphics.DrawStyle;
	var brush = AGJ.graphics.brush;
	var StrokeGenerator = brush.StrokeGenerator;
	var StrokeStyle = brush.StrokeStyle;
	var flowerpattern = AGJ.projects.flowerpattern;
	var Signal = signals.Signal;

	var cfg = {
		mode: {
			all: {
				name: "star",
				stroke: {
					// duplicateInterval: 60, // ms
					// repeatedInterval: 200, // ms
					continuousMemoryTime: 800 // ms
				}
			},

			plain: {
				type: flowerpattern.PlayerManagerPlain
			},
			star: {
				type: flowerpattern.PlayerManagerStar,
				stroke: {
					delay: 500, // ms per whole revolution (500 def.)
					repetitions: {
						min: 6,
						max: 20
					}
				}
			},
			chain: {
				type: flowerpattern.PlayerManagerChain,
				duration: 7000, // ms
				stroke: {
					scale: {
						min: -0.2, // min -1
						max: 0.2 // max 1
					}
				}
			},
			grid: {
				type: flowerpattern.PlayerManagerGrid,
				stroke: {
					delay: 50, // ms per 100 px
					separation: {
						min: 100, // px
						max: 350 // px 350
					},
					maxRepetitions: 40
				}
			},
			wave: {
				type: flowerpattern.PlayerManagerWave,
				stroke: {
					delay: 100, // ms per line
					repetitions: 10, // per side
					separation: {
						min: 30, // px
						max: 70 // px
					},
					scale: { // These values are multiplied to the power of the line index, to determine the final scale.
						min: -0.01,
						max: 0.015
					}
				}
			}
		},

		stroke: {
			color: {
				use: true,
				index: 0,
				none: 0x000000,
				list: [
					0xfc3c07,
					0x1ac71b,
					0x0099ff,
					0xa100ff
				]
			},
			weight: {
				index: 1,
				list: [3, 5, 9]
			}
		},
		erase: {
			enabled: true,
			interval: 330, // ms
			strength: 33, // Per second value.
			// These options are not used.
				time: 3000, // ms
				threshold: 0x01 // Range: 0x01 through 0xff. Although 0x01 is always optimal...
		},
		menu: {
			transitionTime: 400
		},
		environment: {
			supports: {
				touch: null,
				orientationChange: null
			},
			ios: {
				fromHomeScreen: false
			}
		},
		updated: false,

		context: null
	};

	var canvas;
	var strokeGenerator = new StrokeGenerator();
	var playerManagers = {};
	var playerManager;
	var memoryContext;
	var bd; // BitmapData
	var hud = {
		showTimeout: null,
		modes: null,
		colophon: null,
		message: null
	};
	var cookieOptions = {
		duration: 14
	};

	var mouseDrawing = false;
	var strokes = {};
	var lastTime = 0;
	var orientation;

	AGJ.loggingIsEnabled = false;

	window.addEvent("domready", onDOMReady);

	function onDOMReady(e) {
		cfg.erase.strength = cfg.erase.strength / cfg.erase.interval;
		cfg.mode.grid.stroke.delay /= 100;
		$("content").empty();

		// Sniff supported capabilities.
		cfg.environment.supports.touch = "ontouchstart" in window;
		cfg.environment.supports.orientationChange = "onorientationchange" in window;
		if (Browser.Platform.ios)
			cfg.environment.ios.fromHomeScreen = window.navigator.standalone;

		// Check cookies.
		retrieveCookies();

		// Update.
		if (window.applicationCache) {
			checkForUpdate();
			window.applicationCache.addEventListener("updateready", onUpdateReady);
		}

		// HUD.
		hud.menu = new Menu(cfg, $("menu"));
		hud.menu.getModeButtons().getPressed().add(AGJ.getCallback(onModeChangeRequested, null, null));
		hud.menu.getOptionButtons().getPressed().add(AGJ.getCallback(onOptionChangeRequested, null, null));
		hud.colophon = new Colophon(cfg, $("colophon"));
		hud.message = new Message(cfg, $("message"));

		var optionButtons = hud.menu.getOptionButtons();
		optionButtons.activateButton("fade", cfg.erase.enabled);
		optionButtons.activateButton("color", cfg.stroke.color.use);

		// Modes.
		for (var name in cfg.mode) {
			if (!cfg.mode.hasOwnProperty(name) || !cfg.mode[name].type)
				continue;
			playerManagers[name] = new cfg.mode[name].type(cfg);
		}
		changeMode(cfg.mode.all.name);

		// Create canvas.
		orientation = window.orientation;
		recreateCanvas();

		// Updated message.
		if (cfg.updated) {
			showMessage("updated to latest version");
		}

		// Events.
		if (cfg.environment.supports.touch) {
			window.addEventListener(AGJ.event.touch.start, onTouchPress, { passive: false });
			window.addEventListener(AGJ.event.touch.move, onTouchMove, { passive: false });
			window.addEventListener(AGJ.event.touch.end, onTouchRelease, { passive: false });
		} else {
			window.addEvent(AGJ.event.mouse.down, onMousePress);
			window.addEvent(AGJ.event.mouse.move, onMouseMove);
			window.addEvent(AGJ.event.mouse.up, onMouseRelease);
		}

		setInterval(onInterval, cfg.erase.interval);

		window.addEvent(AGJ.event.ui.viewResize, onWindowResize);
		if (cfg.environment.supports.orientationChange) {
			window.addEvent(AGJ.event.motion.orientationChange, onOrientationChange);
		}

	}

	/////

	function update(elapsed) {
		if (cfg.erase.enabled) {
			cfg.context.save();
			cfg.context.globalCompositeOperation = "destination-out";
			// var color = cfg.mode[cfg.mode.all.name].color;
			// cfg.context.fillStyle = "rgba(" + (color >> 16 & 0xff) +  ", " + (color >> 8 & 0xff) + ", " + (color & 0xff) + ", " + cfg.erase.strength + ")";
			cfg.context.fillStyle = "rgba(0, 0, 0, " + cfg.erase.strength + ")";
			cfg.context.fillRect(0, 0, canvas.width, canvas.height);
			cfg.context.restore();
		}
	}

	/////

	function beginStroke(id, x, y) {
		trace("Beginning stroke.", id, strokes);
		if (!playerManager.getAcceptsStrokes())
			return;

		if (cfg.stroke.color.use && !playerManager.getWillCombineStroke())
			cfg.stroke.color.index = cfg.stroke.color.list.getNextIndex(cfg.stroke.color.index);

		var stroke = strokeGenerator.startStroke(x, y);
		strokes[id] = {
			stroke: stroke,
			color: (cfg.stroke.color.use) ? cfg.stroke.color.list[cfg.stroke.color.index] : cfg.stroke.color.none,
			weight: cfg.stroke.weight.list[cfg.stroke.weight.index]
		};

		stroke.nodes[0].getData().style = getStrokeStyle(id);
		playerManager.addStroke(stroke);

		// Show/hide menu.
		if (hud.menu.getIsShowing()) {
			showHUD(false);
		}
		clearTimeout(hud.showTimeout);
	}

	function extendStroke(id, x, y) {
		if (!strokes[id])
			return;
		var stroke = strokes[id].stroke;
		strokeGenerator.extendStroke(stroke, x, y).
			getData().style = getStrokeStyle(id);
	}

	function endStroke(id) {
		if (!strokes[id])
			return;
		var stroke = strokes[id].stroke;
		delete strokes[id];
		strokeGenerator.endStroke(stroke);

		if (AGJ.object.isEmpty(strokes)) {
			clearTimeout(hud.showTimeout);
			hud.showTimeout = setTimeout(onShowMenuTimeout, 2500);
		}
	}

	/////

	function changeMode(name) {
		endAllStrokes();

		cfg.mode.all.name = name;
		playerManager = playerManagers[name];

		hud.menu.getModeButtons().activateButton(name);

		var body = $$("body")[0];
		var bodyClasses = body.get("class");
		if (bodyClasses) {
			bodyClasses = bodyClasses.split(" ");
			for (var i = 0, len = bodyClasses.length; i < len; i++) {
				if (bodyClasses[i].startsWith("mode-")) {
					body.removeClass(bodyClasses[i]);
				}
			}
		}
		body.addClass("mode-" + name);

		saveCookies();
	}

	function showHUD(show) {
		hud.menu.show(show);
		hud.colophon.show(show);
	}

	function showMessage(text) {
		hud.message.setText(text);
		hud.message.show();
	}

	function recreateCanvas() {
		var oldCanvas, oldImageData;
		if (canvas) {
			oldCanvas = canvas;
			oldImageData = cfg.context.getImageData(0, 0, canvas.width, canvas.height);
		}

		var container = $("content");
		var pageSize = $(window).getSize();
		canvas = new Element("canvas", { id: "canvas", width: pageSize.x * devicePixelRatio, height: pageSize.y * devicePixelRatio } );
		container.appendChild(canvas);
		var ctx = cfg.context = canvas.getContext("2d");

		ctx.scale(devicePixelRatio, devicePixelRatio);

		// Paint old canvas image on new.
		if (oldCanvas) {
			var angle = orientation - window.orientation;
			while (angle < 0) {
				angle += 360;
			}
			ctx.save();
			if (angle === 90 || angle === 180)
				ctx.translate(canvas.width, 0);
			if (angle === 270 || angle === 180)
				ctx.translate(0, canvas.height);
			ctx.rotate(angle.degToRad());
			ctx.drawImage(oldCanvas, 0, 0);
			ctx.restore();

			oldCanvas.destroy();
		}
		orientation = window.orientation;
	}

	function retrieveCookies() {
		var mode = Cookie.read("mode", cookieOptions);
		if (mode && mode !== "all" && cfg.mode.hasOwnProperty(mode))
			cfg.mode.all.name = mode;
		var useFade = Cookie.read("fade", cookieOptions);
		if (useFade === "true" || useFade === "false")
			cfg.erase.enabled = useFade === "true";
		var useColor = Cookie.read("color", cookieOptions);
		if (useColor === "true" || useColor === "false")
			cfg.stroke.color.use = useColor === "true";

		var updated = Cookie.read("updated", cookieOptions);
		if (updated === "true") {
			cfg.updated = true;
			Cookie.dispose("updated", cookieOptions);
		}

		trace("COOKIES mode", mode, "fade", useFade, "color", useColor, "updated", updated);
	}

	function saveCookies() {
		Cookie.write("mode", cfg.mode.all.name, cookieOptions);
		Cookie.write("fade", cfg.erase.enabled, cookieOptions);
		Cookie.write("color", cfg.stroke.color.use, cookieOptions);
	}

	function checkForUpdate() {
		if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
			trace("Update ready. Refreshing...");
			Cookie.write("updated", "true", cookieOptions);
			window.applicationCache.swapCache();
			window.location.reload();
		}
	}

	function endOrphanedStrokes(e) {
		var ids = Object.keys(strokes);
		var activeIDs = [], touch;
		for (var i = 0, len = e.targetTouches.length; i < len; i++) {
			touch = e.targetTouches[i];
			activeIDs.push(touch.identifier.toString());
		}

		ids = ids.subtract(activeIDs);

		for (i = 0, len = ids.length; i < len; i++) {
			trace("! Ending orphaned stroke:", ids[i]);
			endStroke(ids[i]);
		}
	}

	function endAllStrokes() {
		for (var key in strokes) {
			if (!strokes.hasOwnProperty(key))
				continue;
			endStroke(key);
		}
	}

	/////

	function getStrokeStyle(id) { // StrokeStyle
		var color = strokes[id].color;
		var weight = strokes[id].weight;
		return new StrokeStyle(DrawStyle.makeLineStyle(color, weight, 1), 5, 1.5, 0.5, 0.2);
	}

	///// Events.

	function onTouchPress(e) {
		//trace("Touch press.", e, strokes);
		if (e.target instanceof Element && e.target.get("tag") === "a")
			return;

		endOrphanedStrokes(e);
		var pos = canvas.getPosition();
		for (var i = 0, len = e.changedTouches.length; i < len; i++) {
			var touch = e.changedTouches[i];
			beginStroke(touch.identifier, touch.pageX - pos.x, touch.pageY - pos.y);
		}
		e.preventDefault();
	}

	function onTouchMove(e) {
		var pos = canvas.getPosition();
		for (var i = 0, len = e.changedTouches.length; i < len; i++) {
			var touch = e.changedTouches[i];
			extendStroke(touch.identifier, touch.pageX - pos.x, touch.pageY - pos.y);
		}
		e.preventDefault();
	}

	function onTouchRelease(e) {
		//trace("Touch release.", e, strokes);
		for (var i = 0, len = e.changedTouches.length; i < len; i++) {
			var touch = e.changedTouches[i];
			endStroke(touch.identifier);
		}
		e.preventDefault();
	}

	function onMousePress(e) {
		if (e.target instanceof Element && e.target.get("tag") === "a")
			return;

		mouseDrawing = true;
		var pos = canvas.getPosition();
		beginStroke("mouse", e.page.x - pos.x, e.page.y - pos.y);
		e.preventDefault();
	}

	function onMouseMove(e) {
		if (mouseDrawing) {
			var pos = canvas.getPosition();
			extendStroke("mouse", e.page.x - pos.x, e.page.y - pos.y);
		}
		e.preventDefault();
	}

	function onMouseRelease(e) {
		mouseDrawing = false;
		endStroke("mouse");
	}

	function onInterval() {
		var now = AGJ.getTime();
		update(now - lastTime);
		lastTime = now;
	}

	var timeout;
	function onWindowResize() {
		//trace("resized", $(window).getSize());
		clearTimeout(timeout);
		timeout = setTimeout(recreateCanvas, 800);
	}

	function onOrientationChange(e) {
		trace("Orientation changed.", window.orientation, e);
		clearTimeout(timeout);
		recreateCanvas();
	}

	function onModeChangeRequested(requestedModeName) {
		// trace("Mode change requested.", requestedModeName);
		changeMode(requestedModeName);
	}

	function onOptionChangeRequested(optionName) {
		// trace("Option change requested.", optionName);
		if (optionName === "fade") {
			cfg.erase.enabled = !cfg.erase.enabled;
			hud.menu.getOptionButtons().activateButton("fade", cfg.erase.enabled);
		} else if (optionName === "color") {
			cfg.stroke.color.use = !cfg.stroke.color.use;
			hud.menu.getOptionButtons().activateButton("color", cfg.stroke.color.use);
		}

		saveCookies();
	}

	function onShowMenuTimeout() {
		showHUD(true);
	}

	function onUpdateReady(e) {
		checkForUpdate();
	}

	/////
	/////

	var HUD = Class.extend({
		init: function (config, elementContainer) {
			this._cfg = config;
			this._container = elementContainer;
			this._isShowing = true;

			this._container.set("tween", {
				transition: Fx.Transitions.Quad.easeOut,
				duration: this._cfg.menu.transitionTime
			} );
		},

		show: function (show) {
			this._isShowing = show === undefined || show;
		}
	});

	var Buttons = Class.extend({
		init: function (config, elements, prefix) {
			this._cfg = config;

			this._pressed = new Signal();
			this._buttons = {};

			var callback = AGJ.getCallback(this._onButtonPressed, null, this);
			if (this._cfg.environment.supports.touch)
				elements.addEvent(AGJ.event.touch.start, callback);
			else
				elements.addEvent(AGJ.event.mouse.down, callback);

			var regex = new RegExp("^" + prefix + ".*");
			var filter = function (item) {
				return regex.test(item);
			};
			for (var i = 0, len = elements.length; i < len; i++) {
				var button = elements[i];
				var classes = button.get("class").split(" ").filter(filter);
				var name = classes.length > 0 ? classes[0].substr(prefix.length) : null;
				if (name) {
					this._buttons[name] = button;
				}
			}
		},

		isButtonActive: function (name) { // Boolean
			return this._buttons[name].hasClass("active");
		},

		getPressed: function () { // Signal
			return this._pressed;
		},

		_activateButton: function (name, activate) {
			if (activate)
				this._buttons[name].addClass("active");
			else
				this._buttons[name].removeClass("active");
		},

		_onButtonPressed: function (e) {
			var button = e.target;
			var name = AGJ.object.getKeyFromValue(this._buttons, button);
			trace("Button pressed.", name, button, this._buttons, e);
			if (name)
				this._pressed.dispatch(name);
			e.stopPropagation();
		}
	});

	var ModeButtons = Buttons.extend({
		init: function (config, elements) {
			this._super("init")(config, elements, "mode-");
		},

		activateButton: function (name) {
			for (var key in this._buttons) {
				if (!this._buttons.hasOwnProperty(key))
					continue;
				this._activateButton(key, key === name);
			}
		}
	});

	var OptionButtons = Buttons.extend({
		init: function (config, elements) {
			this._super("init")(config, elements, "option-");
		},

		activateButton: function (name, activate) {
			this._activateButton(name, activate);
		}
	});

	var Menu = HUD.extend({
		init: function (config, elementContainer) {
			this._super("init")(config, elementContainer);

			this._modeButtons = new ModeButtons(this._cfg, this._container.getElements(".mode"));
			this._optionButtons = new OptionButtons(this._cfg, this._container.getElements(".option"));

			this._startPosition = this._container.getStyle("top");
		},

		show: function (show) {
			this._super("show")(show);

			if (show === undefined || show) {
				this._container.tween("top", this._startPosition);
			} else {
				this._container.tween("top", -this._container.getSize().y + "px");
			}
		},

		getModeButtons: function () {
			return this._modeButtons;
		},

		getOptionButtons: function () {
			return this._optionButtons;
		},

		getIsShowing: function () {
			return this._isShowing;
		}
	});

	var Colophon = HUD.extend({
		init: function (config, elementContainer) {
			this._super("init")(config, elementContainer);

			this._startPosition = this._container.getStyle("bottom");

			// Show only one tip according to platform and browser.
			if (!this._cfg.environment.supports.touch)
				this._container.getElements(".tip-touch").addClass("visible");
			else if (Browser.Platform.ios && !cfg.environment.ios.fromHomeScreen)
				this._container.getElements(".tip-ios-homescreen").addClass("visible");
			else if (cfg.environment.ios.fromHomeScreen)
				this._container.getElements(".tip-ios-screenshot").addClass("visible");
		},

		show: function (show) {
			this._super("show")(show);

			if (show === undefined || show) {
				this._container.tween("bottom", this._startPosition);
			} else {
				this._container.tween("bottom", -this._container.getSize().y + "px");
			}
		}
	});

	var Message = HUD.extend({
		init: function (config, element) {
			this._super("init")(config, element);

			this._timeout = null;
			this._tween = null;

			this._isShowing = false;
			this._container.set("tween", null);
		},

		show: function (show) {
			this._super("show")(show);

			clearTimeout(this._timeout);
			if (show === undefined || show) {
				if (this._tween) {
					this._tween.cancel();
					this._tween = null;
				}
				this._container.fade("show");
				this._container.addClass("active");
				this._timeout = setTimeout(AGJ.getCallback(this._onDoneShowing, null, this), 2000);
			} else {
				this._tween = new Fx.Tween(this._container, {
					transition: Fx.Transitions.linear,
					duration: 300,
					onComplete: AGJ.getCallback(this._onTweenComplete, null, this),
					property: "opacity"
				});
				this._tween.start(0);
			}
		},

		setText: function (text) {
			var el = this._container.getElements(".topic")[0];
			el.set("text", text);
		},

		_onDoneShowing: function () {
			this.show(false);
		},

		_onTweenComplete: function () {
			this._tween = null;
			this._container.removeClass("active");
		}
	});

})(this);

