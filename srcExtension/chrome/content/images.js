/** **************** ImageInfo Object Class ******************** */
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/model.js");


/** **************** ImageUtils Object Class ******************** */

/**
 * Provides the image utilities and extensions used by the ImagePicker
 *
 * @namespace ImagePicker
 * @class ImagePickerChrome.ImageUtils
 */
ImagePickerChrome.ImageUtils = {
    /**
     * Attempt to update file size from cache. If cache is un-avalidable, attempt
     * to update file size by cache listener.
     *
     * @method updateFileSizeFromCache
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileSizeFromCache: function(imageInfo){
    
        ImagePickerChrome.ImageUtils.updateFileSizeFromSyncCache(imageInfo);
        
        if (imageInfo.fileSize <= 0) {
            ImagePickerChrome.ImageUtils.updateFileSizeFromAsyncCache(imageInfo);
            
            //Use timer
            var callback = new ImagePickerChrome.UpdateTimerCallBack(imageInfo);
            var updateTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
            updateTimer.initWithCallback(callback, 5 * 1000, Ci.nsITimer.TYPE_REPEATING_SLACK); //5s
        }
    },
    
    /**
     * Attempt to update file size from cache.
     *
     * @method updateFileSizeFromCache
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileSizeFromSyncCache: function(imageInfo){
    
        var url = imageInfo.url;
        var cacheKey = url.replace(/#.*$/, "");
        
        var fileSize = null;
        try {
            // try to get from http cache, return nsICacheEntryDescriptor            
            var cacheEntry = ImagePickerChrome.httpCacheSession.openCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, false);
            if (cacheEntry) {
                fileSize = cacheEntry.dataSize;
            }
        } catch (ex) {
            if (ex.result == 0x804B003D) {
                //NS_ERROR_CACHE_KEY_NOT_FOUND (0x804B003D): Thrown when the url contents are not in the cache.
                ImagePicker.Logger.debug("Error: NS_ERROR_CACHE_KEY_NOT_FOUND, cacheKey=" + cacheKey + ", " + imageInfo);
            } else if (ex.result == 0x804b0040) {
                //NS_ERROR_CACHE_WAIT_FOR_VALIDATION (0x804B0040): Thrown when the url contents are in the cache, but not yet marked valid.
                ImagePicker.Logger.debug("Error: NS_ERROR_CACHE_WAIT_FOR_VALIDATION, " + imageInfo);
            } else {
                ImagePicker.Logger.warn("Cannot update file size by sync cache for " + imageInfo, ex);
            }
        }
        
        if (fileSize > 0) {
            imageInfo.loadFileSizeFromCacheCompleted = true;
            imageInfo.setFileSize(fileSize);
            ImagePicker.Logger.info("update file size to " + fileSize + " from sync cache for " + imageInfo);
        }
    },
    
    /**
     * Try to update file size by cache listener.
     *
     * @method updateFileSizeFromCache
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileSizeFromAsyncCache: function(imageInfo){
    
        var url = imageInfo.url;
        var cacheKey = url.replace(/#.*$/, "");
        
        ImagePicker.Logger.info(" try to update file size by async cache for " + imageInfo);
        
        // try to update file size by cache listener
        var listener = new ImagePickerChrome.CacheListener(imageInfo);
        try {
            ImagePickerChrome.httpCacheSession.asyncOpenCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, listener);
        } catch (ecache) {
            ImagePicker.Logger.warn("Cannot update file size by async Cache for " + imageInfo, ecache);
        }
    },
    
    /**
     * Attempt to update file name from cache.
     *
     * @method updateFileNameFromCache
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileNameFromCache: function(imageInfo){
    
        var imgICache = Ci.imgICache;
        var nsISupportsCString = Ci.nsISupportsCString;
        
        var aURL = imageInfo.url;
        var aDocument = window.document;
        var charset = aDocument.characterSet;
        var contentType = null;
        var contentDisposition = null;
        try {
            var imageCache = Cc["@mozilla.org/image/cache;1"].getService(imgICache);
            var props = imageCache.findEntryProperties(makeURI(aURL, charset));
            
            ImagePicker.Logger.debug("find content props = " + props + " for " + imageInfo);
            if (props) {
                if (props.has("content-disposition")) {
                    contentDisposition = props.get("content-disposition", nsISupportsCString);
                }
                if (props.has("type")) {
                    contentType = props.get("type", nsISupportsCString);
                    if (contentType) {
                        var typeInfo = contentType.toString();
                        var fileExt = typeInfo.substring(typeInfo.lastIndexOf('/') + 1, typeInfo.length);
                        if (fileExt == "jpeg") {
                            fileExt = "jpg";
                        }
                        imageInfo.setFileExt(fileExt);
                        ImagePicker.Logger.info("update file ext to " + fileExt + " from content-type for " + imageInfo);
                    }
                }
                ImagePicker.Logger.debug("contentDisposition = " + contentDisposition + ", contentType = " + contentType + " for " + imageInfo);
            }
        } catch (e) {
            //Ignore
            ImagePicker.Logger.warn("Failure to get type and content-disposition of the image " + imageInfo, e);
        }
        
        // look for a filename in the content-disposition header, if any
        if (contentDisposition) {
            var mhpContractID = "@mozilla.org/network/mime-hdrparam;1";
            var mhpIID = Ci.nsIMIMEHeaderParam;
            var mhp = Cc[mhpContractID].getService(mhpIID);
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
            
            if (fileName != null) {
                imageInfo.setFileName(fileName);
                
                ImagePicker.Logger.info("update file name to " + fileName + " from content-disposition for " + imageInfo);
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
};

/** **************** CacheListener Object Class ******************** */
/**
 * Provides the CacheListener class
 *
 * @namespace ImagePicker
 * @class ImagePickerChrome.CacheListener
 * @constructor
 * @param {ImageInfo}
 *            image info object to update file size
 */
ImagePickerChrome.CacheListener = function(imageInfo){
    this.imageInfo = imageInfo;
};

ImagePickerChrome.CacheListener.prototype = {

    QueryInterface: function(iid){
        if (iid.equals(Ci.nsICacheListener)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },
    
    onCacheEntryAvailable: function(/* in nsICacheEntryDescriptor */descriptor,    /*
     * in
     * nsCacheAccessMode
     */
    accessGranted, /* in nsresult */ status){
    
        this.imageInfo.loadFileSizeFromCacheCompleted = true;
        
        if(descriptor == null){
            return;
        }
        
        var fileSize = descriptor.dataSize;
        
        if ((fileSize && (fileSize > 0)) && ((this.imageInfo.fileSize == null) || (this.imageInfo.fileSize == 0))) {
            this.imageInfo.setFileSize(fileSize);
            
            ImagePicker.Logger.info("update file size to " + fileSize + " by async cache for " +
            this.imageInfo);
        } else {
            ImagePicker.Logger.warn("Ingore file size: " + fileSize + " for " + this.imageInfo);
        }
    }
};

/** **************** UpdateTimerCallBack Object Class ******************** */
/**
 * Provides the UpdateTimerCallBack class
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.UpdateTimerCallBack
 * @constructor
 * @param {ImageInfo}
 *            image info object to update file size
 */
ImagePickerChrome.UpdateTimerCallBack = function(imageInfo){
    this.imageInfo = imageInfo;
    this.count = 0;
    this.MAX_COUNT = 3;
};

ImagePickerChrome.UpdateTimerCallBack.prototype = {

    notify: function(timer){
    
        this.count = this.count + 1;
        ImagePicker.Logger.debug("Fire UpdateTimer for " + this.imageInfo + ", times=" + this.count);
        
        if (this.imageInfo.fileSize > 0) {
            ImagePicker.Logger.debug("Cancel UpdateTimer for " + this.imageInfo);
            timer.cancel();
            return;
        }
        
        ImagePickerChrome.ImageUtils.updateFileSizeFromSyncCache(this.imageInfo);
        ImagePickerChrome.ImageUtils.updateFileNameFromCache(this.imageInfo);
        
        if (this.imageInfo.fileSize > 0) {
            ImagePicker.Logger.debug("Cancel UpdateTimer for " + this.imageInfo);
            timer.cancel();
        } else if (this.count >= this.MAX_COUNT) {
            ImagePicker.Logger.debug("Cancel UpdateTimer for " + this.imageInfo);
            timer.cancel();
            this.imageInfo.loadFileSizeFromCacheCompleted = true;
            this.imageInfo.setFileSize(0);
        }
    }
}
