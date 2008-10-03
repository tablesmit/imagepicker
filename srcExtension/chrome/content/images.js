//      Common (global) variables
var guid = (new Date()).getTime();
const fileProtocolHandler = Cc["@mozilla.org/network/protocol;1?name=file"].createInstance(Ci.nsIFileProtocolHandler);
const httpCacheSession = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService).createSession("HTTP", Ci.nsICache.STORE_ANYWHERE, true);


/****************** ImageInfo Object Class *********************/
YAHOO.namespace("ip.ImageInfo");
/**
 * Provides the ImageInfo class used by the ImagePicker
 * @namespace YAHOO.ip
 * @class YAHOO.ip.ImageInfo
 * @constructor
 * @param {HTMLElement} image element
 */
YAHOO.ip.ImageInfo = function(image){

    this.id = ++guid;
    this.imageSrc = image;
    this.url = image.src;
    
    this.nameFromURL = this.url.substring(this.url.lastIndexOf('/') + 1, this.url.length);
    
    this.height = image.height;
    this.width = image.width;
    
    //define toString() method
    this.toString = function(){
        return this.url;
    }
    
    // caculate file sizes
    this.fileSize = YAHOO.ip.ImageUtils.updateFileSizeFromCache(this);
 
    if (this.fileSize == null) {
         YAHOO.ip.ImageUtils.updateFileSizeByAjax(this);
    }

    // retrieve file name from cache
    this.fileName = YAHOO.ip.ImageUtils.updateFileNameFromCache(this);
    
    if (this.fileName == null|| this.fileName == "") {
        this.fileName = this.nameFromURL;
    }
    
    // caculate file ext
    this.fileExt = null;
    var foundDotChar = this.fileName.lastIndexOf('.');
    if (foundDotChar != -1) {
        this.fileExt = this.fileName.substring(foundDotChar + 1, this.fileName.length).toLowerCase();
    } else {
        
        // set default file ext
        this.fileExt = "jpg";
    }
}

/****************** FileUtils Object Class *********************/
YAHOO.namespace("ip.ImageUtils");
/**
 * Provides the image utilites and extensions used by the ImagePicker
 * @namespace YAHOO.ip
 * @class YAHOO.ip.ImageUtils
 */
