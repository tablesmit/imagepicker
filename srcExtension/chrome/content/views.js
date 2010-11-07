/** **************** ImageGrid Object Class ******************** */
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/model.js");

/**
 * Provides the view for images
 *
 * @namespace ImagePicker
 * @class ImagePickerChrome.ImageGrid
 * @constructor
 * @param {String}
 *            imageContainerId the id of HTML DIV which contains this image grid
 * @param {Number}
 *            gridWidth the width of this image grid
 */
ImagePickerChrome.ImageGrid = function(imageContainerId, gridWidth, thumbnailType, isShowImageSize, isShowImageName,
        isShowImageURL) {
    this.imageContainerId = imageContainerId;
    this.gridWidth = gridWidth;

    this.thumbnailType = thumbnailType;
    this.setThumbnailType(thumbnailType);

    this.isShowImageSize = isShowImageSize;
    this.isShowImageName = isShowImageName;
    this.isShowImageUrl = isShowImageURL;
};

ImagePickerChrome.ImageGrid.prototype = {

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

    _getWidthPerImage : function() {
        return this.thumbnailSize - 15;
    },

    /**
     * Render the image grid in UI.
     *
     * @method render
     * @param {List
     *            <ImageInfo>} imageList The list which contains all ImageInfo objects to render
     */
    render : function(imageList, selectedMap) {

        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

        var columnWidth = this.thumbnailSize;
        var widthPerImage = this._getWidthPerImage();

        // calculate column count
        var columnCount = Math.floor(this.gridWidth / columnWidth);
        columnCount = Math.max(columnCount, 1);

        // calculate row count
        var rowCount = Math.ceil(imageList.length / columnCount);

        ImagePicker.Logger.info("Creating Image Grid: " + this + ", columnWidth = " + columnWidth + ", columnCount = "
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
                var cellBox = document.createElementNS(XUL_NS, "vbox");
                cellBox.setAttribute("width", columnWidth);
                cellBox.setAttribute("height", columnWidth + 15);
                cellBox.setAttribute("pack", "center");
                cellBox.setAttribute("align", "center");

                cellBox.setAttribute("style", "margin:5px; outline: #98989A solid 1px; background-color: #F3F3F3;");
                row.appendChild(cellBox);

                if (index < imageList.length) {

                    var imgInfo = imageList[index];

                    // create image element
                    var imgElem = document.createElementNS(XUL_NS, "image");
                    imgElem.setAttribute("id", imgInfo.id);
                    imgElem.setAttribute("src", imgInfo.url);

                    var imageRate = widthPerImage / Math.max(imgInfo.width, imgInfo.height, 1);
                    var width = Math.min(imageRate * imgInfo.width, imgInfo.width);
                    var height = Math.min(imageRate * imgInfo.height, imgInfo.height);

                    imgElem.setAttribute("width", width);
                    imgElem.setAttribute("height", height);
                    cellBox.appendChild(imgElem);

                    // show additional info
                    var adBox = document.createElementNS(XUL_NS, "vbox");
                    adBox.setAttribute("id", imgInfo.id+"-AdBox");
                    adBox.setAttribute("align", "center");
                    this.renderAdditionalInfo(imgInfo, widthPerImage, adBox);
                    cellBox.appendChild(adBox);

                    //Add checkbox
                    var checkbox = document.createElementNS(XUL_NS, "checkbox");
                    checkbox.setAttribute("checked", selectedMap.get(imgInfo.id));
                    checkbox.setAttribute("oncommand", 'ImagePickerChrome.Controller.selectImage('+imgInfo.id+')');
                    cellBox.appendChild(checkbox);

                    //register change listener
                    var changeListener = {
                        imgGrid: this,
                        onPropertyChange: function(updatedImageInfo){
                            this.imgGrid.updateImageInfo(updatedImageInfo);
                        }
                    };
                    imgInfo.registerChangeListener(changeListener);
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

    renderAdditionalInfo :  function(imageInfo, widthPerImage, adBox) {
        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        var additionalInfos = this.getAdditionalInfo(imageInfo, widthPerImage);
        for ( var k = 0; k < additionalInfos.length; k++) {
            var additionalLabel = document.createElementNS(XUL_NS, "label");
            additionalLabel.setAttribute("value", additionalInfos[k]);
            adBox.appendChild(additionalLabel);
        }
    },

    updateImageInfo : function(imageInfo) {

        var adBox = document.getElementById(imageInfo.id + "-AdBox");

        //ImagePicker.Logger.debug("updateImageInfo to " + adBox + " for " + imageInfo);

        if (adBox != null) {
            // clean old additional info content
            while (adBox.hasChildNodes()) {
                adBox.removeChild(adBox.firstChild);
            }

            // Re-render
            var widthPerImage = this._getWidthPerImage();
            this.renderAdditionalInfo(imageInfo, widthPerImage, adBox);
        }
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
            if (imageInfo.fileSize > 0) {
                info = info + Math.ceil(imageInfo.fileSize / 1000) + "k ";
            } else if((imageInfo.loadFileSizeFromCacheCompleted == false) || (imageInfo.loadFileSizeByAjaxCompleted == false)){
                info = info + " loading ";
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

    updateAdditionalInfo :  function(imageInfo) {

        var additionalInfos = this.getAdditionalInfo(imgInfo, widthPerImage);
        for ( var k = 0; k < additionalInfos.length; k++) {
            var additionalLabel = document.createElementNS(XUL_NS, "label");
            additionalLabel.setAttribute("value", additionalInfos[k]);
            adBox.appendChild(additionalLabel);
        }
    },

    toString : function() {
        var msg = "[Image Grid: gridWidth=" + this.gridWidth + ", thumbnailType=" + this.thumbnailType + "("
                + this.thumbnailSize + "), isShowImageName=" + this.isShowImageName + ", isShowImageSize="
                + this.isShowImageSize + ", isShowImageUrl=" + this.isShowImageUrl + "]";

        return msg;
    }
};
