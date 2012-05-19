/** **************** Controller Class ******************** */
const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/hashMap.js");
Components.utils.import("resource://imagepicker/sequence.js");
Components.utils.import("resource://imagepicker/fileUtils.js");
Components.utils.import("resource://imagepicker/settings.js");
Components.utils.import("resource://imagepicker/xulUtils.js");
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
        this.settings = ImagePicker.Settings;
         
        // init image grid
        var gridSize = window.innerWidth - 6;

        var thumbnailType = this.settings.getThumbnailType();
        var isShowImageSize = this.settings.isShowImageSize();
        var isShowImageName = this.settings.isShowImageName();
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

        // init window from preferences
        document.getElementById("minWidthTB").value = this.settings.getMinWidth();
        document.getElementById("minHeightTB").value = this.settings.getMinHeight();
        document.getElementById("minSizeTB").value = this.settings.getMinSize();

        document.getElementById("imageTypeBmpCB").checked = !this.settings.isSkipImageTypeBMP();
        document.getElementById("imageTypeJpegCB").checked = !this.settings.isSkipImageTypeJPG();
        document.getElementById("imageTypePngCB").checked = !this.settings.isSkipImageTypePNG();
        document.getElementById("imageTypeGifCB").checked = !this.settings.isSkipImageTypeGIF();

        var thumbnailType = this.settings.getThumbnailType();
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

        var isShowImageSize = this.settings.isShowImageSize();
        var isShowImageName = this.settings.isShowImageName();
        document.getElementById("showImageSizeMI").setAttribute("checked", isShowImageSize);
        document.getElementById("showImageNameMI").setAttribute("checked", isShowImageName);

        var saveFolderPath = this.settings.getSavedFolderPath();
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
        // save display rule
        this.settings.setThumbnailType(this.imageGrid.thumbnailType);
        this.settings.setShowImageSize(this.imageGrid.isShowImageSize);
        this.settings.setShowImageName(this.imageGrid.isShowImageName);

        // save filter
        this.settings.setMinWidth(document.getElementById("minWidthTB").value);
        this.settings.setMinHeight(document.getElementById("minHeightTB").value);
        this.settings.setMinSize(document.getElementById("minSizeTB").value);
        
        this.settings.setSkipImageTypeJPG(!document.getElementById("imageTypeJpegCB").checked);
        this.settings.setSkipImageTypePNG(!document.getElementById("imageTypePngCB").checked);
        this.settings.setSkipImageTypeBMP(!document.getElementById("imageTypeBmpCB").checked);
        this.settings.setSkipImageTypeGIF(!document.getElementById("imageTypeGifCB").checked);
        
        // save saved folder
        this.settings.setSavedFolderPath(document.getElementById("browsedirTB").value);
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
        
        // display select status
        var imageIds = this.selectedMap.keys();
        for(var i=0; i< imageIds.length; i++){
            var imageId = imageIds[i];
            if(this.selectedMap.get(imageId) == true){
                this._selectImage(imageId);
            }
        }
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

        this.selectAllImages();

        // refresh image container
        this.refreshImageContainer();
        
        this.updateStatuBar();
    },
    
    /**
     * Show all images
     *
     * @method doShowAll
     */
    doShowAll : function() {
            // do filter
        this.imageList = this.rawImageList;

        this.unselectAllImages();

        // refresh image container
        this.refreshImageContainer();
        
        this.updateStatuBar();
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
        filePicker.init(window, this.getI18NString('selectFloderTitle'), nsIFilePicker.modeGetFolder);

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

        if (!dest) {
            alert(this.getI18NString('invalidSaveFolder'));
            return;
        }

        //Create sub-folder if need
        if(this.settings.isCreatedFolderByTitle()){
            var subFolder = this._createFolderByTitle(destPath);
            if(subFolder != null){
                dest = subFolder;
            }
        }

        //document.getElementById("filterStat").label = this.getI18NString('startSaveFile');

        // Collect saved files
        var savedImages = new Array();
        for ( var i = 0; i < this.imageList.length; i++) {
            var img = this.imageList[i];
            if(this.selectedMap.get(img.id) == true){ // saved selected image only
                savedImages.push(img);
            }
        }
        
        //Auto rename
        if(this.settings.isRenameImageBySequenceNum()){
            this._renameBySequence(savedImages);
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

            //document.getElementById("filterStat").label = this.getFormattedString("saveNFile",[img.fileName]);

            var file = ImagePicker.FileUtils.createUniqueFile(img.getFileNameExt(), dest, fileNames);

            try {
                // this.saveImageToFile(img, file);
                this.saveFileByDownloadManager(img.url, file);
            } catch (ex) {
                ImagePicker.Logger.error("Cannot save image: " + img, ex);
            }
        }

        //open Explorer after saved if need
        if(this.settings.isOpenExplorerAfterSaved()){
            ImagePicker.FileUtils.revealDirectory(dest);
        }

        //open DownloadManager after saved if need
        if(this.settings.isOpenDownloadManagerAfterSaved()){
            this.showDownloadManagerUI();
        }
        
        //close ImagePicker dialog after saved if need
        if(this.settings.isCloseImagePickerAfterSaved()){
            self.close();
        }
    },

    _createFolderByTitle : function(parentDirPath) {

        var subFolderName;

        // clone the parent folder, don't use the clone() method.
        var subFolder = ImagePicker.FileUtils.toDirectory(parentDirPath);

        // create new folder with window title
        try {

            subFolderName = this._makeFolderNameByTitle(window.document.title);
            subFolder.append(subFolderName);
            if (!subFolder.exists() || !subFolder.isDirectory()) {
                // if it doesn't exist, create
                subFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
            }
            return subFolder;
        } catch (e) {
            ImagePicker.Logger.warn("Cannot create subfolder: " + e);
            alert(this.getFormattedString("createSaveFolderFailure",[subFolderName]));
        }

        return null;
    },

    _makeFolderNameByTitle : function(docTitle){
        var subFolderName = docTitle;
        
        //remove unnecessary text
        var textLines = this.settings.getRemoveTextFromTitle();
        for (var i = 0; i < textLines.length; i++){
            var reg = new RegExp(textLines[i],"gi");
            subFolderName = subFolderName.replace(reg, '');
        }
        
        return ImagePicker.FileUtils.toValidName(subFolderName);
    },
    
    _renameBySequence : function(images){
        var maxDigits = images.length.toString().length;
        var seq = new ImagePicker.Sequence(0,maxDigits);
        
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
            ImagePicker.Logger.info("cannot get mine type, e = " + e);
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
            this._selectImage(img.id);
        }
        this.updateStatuBar();
        ImagePicker.Logger.debug("select all images ");
    },
    
    unselectAllImages: function(){

        this.selectedMap = new ImagePicker.HashMap();
        for ( var i = 0; i < this.imageList.length; i++) {
            var img = this.imageList[i];
            this._unselectImage(img.id);
        }
        this.updateStatuBar();
        ImagePicker.Logger.debug("Unselect all images ");
    },

    _selectImage: function(imageId){
        this.selectedMap.put(imageId, true);
        var checkbox = document.getElementById(imageId + "-CheckBox");
        if (checkbox) {
            checkbox.setAttribute("checked", true);
        }
        var imageCell = document.getElementById(imageId + "-CellBox");
        if(imageCell){
            ImagePicker.XulUtils.addClass(imageCell,"image-cell-selected");
        }
    },
    
    _unselectImage: function(imageId){
        this.selectedMap.put(imageId, false);
        var checkbox = document.getElementById(imageId + "-CheckBox");
        if (checkbox) {
            checkbox.setAttribute("checked", false);
        }
        var imageCell = document.getElementById(imageId + "-CellBox");
        if(imageCell){
            ImagePicker.XulUtils.removeClass(imageCell,"image-cell-selected");
        }
    },
    
    selectSimilarImages: function(element){

        //Find match URL
        var imageInfo = this.getImageFromPopupNode(element);
        if(!imageInfo){
            return;
        }
        
        var imageURLDomain = imageInfo.url.substring(0, imageInfo.url.lastIndexOf('/'));
        ImagePicker.Logger.debug("Popup node: " + element.nodeName + ", ImageInfo = " + imageInfo + ", ImageURLDomain = " + imageURLDomain);

        //Select similar images
        var re = new RegExp(imageURLDomain);
        this.selectedMap = new ImagePicker.HashMap();
        for ( var i = 0; i < this.imageList.length; i++) {
            var img = this.imageList[i];
            if(re.test(img.url)){
                this._selectImage(img.id);
            }else{
                this._unselectImage(img.id);
            }
        }
        
        this.updateStatuBar();
        ImagePicker.Logger.debug("select similar images ");
    },
       
    handleOpenContextMenu: function(){
        var element = document.popupNode;
        var isImageCell = (this.getImageFromPopupNode(element) != null);
        document.getElementById("selectSimilarMenuItem").hidden = !isImageCell;
    },
    
    getImageFromPopupNode: function(popupNode){
        
        var imageId = null;
        if (popupNode.nodeName == 'image') {
            imageId = popupNode.getAttribute("id");
        } else {
            var node = popupNode;
            while(node != null && node.nodeName != 'row'){
                var nodeId = node.getAttribute("id");
                if(nodeId){
                    imageId = /\d+/.exec(nodeId)
                    break;
                }
                node = node.parentNode;
            }
        }
        
        //Find match ImageInfo
        var imageInfo = null;
         for ( var i = 0; i < this.imageList.length; i++) {
            var img = this.imageList[i];
            if(img.id == imageId){
                imageInfo = img;
                break;
            }
        }
        
        return imageInfo;
    },
    
    handleClickOnImage: function(imageId){
      ImagePicker.Logger.debug("select image: " + imageId);
      var isSelected = this.selectedMap.get(imageId);
      if(isSelected){//switch status
          this._unselectImage(imageId);
      }else{
          this._selectImage(imageId);
      }
      this.updateStatuBar();
    },
        
    updateStatuBar: function(){
        // update status bar
        var oldImageConut = this.rawImageList.length;
        var newImageConut = this.imageList.length;
        var selectedImageConut = 0;
        var values = this.selectedMap.values();
        for (var i = 0; i < values.length; i++) {
            if(values[i] == true){
                selectedImageConut++;
            }
        }
        document.getElementById("filterStat").label = this.getFormattedString("statusBarText",[newImageConut, selectedImageConut, oldImageConut]);
    },
    
    openOptionsDialog: function(){
        openDialog('chrome://imagepicker/content/options.xul', 'Options', 'chrome,titlebar,resizable,centerscreen,modal=no,dialog=yes');
    },
    
    openAboutDialog: function(){
        openDialog('chrome://imagepicker/content/about.xul', '', 'chrome,titlebar,resizable,centerscreen,modal=no,dialog=yes');
    },
    
    getI18NString: function(key){
        // Get a reference to the strings bundle
        if(this.stringsBundle == null){
            this.stringsBundle = document.getElementById("string-bundle");
        }
        return this.stringsBundle.getString(key);
    },

    getFormattedString : function(key, parameters){
        // Get a reference to the strings bundle
        if(this.stringsBundle == null){
            this.stringsBundle = document.getElementById("string-bundle");
        }
        return this.stringsBundle.getFormattedString(key, parameters);
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
            
            
            if (document) {
                var downloadMeter = document.getElementById("downloadMeter");
                var downloadStat = document.getElementById("downloadStat");
                                
                if (downloadMeter) { //check null since the ImagePicker dialog may be closed
                    downloadMeter.value = totalProgress;
                }
                
                if (downloadStat) { //check null since the ImagePicker dialog may be closed
                    downloadStat.label = totalProgress + "%";
                }
            }
            
            if ((typeof ImagePicker != "undefined") && (ImagePicker != null)) {  //check null since the ImagePicker dialog may be closed
                 ImagePicker.Logger.debug("Listener id =" + this.id + ", Downloaded: " + totalProgress);
            }
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
 * Init Controller.
 */
(function() {
    this.init();
}).apply(ImagePickerChrome.Controller);