/** **************** ImageGrid Object Class ******************** */
YAHOO.namespace("ip.ImageGrid");
/**
 * Provides the view for images
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.ImageGrid
 * @constructor
 * @param {String}
 *            imageContainerId the id of Html DIV which contains this image grid
 * @param {Number}
 *            gridWidth the width of this image grid
 */
YAHOO.ip.ImageGrid = function(imageContainerId, gridWidth, thumbnailType, isShowImageName, isShowImageUrl,
        isShowImageSize) {
    this.imageContainerId = imageContainerId;
    this.gridWidth = gridWidth;

    this.thumbnailSize = 200;
    this.thumbnailType = thumbnailType;
    this.setThumbnailType(thumbnailType);

    this.isShowImageName = isShowImageName;
    this.isShowImageUrl = isShowImageUrl;
    this.isShowImageSize = isShowImageSize;
}

YAHOO.ip.ImageGrid.prototype = {

    /**
     * set the thumbnail type to image grid.
     * 
     * @method setThumbnailType
     * @param {String}
     *            thumbnailType "small","normal" and "large"
     */
    setThumbnailType : function(thumbnailType) {
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
     *            <ImageInfo>} imageList The list which contains all ImageInfo
     *            objects to render
     */
    render : function(imageList) {

        const
        XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

        var columnWidth = this.thumbnailSize;

        // caculate column count
        var columnCount = Math.floor(this.gridWidth / columnWidth);
        columnCount = Math.max(columnCount, 1);

        // caculate row count
        var rowCount = Math.ceil(imageList.length / columnCount);

        YAHOO.ip.Logger.info("Creating Image Grid: gridWidth = " + this.gridWidth + ", columnWidth = " + columnWidth
                + ", columnCount = " + columnCount + ", rowCount = " + rowCount);

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
                    var additionalInfo = imageList[index].width + "x" + imageList[index].height + " ";
                    if (imageList[index].fileSize != null) {
                        additionalInfo = additionalInfo + Math.ceil(imageList[index].fileSize / 1000) + "k ";
                    } else {
                        additionalInfo = additionalInfo + 0 + "k ";
                    }

                    var additionalLabel = document.createElementNS(XUL_NS, "label");
                    additionalLabel.setAttribute("value", additionalInfo);
                    vbox.appendChild(additionalLabel);

                    additionalInfo = imageList[index].fileName;
                    if (imageList[index].fileName.length > widthPerImage / 6) {
                        additionalInfo = imageList[index].fileName.substr(0, widthPerImage / 6 - 6) + "...";
                        if (imageList[index].fileExt != null) {
                            additionalInfo = additionalInfo + imageList[index].fileExt;
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

        // add image grid to parent DIV
        var imageContainer = document.getElementById("imageContainer");
        imageContainer.appendChild(imgGrid);
    }
}
