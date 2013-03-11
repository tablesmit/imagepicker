/** **************** Collector Class ******************** */
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/settings.js");
Components.utils.import("resource://imagepicker/xulUtils.js");
Components.utils.import("resource://imagepicker/fileUtils.js");
Components.utils.import("resource://imagepicker/model.js");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://imagepicker/download.js");

/**
 * Provides the collector
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.Collector
 * @constructor
 */
ImagePickerChrome.Collector = {
    dragEvent: null,

    /**
     * callback function for double click event
     *
     * @method onDblClick
     */
	onDblClick : function(event) {
		 ImagePicker.Logger.debug("on Double click");
		 if(ImagePicker.Settings.isDoubleclickImageToSaveEnabled()){
		     var imageElement = ImagePickerChrome.Collector.detectImageElement(event);
		     if(imageElement){
		         ImagePickerChrome.Collector.saveImageFromElement(imageElement);
		     }
		 }
	},

	/**
     * callback function for dragstart event
     *
     * @method onDragend
     */
	onDragstart : function(event) {
	    ImagePickerChrome.Collector.dragEvent = event;
	    ImagePicker.Logger.debug("onDraggesture, node="+ event.target +", clientX=" + event.clientX + ", clientY=" + event.clientY
	        +", screenX=" + event.screenX + ", screenY=" + event.screenY);
	},

	/**
     * callback function for dragend event
     *
     * @method onDragend
     */
	onDragend : function(event) {
		 ImagePicker.Logger.debug("On dragend");
		 if(ImagePicker.Settings.isDragImageToSaveEnabled()){
		     var dragEvent = ImagePickerChrome.Collector.dragEvent;
		     dragEvent = (dragEvent == null? event : dragEvent);
		     var imageElement = ImagePickerChrome.Collector.detectImageElement(dragEvent);
		     if(imageElement){
		         ImagePickerChrome.Collector.saveImageFromElement(imageElement);
		     }
		 }
	},

	/**
     * Save image from the given element when the element is a image
     *
     * @method saveImageFromElement
     */
	saveImageFromElement : function(imageElement) {

		 var image = new ImagePicker.ImageInfo(1, imageElement, 0);
	     ImagePickerChrome.ImageUtils.updateFileExtensionByMIME(image);
	     ImagePickerChrome.ImageUtils.updateFileNameFromCache(image);

		 var destDir = ImagePickerChrome.Collector.getOrCreateSavedFolder();

    	 // get provacy context
    	 var privacyContext = null;
         try {
            var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
            var win = wm.getMostRecentWindow("navigator:browser");
            privacyContext = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsILoadContext);
         } catch(err) {
            ImagePicker.Logger.info("cannot get privacy context: " + err);
         }

         var stringsBundle = document.getElementById("ip-string-bundle");

         var notificationTitle = stringsBundle.getFormattedString("saveNotificationTitleSingle", [ image.getFileNameExt() ]);
         var notification = new ImagePickerChrome.Notification(notificationTitle, destDir.path, gBrowser.selectedBrowser);
         notification.show();

	     var downloadSession = new ImagePicker.DownloadSession([image], destDir, privacyContext, null, null, null, stringsBundle, false);
	     downloadSession.saveImages();
	},

	/**
     * @return a nsIFile object
     */
	getOrCreateSavedFolder : function() {
        // Get document title
        var currentTabTitle = ImagePickerChrome.getCurrentBrowser().contentDocument.title;

        var destPath = FileUtils.getDir("DfltDwnld", []).path;
        var paths = ImagePicker.Settings.getSavedFolderPaths();
        if(paths != null && paths.length > 0){
            destPath = (paths[0] != null && paths[0] != ""? paths[0] : destPath);
        }
        ImagePicker.Logger.debug("destPath =  " + destPath);
        var destDir = ImagePicker.FileUtils.toDirectory(destPath);

        // Create sub-folder if need
        if(ImagePicker.Settings.isCreatedFolderByTitle()){
            var subFolderName = ImagePicker.FileUtils.makeFolderNameByTitle(currentTabTitle);
            destDir = ImagePicker.FileUtils.createFolder(destPath, subFolderName);
        }

        return destDir;
    },

   /**
     * @return a nsIFile object
     */
	detectImageElement : function(event) {

	     var htmlElement = event.target;
	     var tagName = htmlElement.tagName.toLowerCase();
		 var isOnImage = (tagName=="img");
		 var isOnLink = (tagName=="a");
		 ImagePicker.Logger.debug("trigger on image? " + isOnImage + " or on link = " + isOnLink + ", tag name = " + tagName);

		 if(isOnImage){
    		 return htmlElement;
         }

         // Check image link
         if(isOnLink){
             var imgRegExp = new RegExp("\.png|\.jpg|\.jpeg|\.bmp|\.gif|\.webp|\.tif", "g");
             var link = htmlElement.href.toLowerCase();
             if(link.match(imgRegExp)){
                 var HTML_NS = "http://www.w3.org/1999/xhtml";
                 var imgElem = document.createElementNS(HTML_NS, "img");
                 imgElem.src = link;

                 return imgElem;
             }
         }

         // Check all images under parent node on the same position
         var eventX = event.clientX;
         var eventY = event.clientY;

         var parentNode = htmlElement;
         for(var loop=0; (loop<2 && parentNode!=null); loop++) { // until 2nd level parent
             var imageElements = parentNode.getElementsByTagName('img');
             ImagePicker.Logger.debug("detect image, parentNode="+ parentNode +", images=" + imageElements.length +", eventX=" + eventX + ", eventY=" + eventY);

             if(imageElements.length == 1){
                 return imageElements[0];
             }

             for(var i=0; i<imageElements.length; i++) {
                 var imgElem = imageElements[i];
                 var point = ImagePickerChrome.Collector._getPosition(imgElem);
                 var isBetweenX = (point.left < eventX) && (eventX < (point.left + imgElem.offsetWidth));
                 var isBetweenY = (point.top < eventY) && (eventY < (point.top + imgElem.offsetHeight));
                 ImagePicker.Logger.debug("detect image, src="+ imgElem.src +", isBetweenX=" + isBetweenX + ", isBetweenY=" + isBetweenY);
                 if(isBetweenX && isBetweenY){
                     return imgElem;
                 }
             }
             parentNode = parentNode.parentNode;
         }


         return null;
    },

    /**
     * @return the absolute position of html element
     */
	_getPosition : function(htmlElement) {

	     var curleft = 0;
	     var curtop = 0;
	     if (htmlElement && htmlElement.offsetParent) {
	 	    do {
	 	         curleft += htmlElement.offsetLeft;
	 	         curtop += htmlElement.offsetTop;
	 	     } while (htmlElement = htmlElement.offsetParent);
	     }
	     return {left :curleft, top: curtop};
    }
};

window.addEventListener("dblclick",ImagePickerChrome.Collector.onDblClick,false);
window.addEventListener("dragstart",ImagePickerChrome.Collector.onDragstart,false);
window.addEventListener("dragend",ImagePickerChrome.Collector.onDragend,false);
ImagePicker.Logger.info("Created Collector and registered event listener");