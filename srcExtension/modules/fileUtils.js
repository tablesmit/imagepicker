/** **************** FileUtils Object Class ******************** */
var EXPORTED_SYMBOLS = [];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");
Cu.import("resource://imagepicker/sequence.js");
Cu.import("resource://imagepicker/settings.js");

/**
 * Provides the file utilities and extensions used by the ImagePicker
 *
 * @namespace ImagePicker
 * @class ImagePicker.FileUtils
 */
ImagePicker.FileUtils = {

    /**
     * Attempt to open the given nsIFile directory with Finder/Explorer/Whatever properties.
     *
     * @method revealDirectory
     * @param {nsIFile}
     *            directory The directory to open.
     */
    revealDirectory : function(directory) {
        var osString = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;

        // OS X Finder shows the folder containing the reveal
        // target. What we really want is to show the
        // contents of the target folder.
        if ((osString == "Darwin") && directory.isDirectory()) {
            var files = directory.directoryEntries;
            if (files.hasMoreElements()) {
                directory = files.getNext().QueryInterface(Ci.nsIFile);
            }
        }

        // Reveal is not implemented on all platforms.
        try {
            directory.reveal();
        } catch (e) {
            ImagePicker.Logger.error("Cannot open directory for " + directory, e);
        }
    },

    /**
     * Convert the path to nsILocalFile object. Attempt to create a directory for the given path if it is a nonexistent
     * directory.
     *
     * @method toDirectory
     * @param {String}
     *            path The path of directory to open.
     * @return {nsILocalFile} the nsILocalFile representing the directory for the given path
     */
    toDirectory : function(path) {

        // check argument
        if ((path == null) || (path.length == 0)) {
            return null;
        }

        // create directory
        var directory = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);

        try {
            directory.initWithPath(path);
            if (!directory.exists()) {
                directory.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
            }

            return directory;
        } catch (e) {
            ImagePicker.Logger.warn("Cannot convert path: " + path + " to directory. ", e);
            return null;
        }

        return null;
    },

    /**
     * Attempt to convert the given originalName to a valid directory/file name
     *
     * @method toValidName
     * @param {String}
     *            originalName the original name to be converted.
     * @return {String} a valid directory/file name for the given originalName
     */
    toValidName : function(originalName) {

        var validName = originalName;

        // replace special char: [,\,/,:,*,.,?,",<,>,|,]
        var reg = new RegExp("[\\\/:\*?\"<>|]", "g");

        validName = validName.replace(reg, "");

        validName = validName.substr(0, 100);

        // trim
        validName = validName.replace(/^\s*/, "").replace(/\s*$/, "");

        if (originalName.length != validName.length) {
            ImagePicker.Logger.info("convert " + originalName + " to valid directory/file name: " + validName);
        }

        return validName;
    },

    /**
     * Attempt to create a unique file for the given fileName in the given parentDir. If the parentDir and fileNames
     * contains the same file or fileName, the method will make a new unique file name.
     *
     * @method getUniqueFile
     * @param {String}
     *            fileName the name of file to be created.
     * @param {nsILocalFile}
     *            parentDir the parent directory to create file.
     * @param {Array
     *            <String,boolean>} fileNames the Array contains all file names which will be created in parentDir.
     * @return {nsILocalFile} the nsILocalFile representing the unique file for the given file name
     */
    createUniqueFile : function(fileName, parentDir, fileNames) {

        var originalName = this.toValidName(fileName);

        var tempName = originalName;

        // create a temp file for the file name
        var tempFile = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
        tempFile.initWithFile(parentDir);
        tempFile.append(tempName);

        // check if the file is exists.
        var incNumber = 1;
        while (tempFile.exists() || (typeof (fileNames[tempName]) != 'undefined')) {
            // if the file exists or have a exist name in array, make a new file
            // name
            if (originalName.indexOf('.') != -1) { // have file ext
                var ext = originalName.substring(originalName.lastIndexOf('.'), originalName.length);
                var fileNameWithoutExt = originalName.substring(0, originalName.length - ext.length);
                tempName = fileNameWithoutExt + "(" + incNumber + ")" + ext;
            } else {
                tempName = originalName + "(" + incNumber + ")";
            }

            // init file with new name
            tempFile.initWithFile(parentDir);
            tempFile.append(tempName);
            incNumber++;
        }

        // put file name as key to fileNames array
        fileNames[tempName] = true;

        return tempFile;
    },

    /**
     * save image to local
     *
     * @method doSaveImages
     */
    saveImages : function(images, destDir, inPrivateBrowsingMode, oldDownloadProgressListener, newDownloadProgressListener, postSavedListeners, stringsBundle) {

        ImagePicker.Logger.debug("inPrivateBrowsingMode: " + inPrivateBrowsingMode);

        //Auto rename
        if (ImagePicker.Settings.isRenameImageBySequenceNum()) {
            this._renameBySequence(images);
        }

        // Got instance of download manager
        var dm = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);

        // Register progress listener
        if (oldDownloadProgressListener != null) {
            dm.removeListener(oldDownloadProgressListener);
        }
        if(newDownloadProgressListener != null){
            dm.addListener(newDownloadProgressListener);
        }

        this._preSaveImages(destDir, images, stringsBundle);

        // Handle each file
        var fileNames = new Array();
        for ( var i = 0; i < images.length; i++) {
            var img = images[i];
            //document.getElementById("filterStat").label = this.getFormattedString("saveNFile",[img.fileName]);
            var file = this.createUniqueFile(img.getFileNameExt(), destDir, fileNames);
            try {
                // this.saveImageToFile(img, file);
                this.saveFileByDownloadManager(img.url, file);
            } catch (ex) {
                ImagePicker.Logger.error("Cannot save image: " + img, ex);
            }
        }

        this._postSaveImages(destDir, images, postSavedListeners, stringsBundle);
    },

    _preSaveImages : function(savedFolder, images, stringsBundle) {

        var notificationTitle = stringsBundle.getFormattedString("saveNotificationTitleMultiple", [images.length]);
        if(images.length == 1){
            notificationTitle = stringsBundle.getFormattedString("saveNotificationTitleSingle", [images[0].getFileNameExt()]);
        }

        var alertListener = {
            observe : function(subject, topic, data){
                if(topic == "alertclickcallback"){
                    ImagePicker.Logger.debug("Open directory, data=" + data);
                    var dir = ImagePicker.FileUtils.toDirectory(data);
                    ImagePicker.FileUtils.revealDirectory(dir);
                }
            }
        };
    	var alertsService = Components.classes["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
        alertsService.showAlertNotification("chrome://imagepicker/skin/img-picker_32.png", notificationTitle, savedFolder.path, true, savedFolder.path, alertListener, "ImagePickerAlert");
    },

    _postSaveImages : function(savedFolder, images, postSavedListeners, stringsBundle) {

        if (postSavedListeners) {
            postSavedListeners.forEach(function(listener) {
                ImagePicker.Logger.debug("Invoke PostSavedListener: " + listener);
                if (listener) {
                    try {
                        listener.afterSavedImages(savedFolder, images);
                    } catch (ex) {
                        ImagePicker.Logger.error("Occured Error " + ex + " when execute Image Save Listener: "
                                + listener);
                    }
                }
            });
        }
    },

    createFolder : function(parentDirPath, subFolderName) {

        // clone the parent folder, don't use the clone() method.
        var subFolder = this.toDirectory(parentDirPath);

        // create new folder with window title
        try {
            subFolder.append(subFolderName);
            if (!subFolder.exists() || !subFolder.isDirectory()) {
                // if it doesn't exist, create
                subFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
            }
            return subFolder;
        } catch (e) {
            ImagePicker.Logger.warn("Cannot create subfolder: " + e);
        }

        return null;
    },

    makeFolderNameByTitle : function(docTitle) {
        var subFolderName = docTitle;

        //remove unnecessary text
        var textLines = ImagePicker.Settings.getRemoveTextFromTitle();
        for ( var i = 0; i < textLines.length; i++) {
            var reg = new RegExp(textLines[i], "gi");
            subFolderName = subFolderName.replace(reg, '');
        }

        subFolderName = subFolderName.replace(/\./g, '');

        return this.toValidName(subFolderName);
    },

    _renameBySequence : function(images) {
        var maxDigits = images.length.toString().length;
        var seq = new ImagePicker.Sequence(0, maxDigits);

        for ( var i = 0; i < images.length; i++) {
            var img = images[i];
            img.fileName = seq.next();
        }
    },

    /**
     * save image to local
     *
     * @method saveImageToFile
     */
    saveImageToFile : function(imageInfo, file) {

        var uri = Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIURI);
        uri.spec = imageInfo.url;

        var cacheKey = Cc['@mozilla.org/supports-string;1'].createInstance(Ci.nsISupportsString);
        cacheKey.data = imageInfo.url;

        try {
            var persist = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
                    .createInstance(Ci.nsIWebBrowserPersist);
            var nsIWBP = Ci.nsIWebBrowserPersist;
            var flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;

            persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
            persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
            persist.saveURI(uri, cacheKey, null, null, null, file);

        } catch (e) {
            ImagePicker.Logger.info("cannot save file for URL: " + imageInfo.url + ", exception = " + e);
        }
    },

    /**
     * save image to local
     *
     * @method saveFileByDownloadManager
     */
    saveFileByDownloadManager : function(fromURL, toFile, inPrivateBrowsingMode) {

        // Got instance of download manager
        var dm = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);

        // Create URI from which we want to download file
        var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var fromURI = ios.newURI(fromURL, null, null);

        // create cacheKey
        var cacheKey = Cc['@mozilla.org/supports-string;1'].createInstance(Ci.nsISupportsString);
        cacheKey.data = fromURL;

        // Set to where we want to save downloaded file
        var toURI = ios.newFileURI(toFile);

        // Set up correct MIME type
        var mime;
        try {
            var msrv = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
            var type = msrv.getTypeFromURI(fromURI);
            mime = msrv.getFromTypeAndExtension(type, "");
        } catch (e) {
            ImagePicker.Logger.info("cannot get mine type, e = " + e);
        }

        // Observer for download
        var nsIWBP = Ci.nsIWebBrowserPersist;
        var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

        // Start download
        var dl = dm.addDownload(dm.DOWNLOAD_TYPE_DOWNLOAD, fromURI, toURI, toFile.leafName, mime, Math
                .round(Date.now() * 1000), null, persist, inPrivateBrowsingMode);
        persist.progressListener = dl.QueryInterface(Ci.nsIWebProgressListener);
        persist.saveURI(dl.source, cacheKey, null, null, null, dl.targetFile, null);
    }
};
