$(document).ready(function () {
	//Build flat array of all photos with their data
	var allPhotos = [];
	
	$(".lightbox-trigger").each(function() {
		var $trigger = $(this).parent();
		var title = $trigger.find(".lightbox-title").text();
		var date = $trigger.find(".lightbox-date").text();
		var material = $trigger.find(".lightbox-material").text();
		
		$trigger.find(".lightbox-photos div[data-src]").each(function() {
			allPhotos.push({
				photoElement: $(this),
				trigger: $trigger,
				title: title,
				date: date,
				material: material
			});
		});
	});
	
	var currentPhotoIndex = 0;
	var multipleLightboxImages = allPhotos.length > 1;

	if (!multipleLightboxImages) {
		$("#lightbox__controls").addClass("close-only");
	}

	//Lightbox
	var zoomLevel = 1;
	var maxZoomLevel = 1;
	var screen_height, screen_width;
	var currentImageWidth, currentImageHeight;

	function updateLightbox(photoIndex) {
		currentPhotoIndex = photoIndex;
		var photoData = allPhotos[photoIndex];
		var $image = photoData.photoElement;

		var image_src = $image.attr("data-src");

		var img = new Image();
		var hasProcessed = false;
		
		function processLightbox() {
			if (hasProcessed) return;
			hasProcessed = true;
			
			var image_title = photoData.title;
			var image_date = photoData.date;
			var image_material = photoData.material;
			var image_maxwidth = $image.attr("data-width");
			var image_maxheight = $image.attr("data-height");
			$("#lightbox__image").attr("src", image_src);

			// Calculate photo position within current entry
			var currentTrigger = photoData.trigger;
			var photosInEntry = [];
			for (var i = 0; i < allPhotos.length; i++) {
				if (allPhotos[i].trigger[0] === currentTrigger[0]) {
					photosInEntry.push(i);
				}
			}
			var currentPhotoPositionInEntry = photosInEntry.indexOf(photoIndex) + 1;
			var totalPhotosInEntry = photosInEntry.length;
			
			$("#lightbox__counter").text(currentPhotoPositionInEntry + "/" + totalPhotosInEntry);

			var lightboxCaptionVisible = false;

			if (image_title == "" && image_date == "" && image_material == "") {
				$("#lightbox__caption").css("display", "none");
			} else if (!image_title && !image_date && !image_material) {
				$("#lightbox__caption").css("display", "none");
			} else {
				$("#lightbox__caption").css("display", "inline-block");
			}

			$("#lightbox__title").text(image_title);
			$("#lightbox__date").text(image_date);
			$("#lightbox__materials").text(image_material);

			$("#lightbox__image").css("height", "");
			$("#lightbox__image").css("width", "");
			$("#lightbox__image-container").css("height", "");
			$("#lightbox__image-container").css("width", "");

			screen_height = $("#lightbox").height();
			screen_width = $("#lightbox").width();

			var margins = 240;
			var heightMargins = 240;
			if (screen_width < 770) {
				margins = screen_width * 0.12;
				heightMargins = 190;
			}

			// console.log("HEIGHT", $('#lightbox__info').outerHeight())
			if ($("#lightbox__info").outerHeight() * 2 > heightMargins - 30) {
				heightMargins = $("#lightbox__info").outerHeight() * 2 + 30;
			}

			var image_width = image_maxwidth;
			var image_height = image_maxheight;

			var image_aspect_ratio = image_height / image_width;

			if (image_width > screen_width - margins) {
				image_width = screen_width - margins;
				image_height = image_width * image_aspect_ratio;
			}

			if (image_height > screen_height - heightMargins) {
				image_height = screen_height - heightMargins;
				image_width = image_height / image_aspect_ratio;
			}

			currentImageWidth = image_width;
			currentImageHeight = image_height;

			maxZoomLevel = image_maxwidth / image_width;

			$("#lightbox__image-container").css("width", image_width);

			if (maxZoomLevel < 1.1) {
				$("#lightbox__image").removeClass("zoomable");
			} else {
				$("#lightbox__image").addClass("zoomable");
			}

			$("#lightbox__image").removeClass("zoomed");
			$("#lightbox__image").removeClass("draggable");

			$("#lightbox__image-zoom-container").addClass("resetting");
			$("#lightbox__image-zoom-container").css("transform", "scale(1)");
			setTimeout(function () {
				$("#lightbox__image-zoom-container").removeClass("resetting");
			}, 10);

			$("#lightbox__image").css("transform", "translate(0, 0)");
			$("#lightbox").addClass("visible");
			$("body").addClass("lightbox-open");

			dragDistanceX = 0;
			dragDistanceY = 0;
			accumulatedDragDistanceX = 0;
			accumulatedDragDistanceY = 0;
		}
		
		img.onload = function () {
			processLightbox();
		};
		
		// Proceed after 250ms even if image hasn't loaded
		setTimeout(function() {
			processLightbox();
		}, 250);
		
		img.src = image_src;
	}

	//Open Lightbox
	$(".lightbox-trigger").click(function () {
		var $trigger = $(this);
		var $firstPhoto = $trigger.find(".lightbox-photos div[data-src]").first();
		
		// Find the index of this photo in our allPhotos array
		for (var i = 0; i < allPhotos.length; i++) {
			if (allPhotos[i].photoElement[0] === $firstPhoto[0]) {
				updateLightbox(i);
				break;
			}
		}
	});

	//Back Button
	function lightboxBack() {
		if (multipleLightboxImages) {
			var currentTrigger = allPhotos[currentPhotoIndex].trigger;
			var prevIndex = currentPhotoIndex - 1;
			
			// Check if we're at the beginning or moving to a different entry
			if (prevIndex < 0) {
				// Loop to last photo of last entry
				prevIndex = allPhotos.length - 1;
			} else if (allPhotos[prevIndex].trigger[0] !== currentTrigger[0]) {
				// We've moved to a different entry, go to its last photo
				var targetTrigger = allPhotos[prevIndex].trigger;
				// Find the last photo of the previous entry
				for (var i = prevIndex; i >= 0; i--) {
					if (allPhotos[i].trigger[0] === targetTrigger[0]) {
						prevIndex = i;
					} else {
						break;
					}
				}
			}
			
			updateLightbox(prevIndex);
		}
	}

	$("#lightbox__back").click(function () {
		lightboxBack();
	});

	//Next Button
	function lightboxNext() {
		if (multipleLightboxImages) {
			var currentTrigger = allPhotos[currentPhotoIndex].trigger;
			var nextIndex = currentPhotoIndex + 1;
			
			// Check if we're at the end or moving to a different entry
			if (nextIndex >= allPhotos.length) {
				// Loop to first photo of first entry
				nextIndex = 0;
			} else if (allPhotos[nextIndex].trigger[0] !== currentTrigger[0]) {
				// We've naturally moved to the next entry's first photo, which is correct
				// No adjustment needed
			}
			
			updateLightbox(nextIndex);
		}
	}

	$("#lightbox__next").click(function () {
		lightboxNext();
	});

	//Close button
	function lightboxClose() {
		$("#lightbox").removeClass("visible");
		$("body").removeClass("lightbox-open");
	}

	$("#lightbox__close").click(function () {
		lightboxClose();
	});

	//Close with background click
	$("#lightbox__background").click(function () {
		lightboxClose();
	});

	//Key Presses
	document.onkeydown = checkKey;
	function checkKey(e) {
		e = e || window.event;
		if (e.keyCode == "27") {
			//Escape
			lightboxClose();
		} else if (e.keyCode == "37") {
			//Back
			lightboxBack();
		} else if (e.keyCode == "39") {
			//Next
			lightboxNext();
		}
	}

	//Image Zooming
	function updateImageZoom() {
		$("#lightbox__image-zoom-container").css(
			"transform",
			"scale(" + zoomLevel + ")",
		);

		screen_height = $("#lightbox").height();
		screen_width = $("#lightbox").width();

		//Set Zoomed
		if (zoomLevel > 1) {
			$("#lightbox__image").addClass("zoomed");
		} else {
			$("#lightbox__image").removeClass("zoomed");
			$("#lightbox__image").addClass("zooming-out");
			$("#lightbox__image").css("transform", "translate(0, 0)");

			setTimeout(function () {
				$("#lightbox__image").removeClass("zooming-out");
			}, 210);

			dragDistanceX = 0;
			dragDistanceY = 0;
			accumulatedDragDistanceX = 0;
			accumulatedDragDistanceY = 0;
		}

		//Set Draggable
		if (
			currentImageWidth * zoomLevel > screen_width ||
			currentImageHeight * zoomLevel > screen_height
		) {
			$("#lightbox__image").addClass("draggable");
		} else {
			$("#lightbox__image").removeClass("draggable");
		}
	}

	//Click Zoom
	$("#lightbox__image").click(function () {
		if (!$(this).hasClass("zoomed") && $(this).hasClass("zoomable")) {
			zoomLevel = maxZoomLevel;
			updateImageZoom();
		} else if (
			$(this).hasClass("zoomed") &&
			$(this).hasClass("zoomable") &&
			!$(this).hasClass("draggable")
		) {
			zoomLevel = 1;
			updateImageZoom();
		}
	});

	//Scroll Zoom

	$("#lightbox").on("wheel", function (e) {
		var delta = e.originalEvent.wheelDelta / 300;
		var oldZoomLevel = zoomLevel;

		// zoomLevel = zoomLevel + delta
		// if (zoomLevel < 1) { zoomLevel = 1}
		// if (zoomLevel > maxZoomLevel) { zoomLevel = maxZoomLevel}

		if (delta > 0) {
			zoomLevel = maxZoomLevel;
		} else {
			zoomLevel = 1;
		}

		if (zoomLevel !== oldZoomLevel) {
			updateImageZoom();
		}
	});

	//Image Drag
	var mouseIsDown, clickPageX, clickPageY, dragDistanceX, dragDistanceY;
	var accumulatedDragDistanceX = 0;
	var accumulatedDragDistanceY = 0;

	function drag() {
		if (mouseIsDown && $("#lightbox__image").hasClass("draggable")) {
			dragDistanceX =
				(clickPageX - pageX) / zoomLevel + accumulatedDragDistanceX;
			dragDistanceY =
				(clickPageY - pageY) / zoomLevel + accumulatedDragDistanceY;

			if (dragDistanceX > currentImageWidth / 2) {
				dragDistanceX = currentImageWidth / 2;
			}
			if (dragDistanceY > currentImageHeight / 2) {
				dragDistanceY = currentImageHeight / 2;
			}

			$("#lightbox__image").css(
				"transform",
				"translate(" + -dragDistanceX + "px, " + -dragDistanceY + "px)",
			);
		}
	}

	function scrollWheelScroll(deltaY) {
		if (
			!mouseIsDown &&
			!$("html").hasClass("animate-zoom") &&
			!$("html").hasClass("zoomed-out")
		) {
			var scrollLeft = exploreContainerX;
			var scrollTop = exploreContainerY;

			scrollTo(scrollLeft, scrollTop + deltaY * screenScale);
		}
	}

	//Get Page
	function getCursorXY(e) {
		if (!e) return;
		
		var touch = undefined;
		if (e.originalEvent && e.originalEvent.touches) {
			touch = e.originalEvent.touches[0];
		}

		if (e || touch) {
			// if (e) {
			pageX = e.pageX || (touch && touch.pageX);
			pageY = e.pageY || (touch && touch.pageY);
		}
	}

	//Start Drag
	$("#lightbox__image").bind("touchstart mousedown", function (e) {
		getCursorXY(e);

		clickPageX = pageX;
		clickPageY = pageY;
		mouseIsDown = true;
	});

	//End Drag
	$("html").bind("touchend mouseup", function (e) {
		drag();
		mouseIsDown = false;

		if (dragDistanceX) {
			accumulatedDragDistanceX = dragDistanceX;
		}
		if (dragDistanceY) {
			accumulatedDragDistanceY = dragDistanceY;
		}
	});

	//Drag in progress
	$("html").bind("touchmove mousemove", function (e) {
		getCursorXY(e);
		drag();
	});
});
