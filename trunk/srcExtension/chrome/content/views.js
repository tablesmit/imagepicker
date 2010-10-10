/** **************** ImageGrid Object Class ******************** */
YAHOO.namespace("ip.ImageGrid");
/**
 * Provides the view for images
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.ImageGrid
 * @constructor
 * @param {String}
 *            imageContainerId the id of HTML DIV which contains this image grid
 * @param {Number}
 *            gridWidth the width of this image grid
 */
YAHOO.ip.ImageGrid = function(imageContainerId, gridWidth, thumbnailType, isShowImageSize, isShowImageName,
        isShowImageURL) {
    this.imageContainerId = imageContainerId;
    this.gridWidth = gridWidth;

    this.thumbnailType = thumbnailType;
    this.setThumbnailType(thumbnailType);

    this.isShowImageSize = isShowImageSize;
    this.isShowImageName = isShowImageName;
    this.isShowImageUrl = isShowImageURL;
};

YAHOO.ip.ImageGrid.prototype = {

    /**
     * set the thumbnail type to image grid.
     * 
     * @method setThumbnailType
     * @param {String}
     *            thumbnailType "small","normal" and "large"
     */
    setThumbnailType : function(thumbnailType) {
        this.thumbnailType = thumbnailType;
        switch (thumbnailType) {
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
    },

    /**
     * Render the image grid in UI.
     * 
     * @method render
     * @param {List
     *            <ImageInfo>} imageList The list which contains all ImageInfo objects to render
     */
    render : function(imageList) {

        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

        var columnWidth = this.thumbnailSize;

        // calculate column count
        var columnCount = Math.floor(this.gridWidth / columnWidth);
        columnCount = Math.max(columnCount, 1);

        // calculate row count
        var rowCount = Math.ceil(imageList.length / columnCount);

        YAHOO.ip.Logger.info("Creating Image Grid: " + this + ", columnWidth = " + columnWidth + ", columnCount = "
                + columnCount + ", rowCount = " + rowCount);

        // create grid
        var imgGrid = document.createElementNS(XUL_NS, "grid");
        imgGrid.setAttribute("width", this.gridWidth);
        imgGrid.setAttribute("style", "margin:5px; ");

        // create columns for grid
        var columns = document.createElementNS(XUL_NS, "columns");
        for ( var j = 0; j < columnCount; j++) {
            var column = document.createElementNS(XUL_NS, "column");
            columns.appendChild(column);
        }
        imgGrid.appendChild(columns);

        // create rows for grid
        var rows = document.createElementNS(XUL_NS, "rows");
        var index = 0;
        for ( var i = 0; i < rowCount; i++) {
            var row = document.createElementNS(XUL_NS, "row");
            row.setAttribute("align", "center");
            for ( var j = 0; j < columnCount; j++) {

                // create grid cell box
                var vbox = document.createElementNS(XUL_NS, "vbox");
                vbox.setAttribute("width", columnWidth);
                vbox.setAttribute("height", columnWidth + 15);
                vbox.setAttribute("pack", "center");
                vbox.setAttribute("align", "center");

                vbox.setAttribute("style", "margin:5px; outline: #98989A solid 1px; background-color: #F3F3F3;");
                row.appendChild(vbox);

                if (index < imageList.length) {

                    // create image element
                    var img = document.createElementNS(XUL_NS, "image");
                    img.setAttribute("id", imageList[index].id);
                    img.setAttribute("src", imageList[index].url);

                    var widthPerImage = columnWidth - 15;
                    var imageRate = widthPerImage / Math.max(imageList[index].width, imageList[index].height, 1);
                    var width = Math.min(imageRate * imageList[index].width, imageList[index].width);
                    var height = Math.min(imageRate * imageList[index].height, imageList[index].height);

                    img.setAttribute("width", width);
                    img.setAttribute("height", height);
                    vbox.appendChild(img);

                    // show additional info
                    var additionalInfos = this.getAdditionalInfo(imageList[index], widthPerImage);
                    for ( var k = 0; k < additionalInfos.length; k++) {
                        var additionalLabel = document.createElementNS(XUL_NS, "label");
                        additionalLabel.setAttribute("value", additionalInfos[k]);
                        vbox.appendChild(additionalLabel);
                    }
                }

                index++;
            }
            rows.appendChild(row);
        }

        imgGrid.appendChild(rows);

        // add image grid to parent DIV
        var imageContainer = document.getElementById("imageContainer");
        imageContainer.appendChild(imgGrid);
    },

    /**
     * Get the additional info (image size, name...) to show on the image grid.
     * 
     * @method getAdditionalInfo
     * @param {ImageInfo}
     *            imageInfo
     * @return {Array}
     */
    getAdditionalInfo : function(imageInfo, widthPerImage) {

        var additionalInfos = new Array();

        if (this.isShowImageSize) { // show image width, height and size
            var info = imageInfo.width + "x" + imageInfo.height + " ";
            if (imageInfo.fileSize != null) {
                info = info + Math.ceil(imageInfo.fileSize / 1000) + "k ";
            } else {
                info = info + 0 + "k ";
            }
            additionalInfos.push(info);
        }

        if (this.isShowImageName) { // show image name
            var info = imageInfo.fileName;
            if (imageInfo.fileName.length > widthPerImage / 6) {
                info = imageInfo.fileName.substr(0, widthPerImage / 6 - 6) + "...";
                if (imageInfo.fileExt != null) {
                    info = info + imageInfo.fileExt;
                }
            }
            additionalInfos.push(info);
        }
        return additionalInfos;
    },

    toString : function() {
        var msg = "[Image Grid: gridWidth=" + this.gridWidth + ", thumbnailType=" + this.thumbnailType + "("
                + this.thumbnailSize + "), isShowImageName=" + this.isShowImageName + ", isShowImageSize="
                + this.isShowImageSize + ", isShowImageUrl=" + this.isShowImageUrl + "]";

        return msg;
    }
};
