
/*jshint mootools:true*/
/*global AGJ:false*/
;(function (that) {
	"use strict";

	var canvas; // Canvas
	var ctx; // Context
	var tm; // TouchManager

	var h5t;

	window.addEvent("domready", onDOMReady);

	function onDOMReady(e) {
		canvas = $("canvas");
		ctx = canvas.getContext("2d");
		
		ctx.fillRect(100, 100, 200, 200);
		
		canvas.addEvent(AGJ.event.touch.start, onPress);
		canvas.addEvent(AGJ.event.touch.move, onMove);
		canvas.addEvent(AGJ.event.touch.end, onRelease);
		canvas.addEvent(AGJ.event.mouse.down, onPress);
		canvas.addEvent(AGJ.event.mouse.move, onMove);
		canvas.addEvent(AGJ.event.mouse.up, onRelease);
		
		h5t = AGJ.projects.html5touch;
		tm = new h5t.TouchManager();
		
		// Avoid scrolling on touch interfaces.
		document.addEvent(AGJ.event.touch.move, onTouchMove);
	}

	var trace = AGJ.trace;

	/////

	function drawLine(color, width, fromX, fromY, toX, toY) {
		trace("Drawing", color, width, fromX, fromY, toX, toY);

		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		
		ctx.beginPath();
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		ctx.stroke();
		ctx.closePath();
	}

	///// Events.

	function onPress(e) {
		trace("press", e);
		if (e.hasOwnProperty("changedTouches")) {
			var len = e.changedTouches.length;
			for (var i = 0; i < len; i++) {
				tm.add(h5t.TouchManager.makeTouch(e.changedTouches[i]));
				var temp = h5t.TouchManager.makeTouch(e.changedTouches[i]);
				trace(temp);
			}
		}
	}

	function onMove(e) {
		if (e.hasOwnProperty("changedTouches")) {
			trace("move", e);
			trace("tm", tm);
			var len = e.changedTouches.length;
			for (var i = 0; i < len; i++) {
				var raw = e.changedTouches[i];
				var touch = tm.get(raw.identifier);
				touch.addPoint(h5t.TouchManager.makeTouchPoint(raw));
				onTouchPointAdded(touch);
			}
		}
	}

	function onRelease(e) {
		trace("release", e);
		if (e.hasOwnProperty("changedTouches")) {
			var len = e.changedTouches.length;
			for (var i = 0; i < len; i++) {
				tm.remove(e.changedTouches[i].identifier);
			}
		}
	}

	function onTouchPointAdded(touch) {
		var start = touch.getSecondToLast().viewport;
		var end = touch.getLast().viewport;
		drawLine("#0ff", 2, start.x, start.y, end.x, end.y);
	}

	function onTouchMove(e) {
		e.preventDefault();
	}

})(this);

