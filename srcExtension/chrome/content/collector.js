/** **************** Collector Class ******************** */
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/settings.js");
Components.utils.import("resource://imagepicker/xulUtils.js");
Components.utils.import("resource://imagepicker/fileUtils.js");
Components.utils.import("resource://imagepicker/model.js");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

/**
 * Provides the collector
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.Collector
 * @constructor
 */
ImagePickerChrome.Collector = {

    /**
	 * callback function for double click event
	 *
	 * @method onDblClick
	 */
	onDblClick : function(event) {
		 ImagePicker.Logger.info("ImagePicker - Double click");
		 if(ImagePicker.Settings.isDoubleclickImageToSaveEnabled()){
    		 ImagePicker.Logger.debug("Double click on tag: " + event.target.tagName);

    		 var isOnImage = (event.target.tagName.toLowerCase()=="img");
    		 ImagePicker.Logger.debug("Double click on image? " + isOnImage);

    		 if(isOnImage){
        		 var imageElement = event.target;
        		 var image = new ImagePicker.ImageInfo(1, imageElement, 0);

        		 var destDir = ImagePickerChrome.Collector.getOrCreateSavedFolder();

        		 var privateBrowsingSvc = Components.classes["@mozilla.org/privatebrowsing;1"].getService(Components.interfaces.nsIPrivateBrowsingService);
                 var inPrivateBrowsingMode = privateBrowsingSvc.privateBrowsingEnabled;
                 var stringsBundle = document.getElementById("ip-string-bundle");

        		 ImagePicker.FileUtils.saveImages([image], destDir, inPrivateBrowsingMode, null, null, null, stringsBundle);
    		 }
		 }
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
            destPath = paths[0];

        }
        var destDir = ImagePicker.FileUtils.toDirectory(destPath);

        //Create sub-folder if need
        if(ImagePicker.Settings.isCreatedFolderByTitle()){
            var subFolderName = ImagePicker.FileUtils.makeFolderNameByTitle(currentTabTitle);
            destDir = ImagePicker.FileUtils.createFolder(destPath, subFolderName);
        }

        return destDir;
    }
};

window.addEventListener("dblclick",ImagePickerChrome.Collector.onDblClick,false);
ImagePicker.Logger.info("Created Collector and registered event listener");
