/** **************** Filter Object Class ******************** */
YAHOO.namespace("ip.Filter");
/**
 * Provides the filter for images
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.Filter
 * @constructor
 * @param {SizeFilter}
 *            sizeFilter the fiter for image size
 * @param {WidthFilter}
 *            widthFilter the fiter for image width
 * @param {HeightFilter}
 *            heightFilter the fiter for image height
 * @param {SkipImageTypeFilter}
 *            skipImageTypeFilter the fiter for image type
 */
YAHOO.ip.Filter = function(sizeFilter, widthFilter, heightFilter, skipImageTypeFilter) {
    this.sizeFilter = sizeFilter;
    this.widthFilter = widthFilter;
    this.heightFilter = heightFilter;
    this.skipImageTypeFilter = skipImageTypeFilter;
};

YAHOO.ip.Filter.prototype = {

    /**
     * filter image list by Filter.
     * 
     * @method filterImageList
     * @param {Array
     *            <ImageInfo>} imageList a array which contains all ImageInfo
     *            objects to filter
     * @return {Array<ImageInfo>} a array as filter result.
     */
    filterImageList : function(imageList) {

        var result = new Array();

        for ( var i = 0; i < imageList.length; i++) {
            // YAHOO.ip.Logger.info("Checking " + imageList[i]);
            if (this.sizeFilter.accept(imageList[i]) == false) {
                // YAHOO.ip.Logger.info("filter by size!");
                continue;
            }
            if (this.widthFilter.accept(imageList[i]) == false) {
                // YAHOO.ip.Logger.info("filter by width!");
                continue;
            }
            if (this.heightFilter.accept(imageList[i]) == false) {
                // YAHOO.ip.Logger.info("filter by height!");
                continue;
            }
            if (this.skipImageTypeFilter.accept(imageList[i]) == true) {
                // YAHOO.ip.Logger.info("filter by image types!");
                continue;
            }

            result.push(imageList[i]);
        }

        return result;
    }
};

YAHOO.namespace("ip.SizeFilter");
/**
 * Provides the SizeFilter class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.SizeFilter
 * @constructor
 * @param {Number}
 *            minSize the mim size of image can be acceptable
 * @param {Number}
 *            minSize the max size of image can be acceptable
 * @param {boolean}
 *            acceptNullSize a flag to controll if a image have null size can be
 *            acceptable
 */
YAHOO.ip.SizeFilter = function(minSize, maxSize, acceptNullSize) {
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.acceptNullSize = acceptNullSize;
};

YAHOO.ip.SizeFilter.prototype = {

    /**
     * Check if the given ImageInfo is acceptable for this filter.
     * 
     * @method accept
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to check
     * @return true if the image size is acceptable, otherwise return false.
     */
    accept : function(imageInfo) {

        if (this.acceptNullSize && (imageInfo.fileSize == null || imageInfo.fileSize == 0)) {
            return true;
        } else if ((imageInfo.fileSize > this.minSize) && (this.maxSize == -1 || imageInfo.fileSize < this.maxSize)) {
            // YAHOO.ip.Logger.info("this.minSize = " + this.minSize + ",
            // this.maxSize = " + this.maxSize + ", fileSize=" +
            // imageInfo.fileSize);
            return true;
        }
        // YAHOO.ip.Logger.info("imageInfo.fileSize > this.minSize = " +
        // (imageInfo.fileSize > this.minSize));
        // YAHOO.ip.Logger.info("this.maxSize == -1 = " + (this.maxSize == -1));
        // YAHOO.ip.Logger.info("this.minSize = " + this.minSize + ",
        // this.maxSize = " + this.maxSize + ", fileSize=" +
        // imageInfo.fileSize);
        return false;
    }
};

YAHOO.namespace("ip.WidthFilter");
/**
 * Provides the WidthFilter class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.WidthFilter
 * @constructor
 * @param {Number}
 *            minWidth the mim width of image can be acceptable
 * @param {Number}
 *            minWidth the max width of image can be acceptable
 * @param {boolean}
 *            acceptNullWidth a flag to controll if a image have null width can
 *            be acceptable
 */
