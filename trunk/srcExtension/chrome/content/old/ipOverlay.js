var guid = (new Date()).getTime();
var gFilter;
var gDisplayRule;

//      Common (global) variables
var Cc = Components.classes;
var Ci = Components.interfaces;

const fileProtocolHandler = Components.classes["@mozilla.org/network/protocol;1?name=file"].createInstance(Components.interfaces.nsIFileProtocolHandler);
const httpCacheSession = Components.classes["@mozilla.org/network/cache-service;1"].getService(Components.interfaces.nsICacheService).createSession("HTTP", Components.interfaces.nsICache.STORE_ANYWHERE, true);

function log(msg){
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("ImagePicker: " + msg);
}

function getUnicharPref(prefs, prefName){
    return prefs.getComplexValue(prefName, Ci.nsISupportsString).data;
}

function setUnicharPref(prefs, prefName, prefValue){
    var supportsString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    supportsString.data = prefValue;
    prefs.setComplexValue(prefName, Ci.nsISupportsString, supportsString);
}

function CacheListener(){
    this.done = false;
}

CacheListener.prototype = {

    QueryInterface: function(iid){
        if (iid.equals(Components.interfaces.nsICacheListener)) 
            return this;
        throw Components.results.NS_NOINTERFACE;
    },
    
    onCacheEntryAvailable: function(/* in nsICacheEntryDescriptor */descriptor, /* in nsCacheAccessMode */ accessGranted, /* in nsresult */ status){
        this.descriptor = descriptor;
        this.status = status;
        this.done = true;
        alert("done");
    }
};


