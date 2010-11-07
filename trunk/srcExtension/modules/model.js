/** **************** ImageInfo Object Class ******************** */
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");

/**
 * Provides the ImageInfo class used by the ImagePicker
 *
 * @namespace ImagePicker
 * @class ImagePicker.ImageInfo
 * @constructor
 * @param {HTMLElement}
 *            image element
 */
ImagePicker.ImageInfo = function(id, image) {

    this.id = id;
    this.imageSrc = image;
    this.url = image.src;
    this.height = image.height;
    this.width = image.width;
    this.fileSize = 0;
    this.loadFileSizeFromCacheCompleted = false;
    this.loadFileSizeByAjaxCompleted = false;
    this.properyChangeListener = null;

    this.nameFromURL = this.url.substring(this.url.lastIndexOf('/') + 1, this.url.length);
    this.fileName = this.nameFromURL;

    // calculate file ext
    this.fileExt = "jpg"; // default file ext

    var reg = /(\w+\.(\w*))/;
    var result = reg.exec(this.fileName);
    if (result != null) {
        this.fileName = result[1];
        this.fileExt = result[2];
    }

    ImagePicker.Logger.info("Created ImageInfo[id=" + this.id + ", name=" + this.fileName + ", width=" + this.width
            + ", height=" + this.height + ",URL=" + this.url + "]");
};

ImagePicker.ImageInfo.prototype = {

    /**
     * Register the given listener for image change
     * The given listener must have a onPropertyChange(ImageInfo) method.
     */
    registerChangeListener : function(changeListener) {
        this.properyChangeListener = changeListener;
    },

    setFileSize : function(newFileSize) {
        this.fileSize = newFileSize;

        // fire update event
        if (this.properyChangeListener) {
            this.properyChangeListener.onPropertyChange(this);
        }
    },

    setFileName : function(newFileName) {
        this.fileName = newFileName;

        // fire update event
        if (this.properyChangeListener) {
            this.properyChangeListener.onPropertyChange(this);
        }
    },

    toString : function() {
        return "Image:[id=" + this.id + ", name=" + this.fileName + "]";
    }
};