
/*global AGJ:false*/
/*global signals:false*/
;(function (that) {
	"use strict";

	// Imports.
	var trace = AGJ.trace;
	var Class = AGJ.Class;
	var Point = AGJ.Point;
	var Rectangle = AGJ.Rectangle;
	var DrawStyle = AGJ.graphics.DrawStyle;
	var brush = AGJ.graphics.brush;
	var StrokeStyle = brush.StrokeStyle;
	var StrokePlayer = brush.StrokePlayer;
	var defineModule = AGJ.defineModule;
	var Signal = signals.Signal;

	var flowerpattern = defineModule(AGJ, "projects.flowerpattern");

	var PlayerManager = defineModule(flowerpattern, "PlayerManager", Class.extend({
		init: function (config) {
			this._cfg = config;
			this._playing = [];
		},

		addStroke: function (stroke) {
			this._pushStrokePlayer(new StrokePlayerBase(this._cfg, stroke));
		},

		getIsPlaying: function () { // Boolean
			return this._playing.length > 0;
		},

		getAcceptsStrokes: function () { // Boolean
			return true;
		},

		getWillCombineStroke: function () { // Boolean
			return false;
		},

		_pushStrokePlayer: function (strokePlayer) {
			this._playing.push(strokePlayer);
			strokePlayer.getFinished().addOnce(AGJ.getCallback(this._onStrokePlayerFinished, [strokePlayer], this));
		},

		_onStrokePlayerFinished: function (strokePlayer) {
			this._playing.remove(strokePlayer);
		}
	}));

	var AbstractPlayerManagerMemory = defineModule(flowerpattern, "AbstractPlayerManagerMemory", PlayerManager.extend({
		init: function (config, forgetOnMultiTouch) {
			this._super("init")(config);

			this._forgetOnMultiTouch = forgetOnMultiTouch;

			this._leadStrokesPlaying = [];
			this._forgetTimeoutID = null;
			this._hasStrokeInMemory = false;
			this._wasMultiTouched = false;
			this._forgetTimeoutCallback = AGJ.getCallback(this._onForgetTimeout, null, this);
		},

		addStroke: function (stroke) {
			this._stopTimeout();
			if (this._forgetOnMultiTouch && (this._wasMultiTouched || this._leadStrokesPlaying.length > 0)) {
				this._wasMultiTouched = (this._leadStrokesPlaying.length > 0);
				this._forget();
			}
		},

		getIsPlaying: function () {
			return this._leadStrokesPlaying.length > 0;
		},

		getWillCombineStroke: function () { // Boolean
			return this._hasStrokeInMemory && (!this._forgetOnMultiTouch || (!this._wasMultiTouched && this._leadStrokesPlaying.length === 0));
		},

		getHasStrokeInMemory: function () { // Boolean
			return this._hasStrokeInMemory;
		},

		_pushStrokePlayer: function (strokePlayer) {
			throw "Use _pushStrokePlayerExtended instead.";
		},

		_pushStrokePlayerExtended: function (strokePlayer, isLead) {
			this._super("_pushStrokePlayer")(strokePlayer);
			if (isLead) {
				this._leadStrokesPlaying.push(strokePlayer);
				strokePlayer.getFinished().addOnce(AGJ.getCallback(this._onLeadStrokePlayerFinished, [strokePlayer], this));
			}
		},

		_getCenterOffset: function (rememberedCenter, strokeCenter) { // Point
			if (!rememberedCenter || !strokeCenter)
				return null;
			return strokeCenter.clone().subtract(rememberedCenter);
		},

		_forget: function () {
			// trace("AbstractPlayerManagerMemory: Forgetting.");
			this._hasStrokeInMemory = false;
		},

		_startTimeout: function () {
			this._stopTimeout();
			this._forgetTimeoutID = setTimeout(this._forgetTimeoutCallback, this._cfg.mode.all.stroke.continuousMemoryTime);
		},
		_stopTimeout: function () {
			clearTimeout(this._forgetTimeoutID);
			this._forgetTimeoutID = null;
		},

		_onLeadStrokePlayerFinished: function (strokePlayer) {
			this._leadStrokesPlaying.remove(strokePlayer);
			if (this._leadStrokesPlaying.length === 0) {
				this._startTimeout();
			}
		},

		_onForgetTimeout: function () {
			this._forget();
		},

		destroy: function () {
			this._super("destroy")();
			this._stopTimeout();
		}
	}));

	var StrokePlayerBase = defineModule(flowerpattern, "StrokePlayerBase", StrokePlayer.extend({
		init: function (config, stroke, options) { //numberDelay, pointCenterOffset, numberRotateRad, pointOffset, doMirror) {
			this._cfg = config;
			this._options = options || {};

			this._pt3 = new Point();

			this._super("init")(stroke, null, null, this._options.delay);
		},

		_calculateDraw: function (arrayStrokeNodes, nodeIndex, pointCenter, strokeStyle) {
			var idx = nodeIndex - (nodeIndex >= arrayStrokeNodes.length ? 1 : 0);
			var node = arrayStrokeNodes[idx];
			if (node.getData().style)
				strokeStyle = node.getData().style;
			this._super("_calculateDraw")(arrayStrokeNodes, nodeIndex, pointCenter, strokeStyle);
		},

		_drawCurve: function (context2D, pointCenter, pt1, pt2, pt3, color, alpha, weight, dontTransformPoints) {
			//trace("StrokePlayerBase: Drawing curve.", this._centerOffset, this._offset);
			if (!dontTransformPoints)
				this._transformPoints(pt1, pt2, pt3);
			this._super("_drawCurve")(this._cfg.context, pointCenter, pt1, pt2, pt3, color, alpha, weight);
		},

		_drawEnd: function (context2D, pointCenter, pt1, pt2, color, alpha, weight, dontTransformPoints) {
			if (!dontTransformPoints)
				this._transformPoints(pt1, pt2);
			this._super("_drawEnd")(this._cfg.context, pointCenter, pt1, pt2, color, alpha, weight);
		},

		_pointIsInside: function (point, left, top, right, bottom) {
			return point &&
			       point.x > left - 10  &&  point.x < right  + 10  &&
			       point.y > top  - 10  &&  point.y < bottom + 10;
		},

		_transformPoints: function () {
			for (var i = 0, len = arguments.length; i < len; i++) {
				var pt = arguments[i];
				if (!pt)
					continue;
				// First we offset the center.
				if (this._options.centerOffset)
					pt.add(this._options.centerOffset);
				// Then we perform origin-dependent transformations.
				if (this._options.mirrorH)
					this._multToPoint(pt, -1, 1);
				if (this._options.mirrorV)
					this._multToPoint(pt, 1, -1);
				if (this._options.rotation)
					pt.rotate(this._options.rotation);
				if (this._options.scale)
					this._multToPoint(pt, this._options.scale.x, this._options.scale.y);
				// Now we undo the center offset.
				if (this._options.centerOffset)
					pt.subtract(this._options.centerOffset);
				// We finally apply the general offset.
				if (this._options.offset)
					pt.add(this._options.offset);
			}
		},

		_multToPoint: function (pt, x, y) {
			pt.x *= x;
			pt.y *= y;
		},

		destroy: function () {
			this._super("destroy")();
			this._cfg = null;
		}
	}));


	////////////////////////////////////////////////////////////////////////////


	var PlayerManagerPlain = defineModule(flowerpattern, "PlayerManagerPlain", AbstractPlayerManagerMemory.extend({
		init: function (config) {
			this._super("init")(config);
		},

		addStroke: function (stroke) {
			this._super("addStroke")(stroke);

			if (!this._hasStrokeInMemory) {
				this._hasStrokeInMemory = true;
			}
			
			this._pushStrokePlayerExtended(new StrokePlayerBase(this._cfg, stroke), true);
		}
	}));

	/////

	var PlayerManagerStar = defineModule(flowerpattern, "PlayerManagerStar", AbstractPlayerManagerMemory.extend({
		init: function (config) {
			this._super("init")(config, true);

			this._center = null;
			this._repetitions = 0;
			this._rotationDirection = 1;
			this._formation = null;
			this._formations = {
				clockwise: "clockwise",
				counterClockwise: "counterClockwise",
				wave: "wave",
				polarWave: "polarWave",
				polarClockwise: "polarClockwise",
				polarCounterClockwise: "polarCounterClockwise"
			};
		},

		addStroke: function (stroke) {
			this._super("addStroke")(stroke);
			var star = this._cfg.mode.star;

			var centerOffset = this._getCenterOffset(this._center, stroke.center);

			if (!this._hasStrokeInMemory) {
				this._hasStrokeInMemory = true;
				this._repetitions = AGJ.number.randomInt(star.stroke.repetitions.max - star.stroke.repetitions.min) + star.stroke.repetitions.min;
				this._rotationDirection = AGJ.util.tossCoin() ? 1 : -1;
				this._formation = AGJ.object.getKeys(this._formations).getRandom();
			}
			
			// var interval = star.stroke.delay / this._repetitions;
			for (var i = 0; i < this._repetitions; i++) {
				this._pushStrokePlayerExtended(
					new StrokePlayerBase(this._cfg, stroke, {
						delay: this._getDelay(i, this._repetitions, this._formation), //interval * i,
						centerOffset: centerOffset,
						rotation: Math.PI * 2 / this._repetitions * i
					}),
					i === 0
				);
			}
			
			if (!this._center)
				this._center = stroke.center;
		},

		_getDelay: function (iteration, total, formationMode) { // Number
			var interval = this._cfg.mode.star.stroke.delay / total;
			if (formationMode === this._formations.clockwise) {
				return interval * iteration;
			} else if (formationMode === this._formations.counterClockwise) {
				return interval * ((total - iteration) % total);
			} else {
				interval *= 2;
				var halfTotal = total * 0.5;
				if (formationMode === this._formations.wave) {
					return interval * (halfTotal - Math.abs(iteration - halfTotal));
				} else if (formationMode === this._formations.polarClockwise) {
					return interval * (iteration % halfTotal);
				} else if (formationMode === this._formations.polarCounterClockwise) {
					return interval * ((halfTotal - (iteration % halfTotal)) % halfTotal);
				} else if (formationMode === this._formations.polarWave) {
					interval *= 2;
					var quarterTotal = total * 0.25;
					return interval * (quarterTotal - Math.abs(iteration % halfTotal - quarterTotal));
				}
			}
			return 0;
		},

		_forget: function () {
			this._super("_forget")();
			this._center = null;
			this._repetitions = 0;
		}
	}));

	/////

	var PlayerManagerChain = defineModule(flowerpattern, "PlayerManagerChain", PlayerManager.extend({
		init: function (config) {
			this._super("init")(config);

			this._links = [];
		},

		addStroke: function (stroke) {
			var link = new PlayerManagerChainLink(this._cfg, stroke);
			link.getFinished().addOnce(AGJ.getCallback(this._onLinkFinished, [link], this));
			this._links.push(link);
		},

		_onLinkFinished: function (link) {
			this._links.remove(link);
		}
	}));

	var PlayerManagerChainLink = defineModule(flowerpattern, "PlayerManagerChainLink", PlayerManager.extend({
		init: function (config, stroke) {
			this._super("init")(config);

			this._finished = new Signal();
			this._angle = 0;
			this._totalRepetitions = 0;
			this._repetition = 0;
			this._lastOffset = null;
			this._scaleFactor = 0;

			var player = new StrokePlayerBase(this._cfg, stroke);
			player.getFinished().addOnce(AGJ.getCallback(this._onLeadStrokePlayerFinished, [player], this));
			this._pushStrokePlayer(player);
		},

		addStroke: function (stroke) {
			throw "This is a one-time use class.";
		},

		getFinished: function () {
			return this._finished;
		},

		_pushRepeatedStrokePlayer: function (strokePlayer) {
			strokePlayer.getFinished().addOnce(AGJ.getCallback(this._onRepeatedStrokePlayerFinished, [strokePlayer], this));
			this._pushStrokePlayer(strokePlayer);
		},

		_onLeadStrokePlayerFinished: function (strokePlayer) {
			var stroke = strokePlayer.getStroke();
			var nodes = stroke.nodes;
			var len = nodes.length;
			if (len >= 2) {
				var lastPoint = Point.fromObject(nodes[len-1]);
				var diff = lastPoint.clone().subtract(nodes[len-2]);
				var endAngle = diff.toRadians();
				diff  = Point.fromObject(nodes[1]).subtract(nodes[0]);
				var startAngle = diff.toRadians();

				var cfgChain = this._cfg.mode.chain;
				this._repetition = 1;
				this._totalRepetitions = Math.round(cfgChain.duration / this._getDuration(nodes));
				this._lastOffset = lastPoint;
				this._scaleFactor = Math.random() * (cfgChain.stroke.scale.max - cfgChain.stroke.scale.min) + cfgChain.stroke.scale.min;

				this._angle = endAngle - startAngle;
				// this._pushRepeatedStrokePlayer(new StrokePlayerBase(this._cfg, stroke, { rotation: this._angle, offset: this._lastOffset } ));
				var scale = this._getScale(this._repetition, this._totalRepetitions, this._scaleFactor);
				this._pushRepeatedStrokePlayer(new StrokePlayerBase(this._cfg, stroke, {
					rotation: this._angle,
					offset: this._lastOffset,
					scale: new Point(scale, scale)
				} ));
			}
		},

		_getDuration: function (arrayStrokeNodes) {
			var result = 0;
			for (var key in arrayStrokeNodes) {
				if (!arrayStrokeNodes.hasOwnProperty(key))
					continue;
				result += arrayStrokeNodes[key].delay;
			}
			return result;
		},

		_getScale: function (repetition, total, scaleFactor) { // Number
			if (scaleFactor > 0) {
				scaleFactor *= 0.01;
				return (repetition * repetition) * scaleFactor + 1;
			} else if (scaleFactor === 0) {
				return 1;
			} else {
				scaleFactor = 1 / (-scaleFactor);
				return 1 / (repetition + scaleFactor).logBase(scaleFactor);
			}
		},

		_onRepeatedStrokePlayerFinished: function (strokePlayer) {
			var stroke = strokePlayer.getStroke();
			this._repetition++;
			if (this._repetition < this._totalRepetitions) {
				var angle = this._angle * this._repetition;
				var lastNode = stroke.nodes.getLast();

				var scale = this._getScale(this._repetition - 1, this._totalRepetitions, this._scaleFactor);
				this._lastOffset = this._lastOffset.add(Point.fromObject(lastNode).rotate(this._angle * (this._repetition - 1)).scale(scale));

				scale = this._getScale(this._repetition, this._totalRepetitions, this._scaleFactor);
				this._pushRepeatedStrokePlayer(new StrokePlayerBase(this._cfg, stroke, {
					rotation: angle,
					offset: this._lastOffset,
					scale: new Point(scale, scale)
				} ));
			} else {
				this._finished.dispatch();
			}
		}
	}));

	/////

	var PlayerManagerGrid = defineModule(flowerpattern, "PlayerManagerGrid", AbstractPlayerManagerMemory.extend({
		init: function (config) {
			this._super("init")(config);

			this._interSpace = 0;
			this._center = null;
			this._offsets = null;
			this._rotations = null;
			this._mirrorings = null;
		},

		addStroke: function (stroke) {
			if (!this.getAcceptsStrokes())
				throw "Cannot accept stroke right now.";

			this._super("addStroke")(stroke);

			if (!this._hasStrokeInMemory) {
				this._hasStrokeInMemory = true;
				this._interSpace = this._getInterSpace();
				this._makeOffsets(this._interSpace);
			}
			
			var canvas = this._cfg.context.canvas;
			var hRepetitions = this._getRepetitions(canvas.width, this._interSpace);
			var vRepetitions = this._getRepetitions(canvas.height, this._interSpace);
			var area = new Rectangle(0, 0, hRepetitions * this._interSpace, vRepetitions * this._interSpace);
			area.x = -this._interSpace;
			area.y = -this._interSpace;
			var centerOffset = this._getCenterOffset(this._center, stroke.center);

			var total = this._offsets.length;
			trace("actual repetitions:", total);
			for (var i = 0; i < total; i++) {
				var offset = this._offsets[i];
				var rotation = this._rotations[i];
				var mirror = this._mirrorings[i];
				var hAreaW = area.width * 0.5, hAreaH = area.height * 0.5;
				var delay = Math.max(hAreaW - Math.abs(offset.x - hAreaW), hAreaH - Math.abs(offset.y - hAreaH)) * this._cfg.mode.grid.stroke.delay;

				this._pushStrokePlayerExtended(
					new StrokePlayerPortal(this._cfg, stroke, {
						area: area,
						delay: delay,
						rotation: rotation,
						centerOffset: centerOffset,
						offset: offset,
						mirrorH: mirror
					} ),
					delay === 0
				);
			}

			if (!this._center)
				this._center = stroke.center;
		},

		getAcceptsStrokes: function () { // Boolean
			return !this.getIsPlaying();
		},

		_getInterSpace: function () { // Number
			var cfgGrid = this._cfg.mode.grid;
			var min = cfgGrid.stroke.separation.min * this._cfg.scale;
			var max = cfgGrid.stroke.separation.max * this._cfg.scale;
			var canvas = this._cfg.context.canvas;

			var maxRepetitions = Math.pow(Math.sqrt(cfgGrid.stroke.maxRepetitions) - 2.8, 2);
			var hardMin = Math.sqrt(canvas.width * canvas.height / maxRepetitions);
			min = Math.max(hardMin, min);

			var space = Math.random() * Math.max(max - min, 0) + min;

			trace("min", min, "maxRepetitions", cfgGrid.stroke.maxRepetitions, maxRepetitions, "hardMin", hardMin, "space", space);
			return space;
		},

		_makeOffsets: function (space) {
			var canvas = this._cfg.context.canvas;
			var hRepetitions = this._getRepetitions(canvas.width, space);
			var vRepetitions = this._getRepetitions(canvas.height, space);
			
			this._offsets = [];
			this._rotations = [];
			this._mirrorings = [];
			
			var mirror = AGJ.util.tossCoin();
			var rotate = AGJ.util.tossCoin();
			var mirrorOnX = AGJ.util.tossCoin();
			trace("PlayerManagerGrid: Making offsets. mirror: " + mirror + ", rotate: " + rotate + ", mirrorOnX: " + mirrorOnX);

			var count = 0;
			for (var x = -1; x < hRepetitions; x++) {
				for (var y = -1; y < vRepetitions; y++) {
					this._offsets[count] = new Point(x * space, y * space);
					this._mirrorings[count] = mirror && (mirrorOnX ? x : y) % 2 !== 0;
					this._rotations[count] = (rotate && (!mirrorOnX ? x : y) % 2 !== 0) ? Math.PI : 0;
					count++;
				}
			}
		},

		_getRepetitions: function (total, distance) { // Number
			var result = Math.ceil(total / distance) + 1;
			if (result % 2 !== 0)
				++result;
			return result;
		},

		_forget: function () {
			this._super("_forget")();
			this._center = null;
			this._offsets = null;
			this._rotations = null;
			this._mirrorings = null;
		}
	}));

	var StrokePlayerPortal = defineModule(flowerpattern, "StrokePlayerPortal", StrokePlayerBase.extend({
		init: function (config, stroke, options) {
			this._rect = new Rectangle();

			this._super("init")(config, stroke, options);
		},

		_drawCurve: function (context2D, pointCenter, pt1, pt2, pt3, color, alpha, weight) {
			this._transformPoints(pt1, pt2, pt3);

			this._pt1.copy(pt1).add(pointCenter);
			var area = this._options.area;

			if (area.contains(this._pt1)) {
				this._super("_drawCurve")(this._cfg.context, pointCenter, pt1, pt2, pt3, color, alpha, weight, true);
			} else {
				var displaceX = 0, displaceY = 0;
				if (this._pt1.x < area.getLeft())
					displaceX = 1;
				else if (this._pt1.x > area.getRight())
					displaceX = -1;
				if (this._pt1.y < area.getTop())
					displaceY = 1;
				else if (this._pt1.y > area.getBottom())
					displaceY = -1;

				var displacedCenter = this._pt1;
				if (displaceX && displaceY) {
					displacedCenter.copy(pointCenter);
					displacedCenter.x += area.width * displaceX;
					displacedCenter.y += area.height * displaceY;
					this._super("_drawCurve")(this._cfg.context, displacedCenter, pt1, pt2, pt3, color, alpha, weight, true);
				}
				if (displaceX) {
					displacedCenter.copy(pointCenter);
					displacedCenter.x += area.width * displaceX;
					this._super("_drawCurve")(this._cfg.context, displacedCenter, pt1, pt2, pt3, color, alpha, weight, true);
				}
				if (displaceY) {
					displacedCenter.copy(pointCenter);
					displacedCenter.y += area.height * displaceY;
					this._super("_drawCurve")(this._cfg.context, displacedCenter, pt1, pt2, pt3, color, alpha, weight, true);
				}
			}
		}
	}));

	/////

	var PlayerManagerWave = defineModule(flowerpattern, "PlayerManagerWave", PlayerManager.extend({
		init: function (config) {
			this._super("init")(config);

			this._leadStrokes = [];
			this._initialTimeout = null;
		},

		addStroke: function (stroke) {
			this._super("addStroke")(stroke);
			this._checkLeadReady(stroke);
		},

		_checkLeadReady: function (stroke) {
			if (stroke.nodes.length >= 2)
				this._initialTimeout = setTimeout(AGJ.getCallback(this._onInitialTimeout, [stroke], this), this._cfg.mode.wave.stroke.delay);
			else
				stroke.getModified().addOnce(AGJ.getCallback(this._onLeadModified, [stroke], this));
		},

		_onInitialTimeout: function (stroke) {
			this._leadStrokes.remove(stroke);
			var nodes = stroke.nodes;
			var delayOffset = -nodes[0].delay - nodes[1].delay;
			var separation =
				(AGJ.number.randomInt(this._cfg.mode.wave.stroke.separation.max - this._cfg.mode.wave.stroke.separation.min)
					+ this._cfg.mode.wave.stroke.separation.min)
				* this._cfg.scale;
			var scaleFactor = Math.random() * (this._cfg.mode.wave.stroke.scale.max - this._cfg.mode.wave.stroke.scale.min) + this._cfg.mode.wave.stroke.scale.min;
			var angle = Point.fromObject(nodes[1]).subtract(Point.fromObject(nodes[0])).toRadians() + (Math.PI * 0.5);
			for (var i = 0; i < this._cfg.mode.wave.stroke.repetitions; i++) {
				var delay = this._cfg.mode.wave.stroke.delay * i + delayOffset;
				var scaleValue = ((i+1) * (i+1)) * scaleFactor + 1;
				var scale = new Point(scaleValue, scaleValue);

				var offset = Point.fromPolar(angle, separation * (i + 1));
				this._pushStrokePlayer(new StrokePlayerBase(this._cfg, stroke, { delay: delay, offset: offset, scale: scale } ));

				offset = Point.fromPolar(angle, -separation * (i + 1));
				this._pushStrokePlayer(new StrokePlayerBase(this._cfg, stroke, { delay: delay, offset: offset, scale: scale } ));
			}
		},

		_onLeadModified: function (stroke) {
			this._checkLeadReady(stroke);
		}
	}));


})(this);
