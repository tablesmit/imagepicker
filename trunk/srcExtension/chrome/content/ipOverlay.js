Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/model.js");
Components.utils.import("resource://imagepicker/settings.js");

/**
 * Return the "browser" type object.
 */
ImagePickerChrome.getCurrentBrowser = function(){
    //gBrowser is "tabbrowser" type
    //tabbrowser.browser() method return the "browser" type
    //var mainTabBox = getBrowser().mTabBox;
    //return getBrowser().browsers[mainTabBox.selectedIndex];
    return gBrowser.selectedBrowser;
};

/**
 * Return the "tab" type object.
 *     gBrowser.selectedTab == gBrowser.mCurrentTab
 * and gBrowser.selectedBrowser == gBrowser.getBrowserAtIndex(gBrowser.tabContainer.selectedIndex)
 * and gBrowser.selectedBrowser == gBrowser.getBrowserForTab(gBrowser.selectedTab)
 */
ImagePickerChrome.getCurrentTab = function(){
    return gBrowser.selectedTab;
};

ImagePickerChrome.getFormattedString = function(key, parameters){
    // Get a reference to the strings bundle
    var stringsBundle = document.getElementById("string-bundle");
    return stringsBundle.getFormattedString(key, parameters);
};

ImagePickerChrome.pickImagesFromCurrentTab = function(event){

    event.stopPropagation();

    //Collect current tab
    var currentTab = ImagePickerChrome.getCurrentTab();
    var tabs = [currentTab]

    //Get document title
    var currentTabTitle = ImagePickerChrome.getCurrentBrowser().contentDocument.title;

    //Pick image
    ImagePickerChrome.pickImages(tabs, currentTabTitle);
};

ImagePickerChrome.pickImagesFromAllTabs = function(event){

    event.stopPropagation();

    //Collect tabs
    var tabs = [];
    for(var i=0; i<gBrowser.tabs.length; i++){
        tabs.push(gBrowser.tabs[i])
    }

    //Get document title
    var currentTabTitle = ImagePickerChrome.getCurrentBrowser().contentDocument.title;

    //Pick image
    ImagePickerChrome.pickImages(tabs, currentTabTitle);
};

ImagePickerChrome.pickImagesFromTabs = function(event, tabTitle){

    event.stopPropagation();

    //Collect all tabs contain the given tabTitle
    var tabs = [];
    for (var i = 0, numTabs = gBrowser.browsers.length; i < numTabs; i++) {
        var curBrowser = gBrowser.getBrowserAtIndex(i);
        var curTitle = curBrowser.contentDocument.title;
        if (curTitle.indexOf(tabTitle) != -1) {
            tabs.push(gBrowser.tabs[i]);
        }
    }

    //Pick image
    ImagePickerChrome.pickImages(tabs, tabTitle);
};

/**
 * Pick image from the given tabs
 *
 * @param {Array[XULTab]} tabs
 * @param {String} title
 */