function getFileSize(url){
    var cacheKey = url.replace(/#.*$/, "");
    
    var fileSize = null;
    var file = null;
    try {
        file = httpCacheSession.openCacheEntry(cacheKey, Components.interfaces.nsICache.ACCESS_READ, false);
        
        if (file) {
            fileSize = file.dataSize;
        }
    } catch (ecache) {
        log("Cannot get file size by HttpCacheSession for " + url +
        ", exception = " +
        ecache);
        try {
            file = fileProtocolHandler.getFileFromURLSpec(cacheKey);
            
            if (file && file.exists() && file.isFile()) {
                fileSize = file.fileSize;
            }
        } catch (efile) {
            log("Cannot get file size by FileProtocol for " + url);
        }
    }
    
    if (fileSize == null) {
        var listener = new CacheListener();
        try {
            httpCacheSession.asyncOpenCacheEntry(cacheKey, Components.interfaces.nsICache.ACCESS_READ, listener);
        } catch (ecache) {
            log("Cannot get file size by HttpCacheSession.asyncOpenCacheEntry for " + url +
            ", exception = " +
            ecache);
        }
    }
    
    return fileSize;
}

function getDelayedFileSize(imageInfo){
    try {
        var xmlhttp = new XMLHttpRequest();
        try {
            netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        } catch (e) {
            alert("Permission denied! Browse to 'about:config' in your browser\nand set 'signed.applets.codebase_principal_support' to true");
        }
        
        xmlhttp.open("HEAD", imageInfo.url, true);
        
        xmlhttp.onreadystatechange = function(){
            if (xmlhttp.readyState == 4) {
                try {
                    imageInfo.file_size = xmlhttp.getResponseHeader("Content-Length");
                    log("update file size by XMLHttpRequest, " + imageInfo.name + ":" + imageInfo.file_size);
                } catch (e) {
                    log("cannot get file size by XMLHttpRequest, " + e)
                }
            }
        }
        xmlhttp.send(null);
    } catch (exml) {
        log("cannot get file size by XMLHttpRequest, " + exml)
    }
}

function getFileName(aURL, aDocument){
    const imgICache = Components.interfaces.imgICache;
    const nsISupportsCString = Components.interfaces.nsISupportsCString;
    
    var charset = aDocument.characterSet;
    var contentType = null;
    var contentDisposition = null;
    try {
        var imageCache = Components.classes["@mozilla.org/image/cache;1"].getService(imgICache);
        var props = imageCache.findEntryProperties(makeURI(aURL, charset));
        log("content props = " + props);
        if (props) {
            contentType = props.get("type", nsISupportsCString);
            contentDisposition = props.get("content-disposition", nsISupportsCString);
            log("contentType = " + contentType);
            log("contentDisposition = " + contentDisposition);
        }
    } catch (e) {
        log("Failure to get type and content-disposition off the image is non-fatal + " + e)
        // Failure to get type and content-disposition off the image is
        // non-fatal
    }
    
    // look for a filename in the content-disposition header, if any
    if (contentDisposition) {
        const mhpContractID = "@mozilla.org/network/mime-hdrparam;1";
        const mhpIID = Components.interfaces.nsIMIMEHeaderParam;
        const mhp = Components.classes[mhpContractID].getService(mhpIID);
        var dummy = {
            value: null
        }; // Need an out param...
        var fileName = null;
        try {
            fileName = mhp.getParameter(contentDisposition, "filename", charset, true, dummy);
            
        } catch (e) {
            try {
                fileName = mhp.getParameter(contentDisposition, "name", charset, true, dummy);
            } catch (e) {
            }
        }
        
        log("content-disposition, file name = " + fileName);
        
        return fileName;
    }
    
    return "";
}

/**
 * Constructs a new URI, using nsIIOService.
 *
 * @param aURL
 *            The URI spec.
 * @param aOriginCharset
 *            The charset of the URI.
 * @param aBaseURI
 *            Base URI to resolve aURL, or null.
 * @return an nsIURI object based on aURL.
 */
function makeURI(aURL, aOriginCharset, aBaseURI){
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
}


function ImageInfo(image){

    this.id = ++guid;
    this.url = image.src;
    
    this.nameFromURL = this.url.substring(this.url.lastIndexOf('/') + 1, this.url.length);
    
    // retrieve file name
    this.name = getFileName(image.src, window.document);
    
    log("retrieve file name " + this.name);
    
    if (this.name == null || this.name == "") {
        this.name = this.nameFromURL;
    }
    
    this.file_ext = null;
    var foundDotChar = this.name.lastIndexOf('.');
    if (foundDotChar != -1) {
        this.file_ext = this.name.substring(foundDotChar + 1, this.name.length).toLowerCase();
    }
    this.file_size = null;
    
    this.height = image.height;
    this.width = image.width;
    this.image_src = image;
    
    this.file_size = getFileSize(this.url);
    // If the file size could not be retrieved from the cache
    if (this.file_size == null) {
        log("Try to get file size by XMLHttpRequest for " + this.name);
        getDelayedFileSize(this);
    }
}


function Filter(minWidth, minHeight, minSize, skipImageTypes){
    this.minWidth = minWidth;
    this.minHeight = minHeight;
    this.minSize = minSize;
    this.skipImageTypes = skipImageTypes;
}

function filterImageList(imageList, filter){

    var skipImageTypes = filter.skipImageTypes.join("-");
    var result = new Array();
    
    var minSize = filter.minSize * 1000;
    for (var i = 0; i < imageList.length; i++) {
        if (imageList[i].width > 0 && filter.minWidth > imageList[i].width) {
            continue;
        }
        if (imageList[i].height > 0 && filter.minHeight > imageList[i].height) {
            continue;
        }
        if (imageList[i].file_size > 0 && minSize > imageList[i].file_size) {
            continue;
        }
        // log("file url ="+ imageList[i].url +" file_ext = " +
        // imageList[i].file_ext);
        if (skipImageTypes.indexOf(imageList[i].file_ext) != -1) {
            continue;
        }
        
        result.push(imageList[i]);
    }
    
    return result;
}

function DisplayRule(thumbnailType, isShowImageName, isShowImageUrl, isShowImageSize){
    this.thumbnailType = thumbnailType;
    
    this.thumbnailSize = 200;
    switch (this.thumbnailType) {
        case "small":
            this.thumbnailSize = 150;
            break;
        case "normal":
            this.thumbnailSize = 300;
            break;
        case "large":
            this.thumbnailSize = 450;
            break;
        default:
            this.thumbnailSize = 200;
    }
    
    this.isShowImageName = isShowImageName;
    this.isShowImageUrl = isShowImageUrl;
    this.isShowImageSize = isShowImageSize;
}

function doViewAS(thumbnailType){
    gDisplayRule = new DisplayRule(thumbnailType, false, false, false);
    doFilter();
}

function pickImages(){
    // var url = Components.classes["@mozilla.org/network/standard-url;1"]
    // .createInstance(Components.interfaces.nsIURL);
    // url.spec = "http://www.divshare.com/img/4447356-4ea";
    //    
    // var fileName = getFileName(url,window.document);
    // log("http://www.divshare.com/img/4447356-4ea --> " + fileName);
    
    const mainTabBox = getBrowser().mTabBox;
    const contentWindow = getBrowser().browsers[mainTabBox.selectedIndex].contentWindow;
    var documentList = getDocumentList(contentWindow);
    
    var imageList = new Array();
    for (var i = 0; i < documentList.length; i++) {
        log("documentList  = " + documentList[i]);
        var documentImageList = documentList[i].getElementsByTagName('img');
        
        log("documentImageList  = " + documentImageList.length);
        for (var j = 0; j < documentImageList.length; j++) {
            var image = new ImageInfo(documentImageList[j]);
            
            imageList.push(image);
        }
    }
    log("imageList.length  = " + imageList.length);
    var params = {
        "imageList": imageList
    };
    var mainWindow = window.openDialog("chrome://imagepicker/content/pick.xul", "PickImage.mainWindow", "chrome,centerscreen,resizable, dialog=no, modal=no, dependent=no,status=yes", params);
    mainWindow.focus();
}

function onLoadPickWindow(){

    // find current window title
    var windowTitle = window.opener.document.title;
    // var suffic = " - Mozilla Firefox";
    // var reg = new RegExp(suffic + "$");
    // if(reg.test(windowTitle)){
    // windowTitle = windowTitle.substring(0,windowTitle.length - suffic.length);
    // }
    window.document.title = windowTitle;
    
    // Get preferences
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.imagepicker.");
    
    // init display rule
    var thumbnailType = prefs.getCharPref("displayrule.thumbnailType");
    gDisplayRule = new DisplayRule(thumbnailType, false, false, false);
    
    // init filter
    var minWidth = prefs.getIntPref("filter.minWidth");
    var minHeight = prefs.getIntPref("filter.minHeight");
    var minSize = prefs.getIntPref("filter.minSize");
    var skipImageTypes = new Array();
    if (prefs.getBoolPref("filter.skipImageTypes.bmp") == true) {
        skipImageTypes.push("bmp");
    }
    if (prefs.getBoolPref("filter.skipImageTypes.jpg") == true) {
        skipImageTypes.push("jpg");
    }
    if (prefs.getBoolPref("filter.skipImageTypes.png") == true) {
        skipImageTypes.push("png");
    }
    if (prefs.getBoolPref("filter.skipImageTypes.gif") == true) {
        skipImageTypes.push("gif");
    }
    gFilter = new Filter(minWidth, minHeight, minSize, skipImageTypes);
    
    // var saveFolderPath = prefs.getCharPref("savedFolderPath");
    var saveFolderPath = getUnicharPref(prefs, "savedFolderPath");
    
    // init window
    initWindow(gFilter, gDisplayRule, saveFolderPath);
    
    doFilter();
    
    // add event
    window.addEventListener("resize", onWindowResizeComplete, true);
}

function onUnloadPickWindow(){

    // Get preferences
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.imagepicker.");
    
    // save display rule
    prefs.setCharPref("displayrule.thumbnailType", gDisplayRule.thumbnailType);
    
    // save filter
    prefs.setIntPref("filter.minWidth", gFilter.minWidth);
    prefs.setIntPref("filter.minHeight", gFilter.minHeight);
    prefs.setIntPref("filter.minSize", gFilter.minSize);
    prefs.setBoolPref("filter.skipImageTypes.bmp", false);
    prefs.setBoolPref("filter.skipImageTypes.jpg", false);
    prefs.setBoolPref("filter.skipImageTypes.png", false);
    prefs.setBoolPref("filter.skipImageTypes.gif", false);
    for (var i = 0; i < gFilter.skipImageTypes.length; i++) {
    
        switch (gFilter.skipImageTypes[i]) {
            case 'bmp':
                prefs.setBoolPref("filter.skipImageTypes.bmp", true);
                break;
            case 'jpg':
                prefs.setBoolPref("filter.skipImageTypes.jpg", true);
                break;
            case 'png':
                prefs.setBoolPref("filter.skipImageTypes.png", true);
                break;
            case 'gif':
                prefs.setBoolPref("filter.skipImageTypes.gif", true);
                break;
            default:
        }
    }
    
    prefs.setCharPref("displayrule.thumbnailType", gDisplayRule.thumbnailType);
    
    // save saved folder
    setUnicharPref(prefs, "savedFolderPath", document.getElementById("browsedirTB").value);
    //prefs.setCharPref("savedFolderPath", document.getElementById("browsedirTB").value);
}

function onWindowResizeComplete(){
    doFilter();
}

function initWindow(filter, displayRule, saveFolderPath){

    // init window
    document.getElementById("minWidthTB").value = gFilter.minWidth;
    document.getElementById("minHeightTB").value = gFilter.minHeight;
    document.getElementById("minSizeTB").value = gFilter.minSize;
    document.getElementById("imageTypeBmpCB").checked = true;
    document.getElementById("imageTypeJpegCB").checked = true;
    document.getElementById("imageTypePngCB").checked = true;
    document.getElementById("imageTypeGifCB").checked = true;
    
    for (var i = 0; i < gFilter.skipImageTypes.length; i++) {
        switch (gFilter.skipImageTypes[i]) {
            case 'bmp':
                document.getElementById("imageTypeBmpCB").checked = false;
                break;
            case 'jpg':
                document.getElementById("imageTypeJpegCB").checked = false;
                break;
            case 'png':
                document.getElementById("imageTypePngCB").checked = false;
                break;
                
            case 'gif':
                document.getElementById("imageTypeGifCB").checked = false;
                break;
            default:
        }
    }
    
    switch (displayRule.thumbnailType) {
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
            log("gDisplayRule.thumbnailType = " + gDisplayRule.thumbnailType);
    }
    document.getElementById("browsedirTB").value = saveFolderPath;
}

function updateFilterFromUI(){

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
    
    gFilter = new Filter(minWidth, minHeight, minSize, skipImageTypes);
}


function doFilter(){

    updateFilterFromUI();
    
    var params = window.arguments[0];
    var imageList = params.imageList;
    
    var oldImageConut = imageList.length;
    imageList = filterImageList(imageList, gFilter);
    var newImageConut = imageList.length;
    
    document.getElementById("filterStat").label = "Current: " + newImageConut + ", Total: " + oldImageConut + ", Filter:" + (oldImageConut - newImageConut);
    refreshImageContainer(imageList);
    
}

function refreshImageContainer(imageList){

    var imageContainer = document.getElementById("imageContainer");
    while (imageContainer.hasChildNodes()) {
        imageContainer.removeChild(imageContainer.firstChild);
    }
    var gridSize = window.innerWidth - 6;
    var imageGrid = renderImageGrid(imageList, gridSize, gDisplayRule);
    imageContainer.appendChild(imageGrid);
}

function browseDir(){

    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
    filePicker.init(window, 'Select Save Folder', nsIFilePicker.modeGetFolder);
    
    // locate current directory
    var destPath = document.getElementById("browsedirTB").value;
    var dest = getValidDestination(destPath);
    if (dest) {
        filePicker.displayDirectory = dest;
    }
    var result = filePicker.show();
    if (result == nsIFilePicker.returnOK) {
        document.getElementById("browsedirTB").value = filePicker.file.path;
    }
}

function getValidDestination(path){
    if (!path) 
        return null;
    if (path.length == 0) 
        return null;
    var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    
    try {
        directory.initWithPath(path);
        if (directory.exists()) {
            return directory;
        }
    } catch (e) {
        return null;
    }
    
    return null;
}

function renderImageGrid(imageList, gridWidth, displayRule){

    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var columnWidth = displayRule.thumbnailSize;
    var columnCount = Math.floor(gridWidth / columnWidth);
    columnCount = Math.max(columnCount, 1);
    
    var rowCount = Math.ceil(imageList.length / columnCount);
    
    // create grid
    var imgGrid = document.createElementNS(XUL_NS, "grid");
    imgGrid.setAttribute("width", gridWidth);
    imgGrid.setAttribute("style", "margin:5px; ");
    
    // create columns for grid
    var columns = document.createElementNS(XUL_NS, "columns");
    for (var j = 0; j < columnCount; j++) {
        var column = document.createElementNS(XUL_NS, "column");
        columns.appendChild(column);
    }
    imgGrid.appendChild(columns);
    
    // create rows for grid
    var rows = document.createElementNS(XUL_NS, "rows");
    var index = 0;
    for (var i = 0; i < rowCount; i++) {
        var row = document.createElementNS(XUL_NS, "row");
        row.setAttribute("align", "center");
        for (var j = 0; j < columnCount; j++) {
        
            var vbox = document.createElementNS(XUL_NS, "vbox");
            vbox.setAttribute("width", columnWidth);
            vbox.setAttribute("height", columnWidth + 20);
            vbox.setAttribute("pack", "center");
            vbox.setAttribute("align", "center");
            
            vbox.setAttribute("style", "margin:5px; outline: #98989A solid 1px; background-color: #F3F3F3;");
            row.appendChild(vbox);
            
            if (index < imageList.length) {
                var img = document.createElementNS(XUL_NS, "image");
                img.setAttribute("id", imageList[index].id);
                img.setAttribute("src", imageList[index].url);
                
                var widthPerImage = columnWidth - 25;
                var imageRate = widthPerImage / Math.max(imageList[index].width, imageList[index].height, 1);
                var width = Math.min(imageRate * imageList[index].width, imageList[index].width);
                var height = Math.min(imageRate * imageList[index].height, imageList[index].height);
                
                img.setAttribute("width", width);
                img.setAttribute("height", height);
                vbox.appendChild(img);
                
                // show additional info
                var additionalInfo = imageList[index].width + "x" + imageList[index].height + " ";
                if (imageList[index].file_size != null) {
                    additionalInfo = additionalInfo + Math.ceil(imageList[index].file_size / 1000) + "k ";
                } else {
                    additionalInfo = additionalInfo + 0 + "k ";
                }
                
                var additionalLabel = document.createElementNS(XUL_NS, "label");
                additionalLabel.setAttribute("value", additionalInfo);
                vbox.appendChild(additionalLabel);
                
                additionalInfo = imageList[index].name;
                
                if (imageList[index].name.length > widthPerImage / 6) {
                    additionalInfo = imageList[index].name.substr(0, widthPerImage / 6 - 6) + "...";
                    if (imageList[index].file_ext != null) {
                        additionalInfo = additionalInfo + imageList[index].file_ext;
                    }
                }
                
                additionalLabel = document.createElementNS(XUL_NS, "label");
                additionalLabel.setAttribute("value", additionalInfo);
                vbox.appendChild(additionalLabel);
            }
            
            index++
        }
        rows.appendChild(row);
    }
    
    imgGrid.appendChild(rows);
    
    return imgGrid;
}

function getSubFolderName(windowTitle){

    var subFolderName = windowTitle;
    
    var parts = windowTitle.split("-");
    if (parts.length > 1) {
        subFolderName = parts[parts.length - 2];
    }
    // replace special char
    subFolderName = subFolderName.replace("~", "");
    subFolderName = subFolderName.replace(":", "");
    subFolderName = subFolderName.replace("\"", "");
    subFolderName = subFolderName.replace("|", "");
    subFolderName = subFolderName.replace("\|", "");
    subFolderName = subFolderName.replace("/", "");
    subFolderName = subFolderName.replace("\\", "");
    subFolderName = subFolderName.replace("<", "");
    subFolderName = subFolderName.replace(">", "");
    subFolderName = subFolderName.replace("\*", "");
    subFolderName = subFolderName.replace("\?", "");
    
    // tirm string
    subFolderName = subFolderName.replace(/^\s*/, "").replace(/\s*$/, "");
    
    log("subFolderName = " + subFolderName)
    return subFolderName;
}

function doSaveImages(){

    var params = window.arguments[0];
    var imageList = params.imageList;
    imageList = filterImageList(imageList, gFilter);
    
    // locate current directory
    var destPath = document.getElementById("browsedirTB").value;
    var dest = getValidDestination(destPath);
    if (dest) {
    
    
        var subFolderName;
        var subFolder = dest.clone();
        // create new folder with window title
        try {
        
            subFolderName = getSubFolderName(window.document.title);
            subFolder.append(subFolderName);
            if (!subFolder.exists() || !subFolder.isDirectory()) { // if it doesn't
                // exist, create
                subFolder.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
            }
            dest = subFolder;
        } catch (e) {
            log("Cannot create subfolder: " + e);
            alert("Cannot create subfolder! subFolderName = " + subFolderName + ",e = " + e);
        }
        
        document.getElementById("filterStat").label = "Starting saving file...";
        
        var fileNames = new Array();
        for (var i = 0; i < imageList.length; i++) {
            document.getElementById("filterStat").label = "Saving" + imageList[i].name;
            var file = getUniqueFile(imageList[i], dest, fileNames);
            saveImageToFile(imageList[i], file);
        }
        document.getElementById("filterStat").label = "All images have been saved!";
        revealDirectory(dest);
    } else {
        alert("dest directory not found! ");
    }
}

function getUniqueFile(imageInfo, savedFolder, fileNames){

    var originalName = imageInfo.name;
    // Set default file ext as jpg
    if (imageInfo.file_ext == null || imageInfo.file_ext == "") {
        originalName = originalName + ".jpg";
    }
    
    var fileName = originalName;
    
    var tempFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    tempFile.initWithFile(savedFolder);
    tempFile.append(fileName);
    
    // check if the file is exists.
    var incNumber = 1;
    while (tempFile.exists() || typeof(fileNames[fileName]) != 'undefined') {
        //if the file exists or 
        if (originalName.indexOf('.') != -1) {
            var ext = originalName.substring(originalName.lastIndexOf('.'), originalName.length);
            var fileNameWithoutExt = originalName.substring(0, originalName.length - ext.length);
            fileName = fileNameWithoutExt + "(" + incNumber + ")" + ext;
            
            tempFile.initWithFile(savedFolder);
            tempFile.append(fileName);
        } else {
        
            fileName = originalName + "(" + incNumber + ")";
            tempFile.initWithFile(savedFolder);
            tempFile.append(fileName);
        }
        incNumber++;
    }
    
    //put file name as key to fileNames array
    fileNames[fileName] = true;
    
    return tempFile;
}

function saveImageToFile(imageInfo, file){

    saveFileByDownloadManager(imageInfo.url, file);
    
    if (false) {
        var uri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
        uri.spec = imageInfo.url;
        
        var cacheKey = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
        cacheKey.data = imageInfo.url;
        
        try {
            var persist = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);
            const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
            const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
            persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
            persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
            persist.saveURI(uri, cacheKey, null, null, null, file);
            
        } catch (e) {
            log("cannot save file size for URL: " + imageInfo.url + ", exception = " + e);
            
        }
    }
    
}