YAHOO.ip.WidthFilter = function(minWidth, maxWidth, acceptNullWidth) {
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.acceptNullWidth = acceptNullWidth;
};

YAHOO.ip.WidthFilter.prototype = {

    /**
     * Check if the given ImageInfo is acceptable for this filter.
     * 
     * @method accept
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to check
     * @return true if the image width is acceptable, otherwise return false.
     */
    accept : function(imageInfo) {

        if (this.acceptNullWidth && (imageInfo.width == null || imageInfo.width == 0)) {
            return true;
        } else if ((imageInfo.width > this.minWidth) && (this.maxWidth == -1 || imageInfo.width < this.maxWidth)) {
            return true;
        }
        return false;
    }
};

YAHOO.namespace("ip.HeightFilter");
/**
 * Provides the HeightFilter class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.HeightFilter
 * @constructor
 * @param {Number}
 *            minHeight the mim height of image can be acceptable
 * @param {Number}
 *            minHeight the max height of image can be acceptable
 * @param {boolean}
 *            acceptNullHeight a flag to controll if a image have null height
 *            can be acceptable
 */
YAHOO.ip.HeightFilter = function(minHeight, maxHeight, acceptNullHeight) {
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
    this.acceptNullHeight = acceptNullHeight;
};

YAHOO.ip.HeightFilter.prototype = {

    /**
     * Check if the given ImageInfo is acceptable for this filter.
     * 
     * @method accept
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to check
     * @return true if the image height is acceptable, otherwise return false.
     */
    accept : function(imageInfo) {

        if (this.acceptNullHeight && (imageInfo.height == null || imageInfo.height == 0)) {
            return true;
        } else if ((imageInfo.height > this.minHeight) && (this.maxHeight == -1 || imageInfo.height < this.maxHeight)) {
            return true;
        }
        return false;
    }
};

YAHOO.namespace("ip.ImageTypeFilter");
/**
 * Provides the ImageTypeFilter class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.ImageTypeFilter
 * @constructor
 * @param {Array
 *            <String>} imageTypes the array which contians all image types can
 *            be acceptable
 * @param {boolean}
 *            acceptNullImageType a flag to controll if a image have null(empty)
 *            image type can be acceptable
 */
YAHOO.ip.ImageTypeFilter = function(imageTypes, acceptNullImageType, acceptAllImageType) {
    this.imageTypes = imageTypes;
    this.imageTypeString = imageTypes.join("-");
    this.acceptNullImageType = acceptNullImageType;
    this.acceptAllImageType = acceptAllImageType;
};

YAHOO.ip.ImageTypeFilter.prototype = {

    /**
     * Check if the given ImageInfo is acceptable for this filter.
     * 
     * @method accept
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to check
     * @return true if the image type is acceptable, otherwise return false.
     */
    accept : function(imageInfo) {

        if (this.acceptAllImageType) {
            return true;
        } else if (this.acceptNullImageType && (imageInfo.fileExt == null || imageInfo.fileExt == "")) {
            return true;
        } else if (this.imageTypeString.indexOf(imageInfo.fileExt) > -1) {
            return true;
        }
        return false;
    }
};

/**
 * Provides the SkipImageTypeFilter class
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.SkipImageTypeFilter
 * @constructor
 * @param {Array
 *            <String>} skipImageTypes the array which contians all image types
 *            cannot be acceptable
 */
YAHOO.ip.SkipImageTypeFilter = function(skipImageTypes) {
    this.skipImageTypes = skipImageTypes;
    this.skipImageTypeString = skipImageTypes.join("-");
};

YAHOO.ip.SkipImageTypeFilter.prototype = {

    /**
     * Check if the given ImageInfo is acceptable for this filter.
     * 
     * @method accept
     * @param {ImageInfo}
     *            imageInfo The ImageInfo object to check
     * @return true if the image type is acceptable, otherwise return false.
     */
    accept : function(imageInfo) {

        if (this.skipImageTypeString.indexOf(imageInfo.fileExt) != -1) {
            return true;
        }
        return false;
    }
};