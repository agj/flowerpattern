
/**
 * Core utilities.
 *
 * No dependencies.
 *
 * Created by agj (www.agj.cl).
 */

/*jshint proto:true*/
/*global AGJ:false*/
(function (that) {

	"use strict";

	var defineModule = function (obj, stringName, value) {
		var i, len, module, setValue, canDefineProperties;
		var modules = stringName.split(".");

		if (!obj)
			throw "Invalid object passed.";

		canDefineProperties = "defineProperty" in Object && "defineProperties" in Object;

		for (i = 0, len = modules.length; i < len; i++) {
			module = modules[i];
			if (!(module in obj)) {
				setValue = value !== undefined && i === len - 1;
				if (canDefineProperties) {
					Object.defineProperty(obj, module, {
						writable: false, enumerable: true, configurable: true,
						value: (setValue) ? value : {}
					} );
				} else {
					obj[module] = (setValue) ? value : {};
				}
			}
			obj = obj[module];
		}

		return value ? value : obj;
	};

	defineModule(that, "AGJ");


	// GENERAL

	defineModule(AGJ, "defineModule", defineModule);

	AGJ.loggingIsEnabled = true;

	defineModule(AGJ, "trace", function () {
		if (AGJ.loggingIsEnabled && console && console.log)
			console.log.apply(console, Array.prototype.slice.call(arguments));
	});
	defineModule(AGJ, "warn", function () {
		if (AGJ.loggingIsEnabled && console) {
			if (console.warn)
				console.warn.apply(console, Array.prototype.slice.call(arguments));
			else if (console.log)
				console.log.apply(console, Array.prototype.slice.call(arguments));
		}
	});

	defineModule(AGJ, "getTime", function () {
		return new Date().getTime();
	});

	defineModule(AGJ, "mixin", function (objectTarget, objectProperties) {
		var canDefineProperties = "defineProperty" in Object && "defineProperties" in Object;

		for (var prop in objectProperties) {
			if (!(prop in objectTarget) || objectTarget[prop] === undefined) {
				if (canDefineProperties) {
					Object.defineProperty(objectTarget, prop, {
						writable: false, enumerable: false, configurable: false,
						value: objectProperties[prop]
					});
				} else {
					objectTarget[prop] = objectProperties[prop];
				}
			} else {
				var target = objectTarget.constructor ? objectTarget.constructor : objectTarget;
				target = target.name ? target.name : typeof target;
				AGJ.warn("agj: Could not mixin '" + prop + "' to '" + target + "' because it is already defined.");
			}
		}
	});

	defineModule(AGJ, "destroy", function (arrayOfDestroyables) {
		for (var i = 0, len = arrayOfDestroyables.length; i < len; i++) {
			var current = arrayOfDestroyables[i];
			if (!current)
				continue;
			if (typeof current === "array")
				AGJ.destroy(current);
			else if (current.destroy)
				current.destroy();
			else if (current.removeAll)
				current.removeAll();
		}
	});

	defineModule(AGJ, "getCallback", function (fun, arrayArgs, scope) { // Function
		return function () {
			var args = arrayArgs ? arrayArgs.concat(arguments) : arguments;
			fun.apply(scope, args);
		};
	});

	// UTIL

	defineModule(AGJ, "util");

	defineModule(AGJ.util, "tossCoin", function (probability) { // Boolean
		if (isNaN(probability))
			probability = 0.5;
		return Math.random() < probability;
	});


	// OBJECT

	defineModule(AGJ, "object");

	defineModule(AGJ.object, "getKeyFromValue", function (obj, value) { // String
		for (var key in obj) {
			if (!obj.hasOwnProperty(key))
				continue;
			if (obj[key] === value) {
				return key;
			}
		}
		return null;
	});

	defineModule(AGJ.object, "isEmpty", function (obj) { // Boolean
		for (var key in obj) {
			if (!obj.hasOwnProperty(key))
				continue;
			return false;
		}
		return true;
	});

	defineModule(AGJ.object, "getKeys", function (obj) { // Array
		var result = [];
		for (var key in obj) {
			if (!obj.hasOwnProperty(key))
				continue;
			result.push(key);
		}
		return result;
	});


	// NUMBER

	defineModule(AGJ, "number");

	AGJ.mixin(Number.prototype, {
		degToRad: function () { // Number
			return this * Math.PI / 180;
		},
		radToDeg: function () { // Number
			return this * 180 / Math.PI;
		},

		toHex: function (pad) { // String
			var result = this.toString(16);
			if (!isNaN(pad)) {
				while (result.length < pad) {
					result = "0" + result;
				}
			}
			return result;
		},

		logBase: function (base) {
			return Math.log(this) / Math.log(base);
		}
	});

	defineModule(AGJ.number, "randomInt", function (numberMaxValue) { // Number
		return Math.floor(Math.random() * numberMaxValue);
	});


	// MATH

	defineModule(AGJ, "math");

	defineModule(AGJ.math, "curve", function (numberValue, numberGentleness, numberPeak, numberValueSubtract) { // Number
		if (numberValueSubtract)
			numberValue = Math.max(numberValue - numberValueSubtract, 0);
		if (numberGentleness < 1)
			numberGentleness = 1;
		return numberPeak / ((numberValue / numberGentleness) +1);
	});

	defineModule(AGJ.math, "cartesianToRadians", function (x, y) { // Number
		return Math.atan2(y, x);
	});


	// STRING

	defineModule(AGJ, "string");

	AGJ.mixin(String.prototype, {
		startsWith: function (stringStart, caseSensitive) { // Boolean
			var string = this;
			if (!caseSensitive) {
				string = string.toLowerCase();
				stringStart = stringStart.toLowerCase();
			}
			return string.substr(0, stringStart.length) === stringStart;
		},
		endsWith: function (stringEnd, caseSensitive) { // Boolean
			var string = this;
			if (!caseSensitive) {
				string = string.toLowerCase();
				stringEnd = stringEnd.toLowerCase();
			}
			return string.substr(-stringEnd.length) === stringEnd;
		}
	});


	// ARRAY

	defineModule(AGJ, "array");

	AGJ.mixin(Array.prototype, {
		clone: function () { // Array
			return this.concat();
		},

		getLast: function (amount) { // *|Array
			if (isNaN(amount)) {
				var index = this.length - 1;
				return index >= 0 ? this[index] : undefined;
			} else {
				var startIndex = Math.max(this.length - amount, 0);
				return this.slice(startIndex);
			}
		},
		getFirst: function (amount) { // *|Array
			if (isNaN(amount)) {
				return this[0];
			} else {
				var endIndex = Math.min(amount, this.length - 1);
				return this.slice(0, endIndex);
			}
		},

		getRandom: function () { // *
			var len = this.length;
			if (len <= 0)
				return null;
			return this[Math.floor(Math.random() * len)];
		},

		getRandomIndexExcept: function (arrayIndexExceptions) { // Number
			var exc, i, j, nums, random, total;

			exc = arrayIndexExceptions.concat();
			exc.sort();
			nums = [];
			
			total = this.length;
			for (j = 0; j < total; j++) {
				nums.push(j);
			}
			for (i = exc.length - 1; i >= 0; i--) {
				nums.splice(exc[i], 1);
			}
			
			random = AGJ.number.randomInt(nums.length);
			return nums[random];
		},

		overlaps: function (array) { // Boolean
			var len = this.length;
			for (var i = 0; i < len; i++) {
				if (array.indexOf(this[i]) >= 0)
					return true;
			}
			return false;
		},

		getDifference: function (array) { // Array
			return this.filter(function (item) {
				return array.indexOf(item) < 0;
			});
		},

		subtract: function (array) { // self
			for (var i = this.length - 1; i >= 0; i--) {
				if (array.indexOf(this[i]) >= 0)
					this.splice(i, 1);
			}
			return this;
		},

		getIntersection: function (array) { // Array
			return this.filter(function (item) {
				return array.indexOf(item) >= 0;
			});
		},

		remove: function () { // self
			var index;
			for (var i = 0, len = arguments.length; i < len; i++) {
				var item = arguments[i];
				while (true) {
					index = this.indexOf(item);
				if (index >= 0)
					this.splice(index, 1);
				else
					break;
				}
			}
			return this;
		},

		shuffle: function () { // self
			for (var i = this.length - 1; i >= 0; i--) {
				var temp = this[i];
				var r = AGJ.number.randomInt(i + 1 );
				this[i] = this[r];
				this[r] = temp;
			}
			return this;
		},

		getNextTo: function (item, dontWrapAround) { // *
			var index = AGJ.array.getNextOrPrevIndex(this, this.indexOf(item), true, dontWrapAround);
			if (index >= 0)
				return this[index];
			return null;
		},
		getPrevTo: function (item, dontWrapAround) { // *
			var index = AGJ.array.getNextOrPrevIndex(this, this.indexOf(item), false, dontWrapAround);
			if (index >= 0)
				return this[index];
			return null;
		},
		getNextIndex: function (index, dontWrapAround) { // Number
			return AGJ.array.getNextOrPrevIndex(this, index, true, dontWrapAround);
		},
		getPrevIndex: function (index, dontWrapAround) { // Number
			return AGJ.array.getNextOrPrevIndex(this, index, false, dontWrapAround);
		},
		getNextIndexTo: function (item, dontWrapAround) { // Number
			return AGJ.array.getNextOrPrevIndex(this, this.indexOf(item), true, dontWrapAround);
		},
		getPrevIndexTo: function (item, dontWrapAround) { // Number
			return AGJ.array.getNextOrPrevIndex(this, this.indexOf(item), false, dontWrapAround);
		}
	});

	defineModule(AGJ.array, "getNextOrPrevIndex", function (array, index, getNext, dontWrapAround) { // Number
		index += getNext ? 1 : -1;
		var len = array.length;
		if (index >= len) {
			if (!dontWrapAround)
				index = index % len;
			else
				index = -1;
		} else if (index < 0) {
			if (!dontWrapAround)
				index += len;
			else
				index = -1;
		}
		return index;
	});

	// ARRAY.SORT

	defineModule(AGJ.array, "sort");

	defineModule(AGJ.array.sort, "descending", function (a, b) {
		return b - a;
	});


	// EVENT

	defineModule(AGJ, "event");

	defineModule(AGJ.event, "mouse");
	defineModule(AGJ.event.mouse, "click", "click");
	defineModule(AGJ.event.mouse, "doubleClick", "dblclick");
	defineModule(AGJ.event.mouse, "down", "mousedown");
	defineModule(AGJ.event.mouse, "up", "mouseup");
	defineModule(AGJ.event.mouse, "move", "mousemove");
	defineModule(AGJ.event.mouse, "over", "mouseover");
	defineModule(AGJ.event.mouse, "out", "mouseout");
	defineModule(AGJ.event.mouse, "enter", "mouseenter");
	defineModule(AGJ.event.mouse, "leave", "mouseleave");
	defineModule(AGJ.event.mouse, "wheel", "wheel");
	defineModule(AGJ.event.mouse, "contextMenu", "contextmenu");
	defineModule(AGJ.event.mouse, "contextMenuShow", "show");

	defineModule(AGJ.event, "key");
	defineModule(AGJ.event.key, "down", "keydown");
	defineModule(AGJ.event.key, "up", "keyup");
	defineModule(AGJ.event.key, "press", "keypress");

	defineModule(AGJ.event, "composition");
	defineModule(AGJ.event.composition, "start", "compositionstart");
	defineModule(AGJ.event.composition, "update", "compositionupdate");
	defineModule(AGJ.event.composition, "end", "compositionend");

	defineModule(AGJ.event, "ui");
	defineModule(AGJ.event.ui, "input", "input");
	defineModule(AGJ.event.ui, "change", "change");
	defineModule(AGJ.event.ui, "focus", "focus");
	defineModule(AGJ.event.ui, "blur", "blur");
	defineModule(AGJ.event.ui, "focusIn", "focusin");
	defineModule(AGJ.event.ui, "focusOut", "focusout");
	defineModule(AGJ.event.ui, "invalid", "invalid");
	defineModule(AGJ.event.ui, "reset", "reset");
	defineModule(AGJ.event.ui, "submit", "submit");
	defineModule(AGJ.event.ui, "select", "select");
	defineModule(AGJ.event.ui, "viewResize", "resize");
	defineModule(AGJ.event.ui, "scroll", "scroll");
	defineModule(AGJ.event.ui, "hashChange", "hashchange");

	defineModule(AGJ.event, "motion");
	defineModule(AGJ.event.motion, "orientationChange", "orientationchange");
	defineModule(AGJ.event.motion, "gyroscope", "deviceorientation");
	defineModule(AGJ.event.motion, "accelerometer", "devicemotion");

	defineModule(AGJ.event, "load");
	defineModule(AGJ.event.load, "readyStateChange", "readystatechange");
	defineModule(AGJ.event.load, "load", "load");
	defineModule(AGJ.event.load, "unload", "unload");
	defineModule(AGJ.event.load, "abort", "abort");
	defineModule(AGJ.event.load, "error", "error");

	defineModule(AGJ.event, "touch");
	defineModule(AGJ.event.touch, "start", "touchstart");
	defineModule(AGJ.event.touch, "end", "touchend");
	defineModule(AGJ.event.touch, "move", "touchmove");
	defineModule(AGJ.event.touch, "cancel", "touchcancel");
	defineModule(AGJ.event.touch, "enter", "touchenter");
	defineModule(AGJ.event.touch, "leave", "touchleave");

	defineModule(AGJ.event, "mootools");
	defineModule(AGJ.event.mootools, "domReady", "domready");


	// CLASS DEFINITIONS

	var BaseClass = defineModule(AGJ, "Class", function(){});

	// This method of creating classes is a modification of John Resig's: http://ejohn.org/blog/simple-javascript-inheritance/
	// My changes make inheritance behave more like actionscript 3, and allow for easy statics declaration.
	var initializing = false;
	//var canDoSuperTest = /xyz/.test(function(){"xyz";});
	var usesSuperTest = /xyz/.test(function(){"xyz";}) ? /\b_super\b/ : null;

	BaseClass.extend = function extend(properties) {
		var _super = this.prototype;
		var superFn = function (name) {
			return getSuperFn(_super[name], this);
		};
		var getSuperFn = function (fn, scope) {
			return function () {
				fn.apply(scope, arguments);
			};
		};
	 
		initializing = true;
		var prototype = new this();
		initializing = false;

		/*
		var wrapFunction = function (fn) {
			return function () {
				var originalSuper = this._super;
				this._super = _super;
				var result = fn.apply(this, arguments);
				this._super = originalSuper;

				return result;
			};
		};
		*/
		var wrapFunction = function (fn) {
			return function () {
				var originalSuper = this._super;
				this._super = superFn;
				var result = fn.apply(this, arguments);
				this._super = originalSuper;

				return result;
			};
		};
	 
		for (var name in properties) {
			if (name !== "statics") {
				if (typeof properties[name] === "function" && (!usesSuperTest || usesSuperTest.test(properties[name]))) {
				//if (typeof properties[name] === "function") {
					//prototype[name] = wrapFunction(properties[name]);
					prototype[name] = wrapFunction(properties[name]);
					/*
					prototype[name] = (function (fn) {
						return function () {
							var originalSuper = this._super;
							this._super = _super;
							var result = fn.apply(arguments.caller.this, arguments);
							this._super = originalSuper;

							return result;
						};
					})(properties[name]);
					*/

				} else {
					prototype[name] = properties[name];
				}
			}
		}

		function Class() {
			// All construction is actually done in the init method
			if (!initializing && this.init)
				this.init.apply(this, arguments);
		}

		var statics = properties.statics;
		if (statics) {
			for (name in statics) {
				if (statics.hasOwnProperty(name))
					Class[name] = statics[name];
			}
		}

		Class.prototype = prototype;
		Class.prototype.constructor = Class;

		Class.extend = BaseClass.extend;
		return Class;
	};

	// 'Abstract' class meant for extending. Override 'destroy()' to clean up.
	// Remember to call 'this._super("destroy")()'.
	defineModule(AGJ, "Destroyable", BaseClass.extend({
		init: function () {
			this._isDestroyed = false;
		},

		destroy: function () {
			//AGJ.trace("Destroyable: Destroying.");
			this._isDestroyed = true;
		},

		getIsDestroyed: function () { // Boolean
			return this._isDestroyed;
		}
	}));

	defineModule(AGJ, "Dictionary", AGJ.Destroyable.extend({
		init: function() {
			this._super("init")();

			this._keys = [];
			this._values = [];
		},

		set: function (key, value) {
			var index = this._keys.indexOf(key);
			if (index >= 0) {
				this._values[index] = value;
				return;
			}
			this._keys.push(key);
			this._values.push(value);
		},

		get: function (key) { // Object
			var index = this._keys.indexOf(key);
			if (index === -1)
				return null;
			return this._values[index];
		},

		remove: function (key) { // Boolean
			var index = this._keys.indexOf(key);
			if (index === -1)
				return false;
			this._keys.splice(index, 1);
			this._values.splice(index, 1);
			return true;
		},

		clear: function () {
			this._keys.splice(0, this._keys.length);
			this._values.splice(0, this._values.length);
		},

		getKeys: function () {
			return this._keys.concat();
		},

		getValues: function () {
			return this._values.concat();
		},

		destroy: function () {
			this._super("destroy")();
			this._keys = null;
			this._values = null;
		}
	}));

	defineModule(AGJ, "Point", BaseClass.extend({
		init: function (x, y) {
			this.set(x, y);
		},

		set: function (x, y) { // self
			this.x = isNaN(x) ? 0 : x;
			this.y = isNaN(y) ? 0 : y;
			return this;
		},

		add: function (point) { // self
			this.x += point.x;
			this.y += point.y;
			return this;
		},

		subtract: function (point) { // self
			this.x -= point.x;
			this.y -= point.y;
			return this;
		},

		scale: function (value) { // self
			this.x *= value;
			this.y *= value;
			return this;
		},

		rotate: function (radians) { // self
			if (isNaN(radians) || radians === 0)
				return this;
			var angle = AGJ.math.cartesianToRadians(this.x, this.y);
			angle += radians;
			var length = this.getLength();
			this.set(
				length * Math.cos(angle),
				length * Math.sin(angle)
			);
			return this;
		},

		clone: function () { // Point
			return new AGJ.Point(this.x, this.y);
		},

		copy: function (point) { // self
			return this.set(point.x, point.y);
		},

		getLength: function () { // Number
			return Math.sqrt(this.x * this.x + this.y * this.y);
		},

		toRadians: function () { // Number
			return AGJ.math.cartesianToRadians(this.x, this.y);
		},

		toString: function () {
			return "(" + this.x + "," + this.y + ")";
		},

		statics: {
			getDistance: function (point1, point2) { // Number
				var x = point1.x - point2.x;
				var y = point1.y - point2.y;
				return Math.sqrt(x*x + y*y);
			},

			interpolate: function (point1, point2, position) { // Point
				var x = point2.x - point1.x;
				var y = point2.y - point1.y;
				return new AGJ.Point(
					x * position + point1.x,
					y * position + point1.y
				);
			},

			fromPolar: function (radians, length) { // Point
				if (isNaN(length))
					length = 1;
				return new AGJ.Point(
					length * Math.cos(radians),
					length * Math.sin(radians)
				);
			},

			fromObject: function (obj) { // Point
				return new AGJ.Point(obj.x, obj.y);
			}
		}
	}));

	defineModule(AGJ, "Rectangle", BaseClass.extend({
		init: function (x, y, width, height) {
			this.set(x, y, width, height);
		},

		set: function (x, y, width, height) { // self
			this.x = isNaN(x) ? 0 : x;
			this.y = isNaN(y) ? 0 : y;
			this.width = isNaN(width) ? 0 : width;
			this.height = isNaN(height) ? 0 : height;
			return this;
		},

		clone: function () { // Rectangle
			return new AGJ.Rectangle(this.x, this.y, this.width, this.height);
		},

		grow: function (wide, high) { // self
			var w = wide * 0.5;
			var h = high * 0.5;
			this.x -= w;
			this.y -= h;
			this.width += w;
			this.height += h;
			return this;
		},

		getTop: function () { // Number
			return Math.min(this.y, this.height + this.y);
		},
		getRight: function () { // Number
			return Math.max(this.x + this.width, this.x);
		},
		getBottom: function () { // Number
			return Math.max(this.y + this.height, this.y);
		},
		getLeft: function () { // Number
			return Math.min(this.x, this.width + this.x);
		},

		getArea: function () { // Number
			return Math.abs(this.width * this.height);
		},

		intersects: function (rect) { // Boolean
			var thisL = this.getLeft();
			var rectL = rect.getLeft();
			var thisR = this.getRight();
			var rectR = this.getRight();
			var left = Math.max(thisL, rectL);
			var right = Math.min(thisR, rectR);
			if (left >= right)
				return false;

			var thisT = this.getTop();
			var rectT = rect.getTop();
			var thisB = this.getBottom();
			var rectB = rect.getBottom();
			var top = Math.max(thisT, rectT);
			var bottom = Math.min(thisB, rectB);
			return top < bottom;
		},

		contains: function (rectOrPoint) { // Boolean
			if (rectOrPoint.width) {
				return this.getTop() <= rectOrPoint.getTop() &&
				       this.getRight() >= rectOrPoint.getRight() &&
				       this.getBottom() >= rectOrPoint.getBottom &&
				       this.getLeft() <= rectOrPoint.getLeft();
			} else {
				return this.getTop() <= rectOrPoint.y &&
				       this.getRight() >= rectOrPoint.x &&
				       this.getBottom() >= rectOrPoint.y &&
				       this.getLeft() <= rectOrPoint.x;
			}
		},

		excludes: function (rect) { // Boolean
			return this.getTop() >= rect.getBottom() ||
				this.getRight() <= rect.getLeft() ||
				this.getBottom() <= rect.getTop() ||
				this.getLeft() >= rect.getRight();
		},

		toString: function () {
			return "(x:" + this.x + ",y:" + this.y + ",w:" + this.width + ",h:" + this.height + ")";
		}
	}));


	// MIXINS

	/*
	defineModule(AGJ, "mixins.apply");

	// Adds a way for accessing private properties to classes.
	// Apply: AGJ.mixin(this, AGJ.mixins.privates); // Within class closure.
	// Use:   _private(this).property
	defineModule(AGJ.mixins, "privates", {
		_privates: new AGJ.Dictionary(),
		_private: function (instance) {
			var result = _privates.get(instance);
			if (!result) {
				_privates.set(instance, {});
				result = _privates.get(instance);
			}
			return result;
		},
		destroy: function () {
			console.log("destroy?!");
		}
	});

	defineModule(AGJ.mixins.apply, "privates", function (classClosure, theClass) {
		//AGJ.mixin(classClosure, );
	});
	*/


}(this));