ImagePickerChrome.pickImages = function(tabs, title){

    //init cache session
    var cacheService = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    ImagePickerChrome.httpCacheSession = cacheService.createSession("HTTP", Ci.nsICache.STORE_ANYWHERE, Ci.nsICache.STREAM_BASED);
    ImagePickerChrome.httpCacheSession.doomEntriesIfExpired = false;

    //Get images from all given tabs
    var imageInfoList = new Array();
    tabs.forEach(function(tab){
        var browser = gBrowser.getBrowserForTab(tab);
        var contentWindow = browser.contentWindow;

        var documentList = ImagePickerChrome.getDocumentList(contentWindow);
        for (var i = 0; i < documentList.length; i++) {
            //handle current document
            var currentDocument = documentList[i];
            var currentImageList = new Array();
            var documentImageList = currentDocument.getElementsByTagName('img');
            for (j = 0; j < documentImageList.length; j++) {
                var image = documentImageList[j];
                if (image.src != null && image.src != "") {
                    currentImageList.push(image);
                }
            }
            ImagePicker.Logger.info("document = " + currentDocument.title + ", images = " + currentImageList.length);

            imageInfoList = imageInfoList.concat(ImagePickerChrome.convertAndTidyImage(currentImageList));
        }// end for each document
    });

    //Collect tabs to be closed after saved images
    var listeners = [new ImagePickerChrome.CloseTabListener(tabs)];

    //Prepare parameters
    var params = {
        "imageList": imageInfoList,
        "title": title,
        "listeners": listeners
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

/**
 * 1. Filter duplicate image
 * 2. Convert the given HTMLElement image list to the ImagePicker.ImageInfo list
 * 3. Sort image by Top
 * @param {Array[HTMLElement]} htmlImageList
 * @return {Array[ImagePicker.ImageInfo]}
 */
ImagePickerChrome.convertAndTidyImage = function(htmlImageList){

    //Filter image by url
    var tidiedHtmlImageList = ImagePickerChrome.filterDuplicateImage(htmlImageList);
    ImagePicker.Logger.info("imageList.length  = " + htmlImageList.length + ", tidiedHtmlImageList.length  = " +
    tidiedHtmlImageList.length);

    //Convert to ImagePicker.ImageInfo
    var imageInfoList = new Array();
    var guid = (new Date()).getTime();
    for (var j = 0; j < tidiedHtmlImageList.length; j++) {
        var tImg = tidiedHtmlImageList[j];

        ImagePicker.Logger.info("image" + j + " = " + tImg.src);

        var image = new ImagePicker.ImageInfo(guid++, tImg, ImagePickerChrome.getImageTop(tImg));

        ImagePickerChrome.ImageUtils.updateFileExtensionByMIME(image);
        ImagePickerChrome.ImageUtils.updateFileSizeFromCache(image);
        ImagePickerChrome.ImageUtils.updateFileNameFromCache(image);

        imageInfoList.push(image);
    }

    //Sort by the image top
    imageInfoList.sort(ImagePickerChrome.sortImagesByTop);

    return imageInfoList;
};

/**
 * Filter duplicate image by image URL
 * @param {Array[HTMLElement]} imageList
 * @return {Array[HTMLElement]}
 */
ImagePickerChrome.filterDuplicateImage = function(imageList){

    var results = new Array();

    imageList.sort(ImagePickerChrome.sortImagesBySrc);

    for (var i = 0; i < imageList.length; i++) {
        if ((i + 1 < imageList.length) && (imageList[i].src == imageList[i + 1].src)) {
            continue;
        }

        results.push(imageList[i]);
    }

    return results;
};

/**
 * Sort image by image src
 * @param {HTMLElement} imageOne
 * @param {HTMLElement} imageTwo
 */
ImagePickerChrome.sortImagesBySrc = function(imageOne, imageTwo){
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

/**
 * Sort image by image top
 * @param {ImagePicker.ImageInfo} imageOne
 * @param {ImagePicker.ImageInfo} imageTwo
 */
ImagePickerChrome.sortImagesByTop = function(imageOne, imageTwo){
    var imageOneTop = imageOne.top;
    var imageTwoTop = imageTwo.top;

    var sortValue = 1;

    if (imageOneTop == imageTwoTop) {
        sortValue = 0;
    } else if (imageOneTop < imageTwoTop) {
        sortValue = -1;
    }

    return sortValue;
};

/**
 * Get the top of image element
 * @param {HTMLElement} image
 */
ImagePickerChrome.getImageTop = function(image){

    var top =image.getBoundingClientRect().top + document.documentElement.scrollTop;

    return top;
};

ImagePickerChrome.generatePickImageMenuItems = function(event){

    var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    //Split current tab title to collect feeds
    var currentTabTitle = ImagePickerChrome.getCurrentBrowser().contentDocument.title;

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

/** **************** CloseTabListener Object Class ******************** */
/**
 * Provides the CloseTabListener class to close browser tabs after saved images
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.CloseTabListener
 * @constructor
 */
ImagePickerChrome.CloseTabListener = function(tabs) {
    this.tabs = tabs;
};

ImagePickerChrome.CloseTabListener.prototype = {

    afterSavedImages: function(){

        if (this.tabs && ImagePicker.Settings.isCloseBrowserTabAfterSaved()) {

            //Create a blank tab if close all tabs to avoid Firefox is closed.
            if(this.tabs.length == gBrowser.tabs.length){
                gBrowser.addTab("about:blank");
            }

            //Close all tabs
            this.tabs.forEach(function(tab){
                if (tab) {
                    gBrowser.removeTab(tab);
                }
            });
        }// end if tabs
    }
};