// Attempt to open the given nsIFile directory
// with Finder/Explorer/Whatever
function revealDirectory(directory){
    var osString = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
    
    // OS X Finder shows the folder containing the reveal
    // target. What we really want is to show the
    // contents of the target folder.
    if (osString == "Darwin" && directory.isDirectory()) {
        var files = directory.directoryEntries;
        if (files.hasMoreElements()) {
            directory = files.getNext().QueryInterface(Components.interfaces.nsIFile);
        }
    }
    
    // Reveal is not implemented on all platforms.
    try {
        directory.reveal();
    } catch (e) {
        dump("ERROR: revealDirectory() " + e.toString());
    }
}

function getDocumentList(frame){
    var framesList = frame.frames;
    var documentList = new Array();
    
    documentList.push(frame.document);
    
    for (var i = 0; i < framesList.length; i++) {
        if (framesList[i].document != frame.document) {
            documentList.push(framesList[i].document);
        }
    }
    
    return documentList;
}

function saveFileByDownloadManager(fromURL, toFile){

    // Got instance of download manager
    var dm = Components.classes["@mozilla.org/download-manager;1"].createInstance(Components.interfaces.nsIDownloadManager);
    
    // Create URI from which we want to download file
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var fromURI = ios.newURI(fromURL, null, null);
    
    //create cacheKey
    var cacheKey = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
    cacheKey.data = fromURL;
    
    // Set to where we want to save downloaded file
    var toURI = ios.newFileURI(toFile);
    
    // Set up correct MIME type
    var mime;
    try {
        var msrv = Components.classes["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService);
        var type = msrv.getTypeFromURI(fromURI);
        mime = msrv.getFromTypeAndExtension(type, "");
    } catch (e) {
       log("can not get mine type, e = " + e);
    }
    
    
    // Observer for download
    var nsIWBP = Components.interfaces.nsIWebBrowserPersist;
    var pers = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(nsIWBP);
    pers.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_FROM_CACHE | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
    
    // Start download
    var dl = dm.addDownload(dm.DOWNLOAD_TYPE_DOWNLOAD, fromURI, toURI, toFile.leafName, mime, Math.round(Date.now() * 1000), null, pers);
    pers.progressListener = dl.QueryInterface(Components.interfaces.nsIWebProgressListener);
    pers.saveURI(dl.source, cacheKey, null, null, null, dl.targetFile);
    
    // And finally show download manager
    var dm_ui = Components.classes["@mozilla.org/download-manager-ui;1"].createInstance(Components.interfaces.nsIDownloadManagerUI);
    if (!dm_ui.visible) {
        dm_ui.show(window, dl.id, Components.interfaces.nsIDownloadManagerUI.REASON_NEW_DOWNLOAD);
    }
    
    //PS: don¡¯t forget to set up properly preferences of your XULRunner-based application 
}
