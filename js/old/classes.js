

/* jshint mootools:true*/
/*global AGJ:false*/
;(function (that) {

	AGJ.defineNamespace(AGJ, "projects.html5touch");

	// TOUCH MANAGER

	AGJ.defineNamespace(AGJ.projects.html5touch, "TouchManager", new Class( {
		initialize: function () {
			this._touches = [];
		},

		add: function (touch) {
			if (!this._touches.contains(touch))
				this._touches.push(touch);
		},

		remove: function (id) {
			var len = this._touches.length;
			for (var i = 0; i < len; i++) {
				if (this._touches[i].getID() === id) {
					this._touches.erase(this._touches[i]);
					break;
				}
			}
		},

		get: function (id) { // MyTouch
			var len = this._touches.length;
			for (var i = 0; i < len; i++) {
				if (this._touches[i].getID() === id)
					return this._touches[i];
			}
			return null;
		}
	} ));

	AGJ.projects.html5touch.TouchManager.makeTouch = function(raw) { // MyTouch
		return new AGJ.projects.html5touch.MyTouch(
			raw.identifier,
			AGJ.projects.html5touch.TouchManager.makeTouchPoint(raw)
		);
	};

	AGJ.projects.html5touch.TouchManager.makeTouchPoint = function(raw) {
		return new AGJ.projects.html5touch.TouchPoint(
			new AGJ.projects.html5touch.Point(raw.clientX, raw.clientY),
			new AGJ.projects.html5touch.Point(raw.pageX, raw.pageY),
			new AGJ.projects.html5touch.Point(raw.screenX, raw.screenY)
		);
	};


	// MY TOUCH

	AGJ.defineNamespace(AGJ.projects.html5touch, "MyTouch", new Class({

		initialize: function (id, startPoint) {
			this._id = id;
			this._points = [startPoint];
		},

		addPoint: function (point) {
			this._points.push(point);
		},
		
		// Getters, setters.
		
		getStart: function() {
			return this._points[0];
		},
		
		getLast: function() {
			return this._points[this._points.length - 1];
		},
		
		getSecondToLast: function() {
			return this._points[Math.max(0, this._points.length - 2)];
		},
		
		getID: function() {
			return this._id;
		},
		
		getPoints: function() {
			return this._points.concat();
		}
	}));


	// TOUCH POINT

	AGJ.defineNamespace(AGJ.projects.html5touch, "TouchPoint", new Class({
		initialize: function (viewport, scrolled, screen) {
			this.viewport = viewport;
			this.scrolled = scrolled;
			this.screen = screen;
		}
	}));

	// POINT

	AGJ.defineNamespace(AGJ.projects.html5touch, "Point", new Class({
		initialize: function (x, y) {
			this.x = x;
			this.y = y;
		}
	}));

})(this);
