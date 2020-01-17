
/**
 * Classes for outputting Stroke drawings.
 *
 * Depends on: agj.js, agj-brush.js, agj-draw.js, signals.js
 *
 * Created by agj (www.agj.cl).
 */

 /*global AGJ:false*/
 /*global signals:false*/
;(function (that) {
	"use strict";

	// Imports.
	var Class = AGJ.Class;
	var Point = AGJ.Point;
	var DrawStyle = AGJ.graphics.DrawStyle;
	var draw = AGJ.graphics.draw;
	var Signal = signals.Signal;
	var defineModule = AGJ.defineModule;

	// Namespace definition.
	var brush = defineModule(AGJ, "graphics.brush");

	var strokePlayerID = 0;
	var StrokePlayer = defineModule(brush, "StrokePlayer", AGJ.Destroyable.extend({
		init: function (stroke, context2D, strokeStyle, numberDelay) {
			this._id = strokePlayerID;
			strokePlayerID++;
			// AGJ.trace("StrokePlayer: init.", this._id);
			this._super("init")();

			this._stroke = stroke;
			this._context = context2D;
			if (!strokeStyle)
				strokeStyle = new StrokeStyle();
			this._strokeStyle = strokeStyle;

			this._nodeIndex = 0;

			// Reusables.
			this._pt1 = new Point();
			this._pt2 = new Point();
			this._ds = new DrawStyle();
			// this._timeoutCallback = AGJ.getCallback(this._onTimer, null, this);
			// this._liveStrokeModifiedCallback = AGJ.getCallback(this._onLiveStrokeModified, null, this);

			this._drawTime = AGJ.getTime() + (isNaN(numberDelay) ? 0 : numberDelay);
			// this._wait();
			this._walk();
		},

		getStroke: function () {
			return this._stroke;
		},

		getFinished: function () {
			if (!this._finished)
				this._finished = new Signal();
			return this._finished;
		},

		_walk: function () {
			// AGJ.trace("StrokePlayer: Walking.", this._isDestroyed, this._id);
			while (true) {
				if (this._nodeIndex < this._stroke.nodes.length) {
					var now = AGJ.getTime();
					var node = this._stroke.nodes[this._nodeIndex];

					this._drawTime += node.delay;

					if (this._drawTime <= now) {
						// AGJ.trace("   draw now", this._id);
						this._takeStep();
					} else {
						// AGJ.trace("   draw later", this._id);
						clearTimeout(this._timeout);
						this._timeout = setTimeout(AGJ.getCallback(this._onTimer, null, this), this._drawTime - now);
						break;
					}
				} else if (this._stroke.getIsLive()) {
					this._stroke.getModified().addOnce(AGJ.getCallback(this._onLiveStrokeModified, null, this));
					// AGJ.trace("   is live", this._id, this);
					break;
				} else if (this._nodeIndex === this._stroke.nodes.length) {
					// AGJ.trace("   is last", this._nodeIndex, this._stroke.nodes.length, this._id);
					this._takeStep();
					if (this._finished)
						this._finished.dispatch();
					this.destroy();
					break;
				} else {
					throw "Irregular situation: node index too high.";
				}
			}
		},

		_takeStep: function () {
			this._calculateDraw(this._stroke.nodes, this._nodeIndex, this._stroke.center, this._strokeStyle);
			this._nodeIndex++;
			//this._wait();
		},

		/*
		_wait: function () {
			//AGJ.trace("StrokePlayer: Waiting.", this._nodeIndex, this._stroke.nodes.length, this._stroke.getIsLive(), this._stroke, this._timeout);
			if (this._nodeIndex < this._stroke.nodes.length) {
				var now = AGJ.getTime();
				var node = this._stroke.nodes[this._nodeIndex];

				this._drawTime += node.delay;

				// if (this._drawTime <= now) {
				// 	this._takeStep();
				// } else {
					clearTimeout(this._timeout);
					this._timeout = setTimeout(AGJ.getCallback(this._onTimer, null, this), Math.max(this._drawTime - now, 0));
				// }
			} else if (this._stroke.getIsLive()) {
				this._stroke.getModified().addOnce(AGJ.getCallback(this._onLiveStrokeModified, null, this));
			} else if (this._nodeIndex === this._stroke.nodes.length) {
				this._takeStep();
				if (this._finished && this._finished.getNumListeners() > 0)
					this._finished.dispatch();
				this.destroy();
			}
		},
		*/

		_calculateDraw: function (arrayStrokeNodes, nodeIndex, pointCenter, strokeStyle) {
			var len = arrayStrokeNodes.length;
			var isEnd = nodeIndex === len;
			if (nodeIndex < 1 && !isEnd)
				return;

			// Determine points.
			var pt1, pt2, pt3;
			var idx = nodeIndex;
			if (!isEnd) {
				pt3 = Point.fromObject(arrayStrokeNodes[idx]);
			}
			if (idx > 0)
				idx--;
			pt2 =     Point.fromObject(arrayStrokeNodes[idx]);
			if (idx > 0)
				idx--;
			pt1 =     Point.fromObject(arrayStrokeNodes[idx]);

			this._executeDraw(arrayStrokeNodes, nodeIndex, pointCenter, pt1, pt2, pt3, strokeStyle, isEnd);
		},

		_executeDraw: function (arrayStrokeNodes, nodeIndex, pointCenter, pt1, pt2, pt3, strokeStyle, isEnd) {
			var startIndex = Math.max(nodeIndex - strokeStyle.smoothingSamples, 0);
			var sampleNodes = arrayStrokeNodes.slice(startIndex, nodeIndex + 1);

			var speed = this._getAverageSpeed(sampleNodes);
			var weight = this._getWeightModifiedBySpeed(strokeStyle.drawStyle.lineWeight, speed, strokeStyle.weightStability, strokeStyle.peakWeightFactor, strokeStyle.baseWeightFactor);

			if (!isEnd)
				this._drawCurve(this._context, pointCenter, pt1, pt2, pt3, strokeStyle.drawStyle.lineColor, strokeStyle.drawStyle.lineAlpha, weight);
			else
				this._drawEnd(this._context, pointCenter, pt1, pt2, strokeStyle.drawStyle.lineColor, strokeStyle.drawStyle.lineAlpha, weight);
		},

		_drawCurve: function (context2D, pointCenter, pt1, pt2, pt3, color, alpha, weight) {
			var ptA, ptB;
			var c = pointCenter;

			if (pt3) {
				ptA = Point.interpolate(pt1, pt2, 0.5);
				ptB = Point.interpolate(pt2, pt3, 0.5);
				this._ds.setLineColor(color).setLineWeight(weight).setLineAlpha(alpha).setLineCapsStyle("round").setLineJointStyle("round");
				if (Point.getDistance(ptA, pt2) + Point.getDistance(pt2, ptB) > 5)
					draw.curve(context2D, this._ds, ptA.x + c.x, ptA.y + c.y, pt2.x + c.x, pt2.y + c.y, ptB.x + c.x, ptB.y + c.y);
				else
					draw.line(context2D, this._ds, ptA.x + c.x, ptA.y + c.y, ptB.x + c.x, ptB.y + c.y);
			} else {
				draw.line(context2D, this._ds, pt1.x + c.x, pt1.y + c.y, pt2.x + c.x, pt2.y + c.y);
			}
		},

		_drawEnd: function (context2D, pointCenter, pt1, pt2, color, alpha, weight) {
			var c = pointCenter;
			var ptA = Point.interpolate(pt1, pt2, 0.5);
			this._ds.setLineColor(color).setLineWeight(weight).setLineAlpha(alpha).setLineCapsStyle("round").setLineJointStyle("round");
			draw.line(context2D, this._ds, ptA.x + c.x, ptA.y + c.y, pt2.x + c.x, pt2.y + c.y);
		},

		_getAverageSpeed: function (arrayStrokeNodes) { // Number
			var samples = arrayStrokeNodes.length;
			if (samples === 0)
				return 0;

			var time = 0;
			var distance = 0;
			for (var i = 0; i < samples; i++) {
				if (i > 0) {
					time += arrayStrokeNodes[i].delay;
					this._pt1.set(arrayStrokeNodes[i - 1].x, arrayStrokeNodes[i - 1].y);
					this._pt2.set(arrayStrokeNodes[i].x, arrayStrokeNodes[i].y);
					distance += Point.getDistance(this._pt1, this._pt2);
				}
			}

			return (distance/samples) / (time/samples);
		},

		_getWeightModifiedBySpeed: function (weight, speed, weightStability, peakWeightFactor, baseWeightFactor) { // Number
			var result;
			if (speed === 0 || isNaN(speed))
				result = weight;
			else
				result = (weight - weight * baseWeightFactor) * AGJ.math.curve(speed, weightStability + 1, peakWeightFactor) + (weight * baseWeightFactor);
			return result;
		},

		_onTimer: function () {
			// AGJ.trace("StrokePlayer: Timer.", this._isDestroyed, this._id);
			if (this._isDestroyed)
				return;
			this._timeout = null;
			this._takeStep();
			this._walk();
		},

		_onLiveStrokeModified: function () {
			// AGJ.trace("StrokePlayer: Stroke modified.", this._isDestroyed, this._id);
			if (this._isDestroyed)
				return;
			// this._stroke.getModified().remove(this._liveStrokeModifiedCallback);
			//this._wait();
			this._walk();
		},

		destroy: function () {
			// AGJ.trace("StrokePlayer: Destroyed.", this._id);
			this._super("destroy")();

			AGJ.destroy([
				this._finished
			]);
			this._finished = null;
			this._stroke = null;
			this._context = null;
			clearTimeout(this._timeout);
		}
	}));

	var StrokeStyle = defineModule(brush, "StrokeStyle", AGJ.Class.extend({
		init: function (drawStyle, numberSmoothingSamples, numberPeakWeightFactor, numberWeightStability, numberBaseWeightFactor) {
			this.drawStyle = drawStyle ? drawStyle : DrawStyle.makeLineStyle(0x000000, 3, 1);
			this.smoothingSamples = !isNaN(numberSmoothingSamples) ? numberSmoothingSamples : 5;
			this.peakWeightFactor = !isNaN(numberPeakWeightFactor) ? numberPeakWeightFactor : 1.5;
			this.weightStability = !isNaN(numberWeightStability) ? numberWeightStability : 0.5;
			this.baseWeightFactor = !isNaN(numberBaseWeightFactor) ? numberBaseWeightFactor : 0;
		}
	}));

})(this);

