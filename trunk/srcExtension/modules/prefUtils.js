/****************** PrefUtils Object Class *********************/
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");

/**
 * Provides the preference utilities and extensions used by the ImagePicker
 * @namespace ImagePicker
 * @class ImagePicker.PrefUtils
 */
ImagePicker.PrefUtils =  {
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
