/** **************** Controller Class ******************** */
const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/hashMap.js");
Components.utils.import("resource://imagepicker/fileUtils.js");
Components.utils.import("resource://imagepicker/prefUtils.js");
Components.utils.import("resource://imagepicker/model.js");
Components.utils.import("resource://imagepicker/filters.js");

/**
 * Provides the controller
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.Controller
 * @constructor
 */
ImagePickerChrome.Controller = {

    /**
     * callback function for loading pick window
     *
     * @method init
     */
    init : function() {

        this.rawImageList = window.arguments[0].imageList;
        this.imageList = this.rawImageList;
        this.selectedMap = new ImagePicker.HashMap();
        this.filter = null;
        this.progressListener = null;

        // Get preferences
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(
                "extensions.imagepicker.");
        this.createdFolderByTitle = prefs.getBoolPref("createdFolderByTitle");
        this.openExplorerAfterSaved = prefs.getBoolPref("openExplorerAfterSaved");
        this.openDownloadManagerAfterSaved = prefs.getBoolPref("openDownloadManagerAfterSaved");

        // init image grid
        var gridSize = window.innerWidth - 6;

        var thumbnailType = prefs.getCharPref("displayrule.thumbnailType");
        var isShowImageSize = prefs.getBoolPref("displayrule.showImageSize");
        var isShowImageName = prefs.getBoolPref("displayrule.showImageName");
        this.imageGrid = new ImagePickerChrome.ImageGrid("imageContainer", gridSize, thumbnailType, isShowImageSize,
                isShowImageName);
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
            ImagePicker.Logger.info("gDisplayRule.thumbnailType = " + thumbnailType);
        }

        var isShowImageSize = prefs.getBoolPref("displayrule.showImageSize");
        var isShowImageName = prefs.getBoolPref("displayrule.showImageName");
        document.getElementById("showImageSizeMI").setAttribute("checked", isShowImageSize);
        document.getElementById("showImageNameMI").setAttribute("checked", isShowImageName);

        var saveFolderPath = ImagePicker.PrefUtils.getUnicodeChar(prefs, "savedFolderPath");
        document.getElementById("browsedirTB").value = saveFolderPath;

        this.doFilter();

        // add event
        window.addEventListener("resize", function() {
            ImagePickerChrome.Controller.refreshImageContainer();
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
        prefs.setBoolPref("displayrule.showImageSize", this.imageGrid.isShowImageSize);
        prefs.setBoolPref("displayrule.showImageName", this.imageGrid.isShowImageName);

        // save filter
        prefs.setIntPref("filter.minWidth", document.getElementById("minWidthTB").value);
        prefs.setIntPref("filter.minHeight", document.getElementById("minHeightTB").value);
        prefs.setIntPref("filter.minSize", document.getElementById("minSizeTB").value);

        prefs.setBoolPref("filter.skipImageTypes.jpg", !document.getElementById("imageTypeJpegCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.png", !document.getElementById("imageTypePngCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.bmp", !document.getElementById("imageTypeBmpCB").checked);
        prefs.setBoolPref("filter.skipImageTypes.gif", !document.getElementById("imageTypeGifCB").checked);

        // save saved folder
        ImagePicker.PrefUtils.setUnicodeChar(prefs, "savedFolderPath", document.getElementById("browsedirTB").value);
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
        this.imageGrid.render(this.imageList, this.selectedMap);
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

        var sizeFilter = new ImagePicker.SizeFilter(minSize * 1000, -1, true);
        var widthFilter = new ImagePicker.WidthFilter(minWidth, -1, true);
        var heightFilter = new ImagePicker.HeightFilter(minHeight, -1, true);
        var skipImageTypeFilter = new ImagePicker.SkipImageTypeFilter(skipImageTypes);

        this.filter = new ImagePicker.Filter(sizeFilter, widthFilter, heightFilter, skipImageTypeFilter);

        // do filter
        this.imageList = this.filter.filterImageList(this.rawImageList);

        // update status bar
        var oldImageConut = this.rawImageList.length;
        var newImageConut = this.imageList.length;
        document.getElementById("filterStat").label = "Current: " + newImageConut + ", Total: " + oldImageConut
                + ", Filter:" + (oldImageConut - newImageConut);


        this.selectAllImages();

        // refresh image container
        this.refreshImageContainer();
    },
    /**
     * view image for thumbnail type
     *
     * @method doViewAS
     */
    doViewAS : function() {

        var thumbnailType = null;
        if (document.getElementById("thumbnailTypeSmallMI").getAttribute("checked") == 'true') {
            thumbnailType = 'small';
        } else if (document.getElementById("thumbnailTypeNormalMI").getAttribute("checked") == 'true') {
            thumbnailType = 'normal';
        } else if (document.getElementById("thumbnailTypeLargeMI").getAttribute("checked") == 'true') {
            thumbnailType = 'large';
        }
        this.imageGrid.setThumbnailType(thumbnailType);
        this.imageGrid.isShowImageSize = (document.getElementById("showImageSizeMI").getAttribute("checked") == 'true');
        this.imageGrid.isShowImageName = (document.getElementById("showImageNameMI").getAttribute("checked") == 'true');

        // refresh image container
        this.refreshImageContainer();
    },

    /**
     * browse directory
     *
     * @method browseDir
     */
    browseDir : function() {

        var nsIFilePicker = Ci.nsIFilePicker;
        var filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
        filePicker.init(window, 'Select Save Folder', nsIFilePicker.modeGetFolder);

        // locate current directory
        var destPath = document.getElementById("browsedirTB").value;
        var dest = ImagePicker.FileUtils.toDirectory(destPath);
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
        var dest = ImagePicker.FileUtils.toDirectory(destPath);

        if (dest) {

            //Create sub-folder if need
            if(this.createdFolderByTitle){
                var subFolder = this._createFolderByTitle(destPath);
                if(subFolder != null){
                    dest = subFolder;
                }
            }

            document.getElementById("filterStat").label = "Starting saving file...";

            // Collect saved files
            var savedImages = new Array();
            for ( var i = 0; i < this.imageList.length; i++) {
                var img = this.imageList[i];
                if(this.selectedMap.get(img.id) == true){ // saved selected image only
                    savedImages.push(img);
                }
            }

            // Got instance of download manager
            var dm = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);

            // Register progress listener
            if (this.progressListener != null) {
                dm.removeListener(this.progressListener);
            }
            this.progressListener = new ImagePickerChrome.DownloadProgressListener(savedImages.length);
            dm.addListener(this.progressListener);

            // Handle each file
            var fileNames = new Array();
            for ( var i = 0; i < savedImages.length; i++) {

                var img = savedImages[i];

                document.getElementById("filterStat").label = "Saving " + img.fileName;

                // Set default file ext as jpg
                if ((img.fileExt == null) || (img.fileExt == "")) {
                    img.fileName = img.fileName + ".jpg";
                }
                var file = ImagePicker.FileUtils.createUniqueFile(img.fileName, dest, fileNames);

                // this.saveImageToFile(img, file);
                this.saveFileByDownloadManager(img.url, file);
            }

            //open Explorer after saved if need
            if(this.openExplorerAfterSaved){
                ImagePicker.FileUtils.revealDirectory(dest);
            }

            //open DownloadManager after saved if need
            if(this.openDownloadManagerAfterSaved){
                this.showDownloadManagerUI();
            }

        } else {
            alert("dest directory not found! ");
        }
    },

    _createFolderByTitle : function(parentDirPath) {

        var subFolderName;

        // clone the parent folder, don't use the clone() method.
        var subFolder = ImagePicker.FileUtils.toDirectory(parentDirPath);

        // create new folder with window title
        try {

            subFolderName = ImagePicker.FileUtils.toValidName(window.document.title);
            subFolder.append(subFolderName);
            if (!subFolder.exists() || !subFolder.isDirectory()) {
                // if it doesn't exist, create
                subFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
            }
            return subFolder;
        } catch (e) {
            ImagePicker.Logger.info("Cannot create subfolder: " + e);
            alert("Cannot create subfolder! subFolderName = " + subFolderName + ", e = " + e);
        }

        return null;
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
            ImagePicker.Logger.info("cannot save file size for URL: " + imageInfo.url + ", exception = " + e);
        }
    },

    /**
     * save image to local
     *
     * @method saveFileByDownloadManager
     */
    saveFileByDownloadManager : function(fromURL, toFile) {

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
            ImagePicker.Logger.info("can not get mine type, e = " + e);
        }

        // Observer for download
        var nsIWBP = Ci.nsIWebBrowserPersist;
        var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
        persist.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE
                | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

        // Start download
        var dl = dm.addDownload(dm.DOWNLOAD_TYPE_DOWNLOAD, fromURI, toURI, toFile.leafName, mime, Math
                .round(Date.now() * 1000), null, persist);
        persist.progressListener = dl.QueryInterface(Ci.nsIWebProgressListener);
        persist.saveURI(dl.source, cacheKey, null, null, null, dl.targetFile);
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
    },

    selectAllImages: function(){

        this.selectedMap = new ImagePicker.HashMap();
        for ( var i = 0; i < this.imageList.length; i++) {
            var img = this.imageList[i];
            this.selectedMap.put(img.id, true);
        }
        ImagePicker.Logger.debug("select all images ");
    },

    selectImage: function(imageId){
      var isSelected = this.selectedMap.get(imageId);
      this.selectedMap.put(imageId, !isSelected);
    }
};