YAHOO.ip.ImageUtils = {
    /**
     * Attempt to update file size from cache.
     * If cache is unavalidable, attempt to update file size by cache listener.
     *
     * @method updateFileSizeFromCache
     * @param {ImageInfo} imageInfo The ImageInfo object to updated
     */
    updateFileSizeFromCache: function(imageInfo){
    
        var url = imageInfo.url;
        var cacheKey = url.replace(/#.*$/, "");
        
        var fileSize = null;
        var file = null;
        try {
        
            //try to get from http cache
            file = httpCacheSession.openCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, false);
            
            if (file) {
                fileSize = file.dataSize;
            }
            
        } catch (ecache) {
        
            YAHOO.ip.Logger.warn("Cannot update file size by HttpCacheSession for " + imageInfo, ecache);
            
            //try to get from ftp cache
            try {
                file = fileProtocolHandler.getFileFromURLSpec(cacheKey);
                
                if (file && file.exists() && file.isFile()) {
                    fileSize = file.fileSize;
                }
            } catch (efile) {
                YAHOO.ip.Logger.warn("Cannot update file size by fileProtocolHandler for " + imageInfo, efile);
            }
        }
        
        
        if (fileSize == null) {
            //try to update file size by cache listener
            var listener = new YAHOO.ip.CacheListener();
            try {
                httpCacheSession.asyncOpenCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, listener);
            } catch (ecache) {
                YAHOO.ip.Logger.warn("Cannot update file size by HttpCacheSession.asyncOpenCacheEntry for " + url, ecache);
            }
        } else {
            imageInfo.fileSize = fileSize;
        }
    },
    
    /**
     * Attempt to update file size through Ajax technology.
     *
     * @method updateFileSizeByAjax
     * @param {ImageInfo} imageInfo The ImageInfo object to updated
     */
    updateFileSizeByAjax: function(imageInfo){
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
                    
                        var fileSize = xmlhttp.getResponseHeader("Content-Length");
                        
                        if (imageInfo.fileSize == null || imageInfo.fileSize == 0) {
                            imageInfo.fileSize = parseFloat(fileSize);
                            YAHOO.ip.Logger.info("update file size to " + fileSize + " by Ajax for " + imageInfo);
                        }
                    } catch (e) {
                        YAHOO.ip.Logger.warn("Cannot update file size to " + fileSize + " by Ajax for " + imageInfo, e);
                    }
                }
            }
            xmlhttp.send(null);
        } catch (exml) {
            YAHOO.ip.Logger.warn("Cannot update file size by Ajax for " + imageInfo, exml);
        }
    },
    /**
     * Attempt to update file name from cache.
     *
     * @method updateFileNameFromCache
     * @param {ImageInfo} imageInfo The ImageInfo object to updated
     */
    updateFileNameFromCache: function(imageInfo){
    
        const imgICache = Ci.imgICache;
        const nsISupportsCString = Ci.nsISupportsCString;
        
        var aURL = imageInfo.url;
        var aDocument = window.document;
        var charset = aDocument.characterSet;
        var contentType = null;
        var contentDisposition = null;
        try {
            var imageCache = Cc["@mozilla.org/image/cache;1"].getService(imgICache);
            var props = imageCache.findEntryProperties(makeURI(aURL, charset));
            
            YAHOO.ip.Logger.debug("find content props = " + props + " for " + imageInfo);
            if (props) {
                contentType = props.get("type", nsISupportsCString);
                contentDisposition = props.get("content-disposition", nsISupportsCString);
                
                YAHOO.ip.Logger.debug("contentType = " + contentType + " for " + imageInfo);
                YAHOO.ip.Logger.debug("contentDisposition = " + contentDisposition + " for " + imageInfo);
            }
        } catch (e) {
            YAHOO.ip.Logger.warn("Failure to get type and content-disposition of the image " + imageInfo, e);
        }
        
        // look for a filename in the content-disposition header, if any
        if (contentDisposition) {
            const mhpContractID = "@mozilla.org/network/mime-hdrparam;1";
            const mhpIID = Ci.nsIMIMEHeaderParam;
            const mhp = Cc[mhpContractID].getService(mhpIID);
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
            
            if (imageInfo.name == null) {
                imageInfo.name = fileName;
                YAHOO.ip.Logger.info("update file name to " + fileName + " from content-disposition for " + imageInfo);
            }
        }
    },
    
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
    makeURI: function(aURL, aOriginCharset, aBaseURI){
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        return ioService.newURI(aURL, aOriginCharset, aBaseURI);
    }
}

/****************** CacheListener Object Class *********************/
YAHOO.namespace("ip.CacheListener");
/**
 * Provides the CacheListener class
 * @namespace YAHOO.ip
 * @class YAHOO.ip.CacheListener
 * @constructor
 * @param {ImageInfo} image info object to upade file size
 */
YAHOO.ip.CacheListener = function(imageInfo){
    this.imageInfo = imageInfo;
}

YAHOO.ip.CacheListener.prototype = {

    QueryInterface: function(iid){
        if (iid.equals(Ci.nsICacheListener)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },
    
    onCacheEntryAvailable: function(/* in nsICacheEntryDescriptor */descriptor, /* in nsCacheAccessMode */ accessGranted, /* in nsresult */ status){
    
        var fileSize = descriptor.file.dataSize;
        
        if (this.imageInfo.fileSize == null || this.imageInfo.fileSize == 0) {
            this.imageInfo.fileSize = fileSize;
            YAHOO.ip.Logger.info("update file size to " + fileSize + " by async cache listener for " + this.imageInfo);
        }
    }
};
