/** **************** Controller Class ******************** */
YAHOO.namespace("ip.Controller");

/**
 * Provides the controller
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.Controller
 * @constructor
 */
YAHOO.ip.Controller = function() {

    this.rawImageList = window.arguments[0].imageList;
    this.imageList = this.rawImageList;
    this.imageGrid = null;
    this.filter = null;

    // init image grid and filter
    this.init();
}

YAHOO.ip.Controller.prototype = {

    /**
     * callback function for loading pick window
     * 
     * @method init
     */
    init : function() {
        // Get preferences
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(
                "extensions.imagepicker.");

        // init image grid
        var gridSize = window.innerWidth - 6;

        var thumbnailType = prefs.getCharPref("displayrule.thumbnailType");
        this.imageGrid = new YAHOO.ip.ImageGrid("imageContainer", gridSize, thumbnailType, false, false, false);
    },

    /**
     * callback function for loading pick window
     * 
     * @method loadPickWindow
     */
    loadPickWindow : function() {

        // init window title
        var windowTitle = window.opener.document.title;
        window.document.title = windowTitle;

        // Get preferences
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(
                "extensions.imagepicker.");

        // init window from preferences
        document.getElementById("minWidthTB").value = prefs.getIntPref("filter.minWidth");
        document.getElementById("minHeightTB").value = prefs.getIntPref("filter.minHeight");
        document.getElementById("minSizeTB").value = prefs.getIntPref("filter.minSize");

        document.getElementById("imageTypeBmpCB").checked = !prefs.getBoolPref("filter.skipImageTypes.bmp");
        document.getElementById("imageTypeJpegCB").checked = !prefs.getBoolPref("filter.skipImageTypes.jpg");
        document.getElementById("imageTypePngCB").checked = !prefs.getBoolPref("filter.skipImageTypes.png") == true;
        document.getElementById("imageTypeGifCB").checked = !prefs.getBoolPref("filter.skipImageTypes.gif");

        var thumbnailType = prefs.getCharPref("displayrule.thumbnailType");
        switch (thumbnailType) {
        case 'small':
            document.getElementById("thumbnailTypeSmallMI").setAttribute("checked", true);
            break;
        case 'normal':
            document.getElementById("thumbnailTypeNormalMI").setAttribute("checked", true);
            break;
        case 'large':
            document.getElementById("thumbnailTypeLargeMI").setAttribute("checked", true);
            break;
        default:
            YAHOO.ip.Logger.info("gDisplayRule.thumbnailType = " + thumbnailType);
        }

        var saveFolderPath = YAHOO.ip.PrefUtils.getUnicodeChar(prefs, "savedFolderPath");
        document.getElementById("browsedirTB").value = saveFolderPath;

        this.doFilter();

        // add event
        window.addEventListener("resize", function() {
            gController.refreshImageContainer();
        }, true);
    },

    /**
     * callback function for unloading pick window
     * 
     * @method unloadPickWindow
     */
    unloadPickWindow : function() {

        // Get preferences
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(
                "extensions.imagepicker.");

        // save display rule
        prefs.setCharPref("displayrule.thumbnailType", this.imageGrid.thumbnailType);

        // save filter
        prefs.setIntPref("filter.minWidth", document.getElementById("minWidthTB").value);
        prefs.setIntPref("filter.minHeight", document.getElementById("minHeightTB").value);
        prefs.setIntPref("filter.minSize", document.getElementById("minSizeTB").value);

        prefs.setBoolPref("filter.skipImageTypes.jpg", !document.getElementById("imageTypeJpegCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.png", !document.getElementById("imageTypePngCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.bmp", !document.getElementById("imageTypeBmpCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.gif", !document.getElementById("imageTypeGifCB").checked);

        // save saved folder
        YAHOO.ip.PrefUtils.setUnicodeChar(prefs, "savedFolderPath", document.getElementById("browsedirTB").value);
    },

    /**
     * refresh image container
     * 
     * @method refreshImageContainer
     */
    refreshImageContainer : function() {

        var imageContainer = document.getElementById("imageContainer");

        // clean old image grid
        while (imageContainer.hasChildNodes()) {
            imageContainer.removeChild(imageContainer.firstChild);
        }

        // render image grid
        var gridWidth = window.innerWidth - 6;
        this.imageGrid.gridWidth = gridWidth;
        this.imageGrid.render(this.imageList);
    },

    /**
     * filter images
     * 
     * @method doFilter
     */
    doFilter : function() {

        // update filer from UI
        var minWidth = document.getElementById("minWidthTB").value;
        var minHeight = document.getElementById("minHeightTB").value;
        var minSize = document.getElementById("minSizeTB").value;
        var skipImageTypes = new Array();
        if (!document.getElementById("imageTypeJpegCB").checked) {
            skipImageTypes.push("jpeg");
            skipImageTypes.push("jpg");
        }
        if (!document.getElementById("imageTypePngCB").checked) {
            skipImageTypes.push("png");
        }
        if (!document.getElementById("imageTypeBmpCB").checked) {
            skipImageTypes.push("bmp");
        }
        if (!document.getElementById("imageTypeGifCB").checked) {
            skipImageTypes.push("gif");
        }

        var sizeFilter = new YAHOO.ip.SizeFilter(minSize * 1000, -1, true);
        var widthFilter = new YAHOO.ip.WidthFilter(minWidth, -1, true);
        var heightFilter = new YAHOO.ip.HeightFilter(minHeight, -1, true);
        var skipImageTypeFilter = new YAHOO.ip.SkipImageTypeFilter(skipImageTypes);

        this.filter = new YAHOO.ip.Filter(sizeFilter, widthFilter, heightFilter, skipImageTypeFilter);

        // do filter
        this.imageList = this.filter.filterImageList(this.rawImageList);

        // update status bar
        var oldImageConut = this.rawImageList.length;
        var newImageConut = this.imageList.length;
        document.getElementById("filterStat").label = "Current: " + newImageConut + ", Total: " + oldImageConut
                + ", Filter:" + (oldImageConut - newImageConut);

        // refresh image container
        this.refreshImageContainer();
    },
    /**
     * view image for given thumbnail tsype
     * 
     * @method doViewAS
     */
    doViewAS : function(thumbnailType) {

        this.imageGrid.setThumbnailType(thumbnailType);

        // refresh image container
        this.refreshImageContainer();
    },

    /**
     * browse directory
     * 
     * @method browseDir
     */
    browseDir : function() {

        const
        nsIFilePicker = Ci.nsIFilePicker;
        var filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
        filePicker.init(window, 'Select Save Folder', nsIFilePicker.modeGetFolder);

        // locate current directory
        var destPath = document.getElementById("browsedirTB").value;
        var dest = YAHOO.ip.FileUtils.toDirectory(destPath);
        if (dest) {
            filePicker.displayDirectory = dest;
        }
        var result = filePicker.show();
        if (result == nsIFilePicker.returnOK) {
            document.getElementById("browsedirTB").value = filePicker.file.path;
        }
    },

    /**
     * save image to local
     * 
     * @method doSaveImages
     */
    doSaveImages : function() {

        // locate current directory
        var destPath = document.getElementById("browsedirTB").value;
        var dest = YAHOO.ip.FileUtils.toDirectory(destPath);

        if (dest) {

            var subFolderName;

            // clone the parent folder, don't use the clone() method.
            var subFolder = YAHOO.ip.FileUtils.toDirectory(destPath);
            // create new folder with window title
            try {

                subFolderName = YAHOO.ip.FileUtils.toValidDirectoryName(window.document.title);
                subFolder.append(subFolderName);
                if (!subFolder.exists() || !subFolder.isDirectory()) { // if it
                    // doesn't
                    // exist, create
                    subFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
                }
                dest = subFolder;
            } catch (e) {
                YAHOO.ip.Logger.info("Cannot create subfolder: " + e);
                alert("Cannot create subfolder! subFolderName = " + subFolderName + ",e = " + e);
            }

            document.getElementById("filterStat").label = "Starting saving file...";

            var fileNames = new Array();
            for ( var i = 0; i < this.imageList.length; i++) {
                document.getElementById("filterStat").label = "Saving" + this.imageList[i].fileName;

                // Set default file ext as jpg
                if (this.imageList[i].fileExt == null || this.imageList[i].fileExt == "") {
                    this.imageList[i].fileName = this.imageList[i].fileName + ".jpg";
                }
                var file = YAHOO.ip.FileUtils.createUniqueFile(this.imageList[i].fileName, dest, fileNames);

                // this.saveImageToFile(this.imageList[i], file);
                this.saveFileByDownloadManager(this.imageList[i].url, file);
            }
            document.getElementById("filterStat").label = "All images have been saved!";

            // Got instance of download manager
            var dm = Cc["@mozilla.org/download-manager;1"].createInstance(Ci.nsIDownloadManager);
            dm.addListener(new YAHOO.ip.DownloadProgressListener());
            YAHOO.ip.FileUtils.revealDirectory(dest);

        } else {
            alert("dest directory not found! ");
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
            const
            nsIWBP = Ci.nsIWebBrowserPersist;
            const
            flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
            persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
            persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
            persist.saveURI(uri, cacheKey, null, null, null, file);

        } catch (e) {
            YAHOO.ip.Logger.info("cannot save file size for URL: " + imageInfo.url + ", exception = " + e);
        }
    },

    /**
     * save image to local
     * 
     * @method saveFileByDownloadManager
     */
    saveFileByDownloadManager : function(fromURL, toFile) {

        // Got instance of download manager
        var dm = Cc["@mozilla.org/download-manager;1"].createInstance(Ci.nsIDownloadManager);

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
            YAHOO.ip.Logger.info("can not get mine type, e = " + e);
        }

        // Observer for download
        var nsIWBP = Ci.nsIWebBrowserPersist;
        var pers = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
        pers.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

        // Start download
        var dl = dm.addDownload(dm.DOWNLOAD_TYPE_DOWNLOAD, fromURI, toURI, toFile.leafName, mime, Math
                .round(Date.now() * 1000), null, pers);
        pers.progressListener = dl.QueryInterface(Ci.nsIWebProgressListener);
        pers.saveURI(dl.source, cacheKey, null, null, null, dl.targetFile);

    },

    /**
     * show DownloadManager UI
     * 
     * @method showDownloadManagerUI
     */
    showDownloadManagerUI : function() {

        // And finally show download manager
        var dm_ui = Cc["@mozilla.org/download-manager-ui;1"].createInstance(Ci.nsIDownloadManagerUI);
        if (!dm_ui.visible) {
            dm_ui.show(window, "", Ci.nsIDownloadManagerUI.REASON_NEW_DOWNLOAD);
        }
    }
}

/** **************** DownloadProgressListener Object Class ******************** */
YAHOO.namespace("ip.DownloadProgressListener");
/**
 * Provides the DownloadProgressListener class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.DownloadProgressListener
 * @constructor
 */
YAHOO.ip.DownloadProgressListener = function() {
}

YAHOO.ip.DownloadProgressListener.prototype = {
    onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus, aDownload) {

    },

    onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress,
            aMaxTotalProgress, aDownload) {
        var totalProgress = (aCurTotalProgress / aMaxTotalProgress) * 100;
        document.getElementById("downloadMeter").value = totalProgress;

        var curProgress = (aCurSelfProgress / aMaxSelfProgress) * 100;
        var info = aDownload.displayName + ", " + curProgress + "%";
        document.getElementById("filterStat").label = info;
    }
};

var gController = new YAHOO.ip.Controller();