/** **************** DownloadProgressListener Object Class ******************** */
/**
 * Provides the DownloadProgressListener class
 *
 * @namespace ImagePicker
 * @class ImagePickerChrome.DownloadProgressListener
 * @constructor
 */
ImagePickerChrome.DownloadProgressListener = function(totalCount) {
    this.completedCount = 0;
    this.totalCount = totalCount;
    this.id = Date.now();
};

ImagePickerChrome.DownloadProgressListener.prototype = {

    onDownloadStateChange : function(aState, aDownload) {
    },

    onStateChange : function(webProgress, request, stateFlags, status) {

        // NOTE: reload all Chrome will cause "Components is not defined" error,
        // restart firefox is OK
        if (typeof Components === "undefined") {
            return;
        }

        var wpl = Components.interfaces.nsIWebProgressListener;

        var isFinished = (stateFlags & wpl.STATE_STOP);

        if (isFinished) {
            this.completedCount = this.completedCount + 1;
            var totalProgress = Math.ceil((this.completedCount / this.totalCount) * 100);
            document.getElementById("downloadMeter").value = totalProgress;
            document.getElementById("filterStat").label = "Downloaded: " + totalProgress + "%";

            ImagePicker.Logger.debug("Listener id =" + this.id + ", Downloaded: " + totalProgress);
        }
    },

    onStatusChange : function(webProgress, request, status, message) {
    },
    onLocationChange : function(webProgress, request, location) {
    },
    onProgressChange : function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress,
            maxTotalProgress) {
    },
    onSecurityChange : function(webProgress, request, state) {
    }
};

/**
 * Constructor.
 */
(function() {
    this.init();
}).apply(ImagePickerChrome.Controller);
