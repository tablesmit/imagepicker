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
    updateFileSizeFromCache : function(imageInfo) {

        var url = imageInfo.url;
        var cacheKey = url.replace(/#.*$/, "");

        var fileSize = null;
        var file = null;
        try {

            // try to get from http cache
            file = ImagePicker.httpCacheSession.openCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, false);

            if (file) {
                fileSize = file.dataSize;
            }

        } catch (ecache) {

            ImagePicker.Logger.warn("Cannot update file size by HttpCacheSession for " + imageInfo, ecache);

            // try to get from ftp cache
            try {
                file = ImagePicker.fileProtocolHandler.getFileFromURLSpec(cacheKey);

                if (file && file.exists() && file.isFile()) {
                    fileSize = file.fileSize;
                }
            } catch (efile) {
                ImagePicker.Logger.warn("Cannot update file size by fileProtocolHandler for " + imageInfo, efile);
            }
        }

        if (fileSize == null) {
            // try to update file size by cache listener
            var listener = new ImagePickerChrome.CacheListener(imageInfo);
            try {
                ImagePicker.httpCacheSession.asyncOpenCacheEntry(cacheKey, Ci.nsICache.ACCESS_READ, listener);
            } catch (ecache) {
                ImagePicker.Logger.warn("Cannot update file size by HttpCacheSession.asyncOpenCacheEntry for " + url,
                        ecache);
            }
        } else {
            imageInfo.fileSize = fileSize;
        }
    },

    /**
     * Attempt to update file size through Ajax technology.
     *
     * @method updateFileSizeByAjax
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileSizeByAjax : function(imageInfo) {
        try {
            var xmlhttp = new XMLHttpRequest();
            try {
                netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
            } catch (e) {
                alert("Permission denied! Browse to 'about:config' in your browser\nand set 'signed.applets.codebase_principal_support' to true");
            }

            xmlhttp.open("HEAD", imageInfo.url, true);

            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4) {
                    try {

                        var fileSize = xmlhttp.getResponseHeader("Content-Length");

                        if ((imageInfo.fileSize == null) || (imageInfo.fileSize == 0)) {
                            imageInfo.fileSize = parseFloat(fileSize);
                            ImagePicker.Logger.info("update file size to " + fileSize + " by Ajax for " + imageInfo);
                        }
                    } catch (e) {
                        ImagePicker.Logger.warn("Cannot update file size to " + fileSize + " by Ajax for " + imageInfo, e);
                    }
                }
            };
            xmlhttp.send(null);
        } catch (exml) {
            ImagePicker.Logger.warn("Cannot update file size by Ajax for " + imageInfo, exml);
        }
    },
    /**
     * Attempt to update file name from cache.
     *
     * @method updateFileNameFromCache
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to updated
     */
    updateFileNameFromCache : function(imageInfo) {

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
                contentType = props.get("type", nsISupportsCString);
                contentDisposition = props.get("content-disposition", nsISupportsCString);

                ImagePicker.Logger.debug("contentType = " + contentType + " for " + imageInfo);
                ImagePicker.Logger.debug("contentDisposition = " + contentDisposition + " for " + imageInfo);
            }
        } catch (e) {
            ImagePicker.Logger.warn("Failure to get type and content-disposition of the image " + imageInfo, e);
        }

        // look for a filename in the content-disposition header, if any
        if (contentDisposition) {
            var mhpContractID = "@mozilla.org/network/mime-hdrparam;1";
            var mhpIID = Ci.nsIMIMEHeaderParam;
            var mhp = Cc[mhpContractID].getService(mhpIID);
            var dummy = {
                value : null
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
                imageInfo.fileName = fileName;
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
    makeURI : function(aURL, aOriginCharset, aBaseURI) {
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
ImagePickerChrome.CacheListener = function(imageInfo) {
    this.imageInfo = imageInfo;
};

ImagePickerChrome.CacheListener.prototype = {

    QueryInterface : function(iid) {
        if (iid.equals(Ci.nsICacheListener)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },

    onCacheEntryAvailable : function(/* in nsICacheEntryDescriptor */descriptor, /*
     * in
     * nsCacheAccessMode
     */
    accessGranted, /* in nsresult */status) {

        var fileSize = descriptor.file.dataSize;

        if ((fileSize && (fileSize > 0)) && ((this.imageInfo.fileSize == null) || (this.imageInfo.fileSize == 0))) {
            this.imageInfo.fileSize = fileSize;

            ImagePicker.Logger.info("update file size to " + fileSize + " by async cache listener for "
                    + this.imageInfo);
        }
    }
};
