/****************** Settings Object Class *********************/
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");

/**
 * Provides the preference utilities and extensions used by the ImagePicker
 * @namespace ImagePicker
 * @class ImagePicker.Settings
 */
ImagePicker.Settings =  {
    
    _prefs : Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(
                "extensions.imagepicker."),
                
    getThumbnailType: function(){
        return this._prefs.getCharPref("displayrule.thumbnailType");
    },
    
    setThumbnailType: function(tnType){
        return this._prefs.setCharPref("displayrule.thumbnailType", tnType);
    },
    
    isShowImageSize: function(){
        return this._prefs.getBoolPref("displayrule.showImageSize");
    },
    
    setShowImageSize: function(isShowImageSize){
        return this._prefs.setBoolPref("displayrule.showImageSize", isShowImageSize);
    },
    
    isShowImageName: function(){
        return this._prefs.getBoolPref("displayrule.showImageName");
    },
    
    setShowImageName: function(isShowImageName){
        return this._prefs.setBoolPref("displayrule.showImageName", isShowImageName);
    },
    
    getMinWidth: function(){
        return this._prefs.getIntPref("filter.minWidth");
    },
    
    setMinWidth: function(minWidth){
        return this._prefs.setIntPref("filter.minWidth", minWidth);
    },
    
    getMinHeight: function(){
        return this._prefs.getIntPref("filter.minHeight");
    },
    
    setMinHeight: function(minHeight){
        return this._prefs.setIntPref("filter.minHeight", minHeight);
    },
    
    getMinSize: function(){
        return this._prefs.getIntPref("filter.minSize");
    },
    
    setMinSize: function(minSize){
        return this._prefs.setIntPref("filter.minSize", minSize);
    },
    
    isSkipImageTypeBMP: function(){
        return this._prefs.getBoolPref("filter.skipImageTypes.bmp");
    },
    
    setSkipImageTypeBMP: function(isSkip){
        return this._prefs.setBoolPref("filter.skipImageTypes.bmp", isSkip);
    },
    
    isSkipImageTypeJPG: function(){
        return this._prefs.getBoolPref("filter.skipImageTypes.jpg");
    },
    
    setSkipImageTypeJPG: function(isSkip){
        return this._prefs.setBoolPref("filter.skipImageTypes.jpg", isSkip);
    },
    
    isSkipImageTypePNG: function(){
        return this._prefs.getBoolPref("filter.skipImageTypes.png");
    },
    
    setSkipImageTypePNG: function(isSkip){
        return this._prefs.setBoolPref("filter.skipImageTypes.png", isSkip);
    },
    
    isSkipImageTypeGIF: function(){
        return this._prefs.getBoolPref("filter.skipImageTypes.gif");
    },
    
    setSkipImageTypeGIF: function(isSkip){
        return this._prefs.setBoolPref("filter.skipImageTypes.gif", isSkip);
    },
    
    getSavedFolderPath: function(){
        return this.getUnicodeChar(this._prefs, "savedFolderPath");
    },
    
    setSavedFolderPath: function(path){
        return this.setUnicodeChar(this._prefs, "savedFolderPath", path);
    },
    
    isCreatedFolderByTitle: function(){
        return this._prefs.getBoolPref("createdFolderByTitle");
    },
    
    isOpenExplorerAfterSaved: function(){
        return this._prefs.getBoolPref("openExplorerAfterSaved");
    },
    
    isOpenDownloadManagerAfterSaved: function(){
        return this._prefs.getBoolPref("openDownloadManagerAfterSaved");
    },
    
    isCloseImagePickerAfterSaved: function(){
        return this._prefs.getBoolPref("closeImagePickerAfterSaved");
    },
                 
    /**
     * Get a unicode char value from preference system for the given prefName
     * @method getUnicodeChar
     * @param {nsIPrefBranch} prefs the preference system branch object.
     * @param {String} prefName the preference name to get preference value.
     * @return {String} the preference value for the given prefName
     */
    getUnicodeChar: function(prefs, prefName){
        return prefs.getComplexValue(prefName, Ci.nsISupportsString).data;
    },

    /**
     * Set a unicode char value to preference system for the given prefName
     * @method setUnicodeChar
     * @param {nsIPrefBranch} prefs the preference system branch object.
     * @param {String} prefName the preference name.
     * @param {String} prefValue the preference value.
     */
    setUnicodeChar: function(prefs, prefName, prefValue){
        var supportsString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        supportsString.data = prefValue;
        prefs.setComplexValue(prefName, Ci.nsISupportsString, supportsString);
    }
};
