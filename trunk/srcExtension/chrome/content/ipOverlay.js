function pickImages(){

    const mainTabBox = getBrowser().mTabBox;
    const contentWindow = getBrowser().browsers[mainTabBox.selectedIndex].contentWindow;
    var documentList = getDocumentList(contentWindow);
    
    var imageList = new Array();
    for (var i = 0; i < documentList.length; i++) {
    
        var documentImageList = documentList[i].getElementsByTagName('img');

        for(j=0;j<documentImageList.length;j++)
        {
            imageList.push(documentImageList[j]);
        }
        YAHOO.ip.Logger.info("document  = " + documentList[i] + ", images  = " + documentImageList.length);
    }
    
    //filter image by url
    var tidiedImageList = tidyImages(imageList);
    YAHOO.ip.Logger.info("imageList.length  = " + imageList.length + ", tidiedImageList.length  = " + tidiedImageList.length);
    
    var imageInfoList = new Array();
    for (var j = 0; j < tidiedImageList.length; j++) {
        YAHOO.ip.Logger.info("image" + j + " = " + tidiedImageList[j].src);
        var image = new YAHOO.ip.ImageInfo(tidiedImageList[j]);
        imageInfoList.push(image);
    }

    var params = {
        "imageList": imageInfoList
    };
    var mainWindow = window.openDialog("chrome://imagepicker/content/pick.xul", "PickImage.mainWindow", "chrome,centerscreen,resizable, dialog=no, modal=no, dependent=no,status=yes", params);
    mainWindow.focus();
}


function getDocumentList(frame){

    var documentList = new Array();
    documentList.push(frame.document);
    
    var framesList = frame.frames;
    for (var i = 0; i < framesList.length; i++) {
        if (framesList[i].document != frame.document) {
            documentList.push(framesList[i].document);
        }
    }
    
    return documentList;
}

function tidyImages(imageList){
    var tidiedImageList = new Array();
    
    imageList.sort(sortImages);
    
    for (i = 0; i < imageList.length; i++) {
        if (i + 1 < imageList.length && imageList[i].src == imageList[i + 1].src) {
            continue;
        }
        
        tidiedImageList.push(imageList[i]);
    }
    
    return tidiedImageList;
}

function sortImages(imageOne, imageTwo){
    const imageOneSrc = imageOne.src;
    const imageTwoSrc = imageTwo.src;
    
    var sortValue = 1;
    
    if (imageOneSrc == imageTwoSrc) {
        sortValue = 0;
    } else if (imageOneSrc < imageTwoSrc) {
        sortValue = -1;
    }
    
    return sortValue;
}
