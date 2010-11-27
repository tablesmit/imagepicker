Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/model.js");

ImagePickerChrome.pickImages = function() {

    var mainTabBox = getBrowser().mTabBox;
    var contentWindow = getBrowser().browsers[mainTabBox.selectedIndex].contentWindow;
    var documentList = ImagePickerChrome.getDocumentList(contentWindow);

    var imageList = new Array();
    for ( var i = 0; i < documentList.length; i++) {

        var documentImageList = documentList[i].getElementsByTagName('img');

        for (j = 0; j < documentImageList.length; j++) {
            var image = documentImageList[j];
            if (image.src != null && image.src != "") {
                imageList.push(image);
            }
        }
        ImagePicker.Logger.info("document  = " + documentList[i] + ", images  = " + documentImageList.length);
    }

    // filter image by url
    var tidiedImageList = ImagePickerChrome.tidyImages(imageList);
    ImagePicker.Logger.info("imageList.length  = " + imageList.length + ", tidiedImageList.length  = "
            + tidiedImageList.length);

    var imageInfoList = new Array();
    var guid = (new Date()).getTime();
    for ( var j = 0; j < tidiedImageList.length; j++) {
        ImagePicker.Logger.info("image" + j + " = " + tidiedImageList[j].src);
        var image = new ImagePicker.ImageInfo(guid++, tidiedImageList[j]);

        ImagePickerChrome.ImageUtils.updateFileSizeFromCache(image);
        ImagePickerChrome.ImageUtils.updateFileSizeByAjax(image);
        ImagePickerChrome.ImageUtils.updateFileNameFromCache(image);

        imageInfoList.push(image);
    }

    var params = {
        "imageList" : imageInfoList
    };
    var mainWindow = window.openDialog("chrome://imagepicker/content/pick.xul", "PickImage.mainWindow",
            "chrome,centerscreen,resizable, dialog=no, modal=no, dependent=no,status=yes", params);
    mainWindow.focus();
};

ImagePickerChrome.getDocumentList = function(frame) {

    var documentList = new Array();
    documentList.push(frame.document);

    var framesList = frame.frames;
    for ( var i = 0; i < framesList.length; i++) {
        if (framesList[i].document != frame.document) {
            documentList.push(framesList[i].document);
        }
    }

    return documentList;
};

ImagePickerChrome.tidyImages = function(imageList) {

    var tidiedImageList = new Array();

    imageList.sort(ImagePickerChrome.sortImages);

    for ( var i = 0; i < imageList.length; i++) {
        if ((i + 1 < imageList.length) && (imageList[i].src == imageList[i + 1].src)) {
            continue;
        }

        tidiedImageList.push(imageList[i]);
    }

    return tidiedImageList;
};

ImagePickerChrome.sortImages = function(imageOne, imageTwo) {
    var imageOneSrc = imageOne.src;
    var imageTwoSrc = imageTwo.src;

    var sortValue = 1;

    if (imageOneSrc == imageTwoSrc) {
        sortValue = 0;
    } else if (imageOneSrc < imageTwoSrc) {
        sortValue = -1;
    }

    return sortValue;
};
