/** **************** DownloadSession Class ******************** */
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");
Cu.import("resource://imagepicker/sequence.js");
Cu.import("resource://imagepicker/settings.js");
Cu.import("resource://imagepicker/fileUtils.js");

/**
 * DownloadSession class is used to download multiple files
 *
 * @namespace ImagePicker
 * @class ImagePicker.DownloadSession
 * @constructor
 */
ImagePicker.DownloadSession = function(images, destDir, privacyContext, oldDownloadProgressListener,
        newDownloadProgressListener, postSavedListeners, stringsBundle) {

    this.images = images;
    this.destDir = destDir;
    this.privacyContext = privacyContext;
    this.oldDownloadProgressListener = oldDownloadProgressListener;
    this.newDownloadProgressListener = newDownloadProgressListener;
    this.postSavedListeners = postSavedListeners;
    this.stringsBundle = stringsBundle;

    var privateBrowsingSvc = Components.classes["@mozilla.org/privatebrowsing;1"]
            .getService(Components.interfaces.nsIPrivateBrowsingService);
    this.inPrivateBrowsingMode = privateBrowsingSvc.privateBrowsingEnabled;

    this.ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    this.mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    this.downloadManager = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);

    //For Win7, Firefox have a bug https://bugzilla.mozilla.org/show_bug.cgi?id=844566
    //The nsITaskbarProgress.setProgressState() throw error when add multiple download items, so skip DownloadManager for win7
    if(ImagePicker.Settings.hasWinTaskbar()){
        this.downloadManager = null;
    }

    ImagePicker.Logger.info("Created DownloadSession[images=" + this.images.length + ", destDir=" + this.destDir.path
            + ", inPrivateBrowsingMode=" + this.inPrivateBrowsingMode + ", downloadManager=" + this.downloadManager + "]");
};

ImagePicker.DownloadSession.prototype = {

    /**
     * save images to local
     *
     * @method saveImages
     */
    saveImages : function() {

        var images = this.images;

        // Auto rename
        if (ImagePicker.Settings.isRenameImageBySequenceNum()) {
            this._renameBySequence(images);
        }

        // Register progress listener
        if(this.downloadManager){
            if (this.oldDownloadProgressListener != null) {
                this.downloadManager.removeListener(this.oldDownloadProgressListener);
            }
            if (this.newDownloadProgressListener != null) {
                this.downloadManager.addListener(this.newDownloadProgressListener);
            }
        }

        this._preSaveImages(this.destDir, images, this.stringsBundle);

        // Handle each file
        var fileNames = new Array();
        for ( var i = 0; i < images.length; i++) {
            var img = images[i];
            var file = ImagePicker.FileUtils.createUniqueFile(img.getFileNameExt(), this.destDir, fileNames);
            try {
                this._saveImageToFile(img.url, file, this.downloadManager);
            } catch (ex) {
                ImagePicker.Logger.error("Cannot save image: " + img, ex);
            }
        }

        this._postSaveImages(this.destDir, images, this.postSavedListeners, this.stringsBundle);
    },

    _preSaveImages : function(savedFolder, images, stringsBundle) {

        var notificationTitle = stringsBundle.getFormattedString("saveNotificationTitleMultiple", [ images.length ]);
        if (images.length == 1) {
            notificationTitle = stringsBundle.getFormattedString("saveNotificationTitleSingle", [ images[0]
                    .getFileNameExt() ]);
        }

        var alertListener = {
            observe : function(subject, topic, data) {
                if (topic == "alertclickcallback") {
                    ImagePicker.Logger.debug("Open directory, data=" + data);
                    var dir = ImagePicker.FileUtils.toDirectory(data);
                    ImagePicker.FileUtils.revealDirectory(dir);
                }
            }
        };
        var alertsService = Components.classes["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
        alertsService.showAlertNotification("chrome://imagepicker/skin/img-picker_32.png", notificationTitle,
                savedFolder.path, true, savedFolder.path, alertListener, "ImagePickerAlert");
    },

    _postSaveImages : function(savedFolder, images, postSavedListeners, stringsBundle) {

        if (postSavedListeners) {
            postSavedListeners.forEach(function(listener) {
                ImagePicker.Logger.debug("Invoke PostSavedListener: " + listener);
                if (listener) {
                    try {
                        listener.afterSavedImages(savedFolder, images);
                    } catch (ex) {
                        ImagePicker.Logger.error("Occured Error " + ex + " when execute PostSaveImage Listener: "
                                + listener);
                    }
                }
            });
        }
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
     * @method _saveImageToFile
     */
    _saveImageToFile : function(fromURL, toFile, downloadManager) {

        // Create URI from which we want to download file
        var fromURI = this.ioService.newURI(fromURL, null, null);

        // create cacheKey
        var cacheKey = Cc['@mozilla.org/supports-string;1'].createInstance(Ci.nsISupportsString);
        cacheKey.data = fromURL;

        // Set to where we want to save downloaded file
        var toURI = this.ioService.newFileURI(toFile);

        // Set up correct MIME type
        var mime;
        try {
            var type = this.mimeService.getTypeFromURI(fromURI);
            mime = this.mimeService.getFromTypeAndExtension(type, "");
        } catch (e) {
            ImagePicker.Logger.info("cannot get mine type, e = " + e);
        }

        // Observer for download
        var nsIWBP = Ci.nsIWebBrowserPersist;
        var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

        // Start download
        if (downloadManager) {
            var dl = downloadManager.addDownload(downloadManager.DOWNLOAD_TYPE_DOWNLOAD, fromURI, toURI,
                    toFile.leafName, mime, Math.round(Date.now() * 1000), null, persist, this.inPrivateBrowsingMode);
            persist.progressListener = dl.QueryInterface(Ci.nsIWebProgressListener);
            // persist.progressListener = dl;
        } else {
            persist.progressListener = this.newDownloadProgressListener;
        }

        persist.saveURI(fromURI, cacheKey, null, null, null, toURI, this.privacyContext);
    }
};
