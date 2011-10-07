Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/model.js");

ImagePickerChrome.getCurrentTab = function(){
    var mainTabBox = getBrowser().mTabBox;
    return getBrowser().browsers[mainTabBox.selectedIndex];
};

ImagePickerChrome.getFormattedString = function(key, parameters){
    // Get a reference to the strings bundle
    var stringsBundle = document.getElementById("string-bundle");
    return stringsBundle.getFormattedString(key, parameters);
};

ImagePickerChrome.pickImagesFromCurrentTab = function(event){

    event.stopPropagation();

    //Get document list 
    var currentTab = ImagePickerChrome.getCurrentTab();
    var contentWindow = currentTab.contentWindow;
    var documentList = ImagePickerChrome.getDocumentList(contentWindow);
    
    //Get document title 
    var currentTabTitle = currentTab.contentDocument.title;
    
    //Pick image
    ImagePickerChrome.pickImages(documentList, currentTabTitle);
};

ImagePickerChrome.pickImagesFromAllTabs = function(event){
    
    event.stopPropagation();

    // collect document from all tabs
    var documentList = [];
    for (var i = 0, numTabs = gBrowser.browsers.length; i < numTabs; i++) {
        var curBrowser = gBrowser.getBrowserAtIndex(i);
        var contentWindow = curBrowser.contentWindow;
        var documents = ImagePickerChrome.getDocumentList(contentWindow);
        documentList = documentList.concat(documents);
    }
    
    //Get document title 
    var currentTabTitle = ImagePickerChrome.getCurrentTab().contentDocument.title;
    
    //Pick image
    ImagePickerChrome.pickImages(documentList, currentTabTitle);
};

ImagePickerChrome.pickImagesFromTabs = function(event, tabTitle){
    
    event.stopPropagation();
    
    // collect document from all tabs contain the given tabTitle
    var documentList = [];
    for (var i = 0, numTabs = gBrowser.browsers.length; i < numTabs; i++) {
        var curBrowser = gBrowser.getBrowserAtIndex(i);
        var curTitle = curBrowser.contentDocument.title;
        if (curTitle.indexOf(tabTitle) != -1) {
            var contentWindow = curBrowser.contentWindow;
            var documents = ImagePickerChrome.getDocumentList(contentWindow);
            documentList = documentList.concat(documents);
        }
    }

    //Pick image
    ImagePickerChrome.pickImages(documentList, tabTitle);
};

ImagePickerChrome.pickImages = function(documentList, title){

    //init cache session
    var cacheService = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    ImagePickerChrome.httpCacheSession = cacheService.createSession("HTTP", Ci.nsICache.STORE_ANYWHERE, Ci.nsICache.STREAM_BASED);
    ImagePickerChrome.httpCacheSession.doomEntriesIfExpired = false;
    
    //Get images
    var imageList = new Array();
    for (var i = 0; i < documentList.length; i++) {
    
        var documentImageList = documentList[i].getElementsByTagName('img');
        
        for (j = 0; j < documentImageList.length; j++) {
            var image = documentImageList[j];
            if (image.src != null && image.src != "") {
                imageList.push(image);
            }
        }
        ImagePicker.Logger.info("document  = " + documentList[i].title + ", images  = " + documentImageList.length);
    }
    
    // filter image by url
    var tidiedImageList = ImagePickerChrome.tidyImages(imageList);
    ImagePicker.Logger.info("imageList.length  = " + imageList.length + ", tidiedImageList.length  = " +
    tidiedImageList.length);
    
    var imageInfoList = new Array();
    var guid = (new Date()).getTime();
    for (var j = 0; j < tidiedImageList.length; j++) {
        ImagePicker.Logger.info("image" + j + " = " + tidiedImageList[j].src);
        var image = new ImagePicker.ImageInfo(guid++, tidiedImageList[j]);
        
        ImagePickerChrome.ImageUtils.updateFileExtensionByMIME(image);
        ImagePickerChrome.ImageUtils.updateFileSizeFromCache(image);
        ImagePickerChrome.ImageUtils.updateFileNameFromCache(image);
        
        imageInfoList.push(image);
    }
    
    var params = {
        "imageList": imageInfoList,
        "title": title
    };
    var mainWindow = window.openDialog("chrome://imagepicker/content/pick.xul", "PickImage.mainWindow", "chrome,centerscreen,resizable, dialog=no, modal=no, dependent=no,status=yes", params);
    mainWindow.focus();
};

ImagePickerChrome.getDocumentList = function(frame){

    var documentList = new Array();
    documentList.push(frame.document);
    
    var framesList = frame.frames;
    for (var i = 0; i < framesList.length; i++) {
        if (framesList[i].document != frame.document) {
            documentList.push(framesList[i].document);
        }
    }
    
    return documentList;
};

ImagePickerChrome.tidyImages = function(imageList){

    var tidiedImageList = new Array();
    
    imageList.sort(ImagePickerChrome.sortImages);
    
    for (var i = 0; i < imageList.length; i++) {
        if ((i + 1 < imageList.length) && (imageList[i].src == imageList[i + 1].src)) {
            continue;
        }
        
        tidiedImageList.push(imageList[i]);
    }
    
    return tidiedImageList;
};

ImagePickerChrome.sortImages = function(imageOne, imageTwo){
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


ImagePickerChrome.generatePickImageMenuItems = function(event){

    var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    
    //Split current tab title to collect feeds
    var currentTabTitle = ImagePickerChrome.getCurrentTab().contentDocument.title;
    
    var separator = /-|_|\(|\)|\[|\]|\|/;
    var feedTexts = currentTabTitle.split(separator);
    var feeds = new Array();
    for (var i = 0; i < feedTexts.length; i++) {
        var feedText = feedTexts[i].trim();
        if (feedText.length > 1) { //collect only feedText is larger than 1 chars 
            var feed = {
                text: feedText,
                occurrence: 0
            }
            ImagePicker.Logger.info("feed = [" + feed.text + ", " + feed.occurrence + "]");
            feeds.push(feed);
        }
    }
    
    // collect statistics from all tabs
    for (var i = 0, numTabs = gBrowser.browsers.length; i < numTabs; i++) {
        var curBrowser = gBrowser.getBrowserAtIndex(i);
        var curTitle = curBrowser.contentDocument.title;
        feeds.forEach(function(feed){
            if (curTitle.indexOf(feed.text) != -1) {
                feed.occurrence = feed.occurrence + 1;
            }
        });
    }
    
    // sort occurrence 
    feeds.sort(function(feed1, feed2){
        return feed1.occurrence - feed2.occurrence;
    });
    
    // update menu items
    var menuPopup = document.getElementById("image-pick-button-popup");
    var children = menuPopup.children;
    // Remove all dynamic menu items except menu separator, "pick current tab" and "pick all tabs" menu items 
    for (var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        if (child.id != "ipbtn-menucurrent" && child.id != "ipbtn-menuall" && child.id != "ipbtn-menuseparator") {
            menuPopup.removeChild(child);
        }
    }
    
    // Add menu items when occurrence is larger than 1
    feeds.forEach(function(feed){
        if (feed.occurrence > 1) {
            var label = ImagePickerChrome.getFormattedString("pickButtonDynamicMenuItem", [feed.text, feed.occurrence]);
            var menuitem = document.createElementNS(XUL_NS, "menuitem");
            menuitem.setAttribute("label", label);
            menuitem.addEventListener("command", function(e){
                ImagePickerChrome.pickImagesFromTabs(e, feed.text);
            }, false);

            menuPopup.appendChild(menuitem);
        }
    });
};
