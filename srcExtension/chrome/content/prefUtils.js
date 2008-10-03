/****************** PrefUtils Object Class *********************/
YAHOO.namespace("ip.PrefUtils");
/**
 * Provides the preference utilites and extensions used by the ImagePicker
 * @namespace YAHOO.ip
 * @class YAHOO.ip.PrefUtils
 */
YAHOO.ip.PrefUtils =  {
    /**
     * Get a unicode char value from perference system for the given prefName
     * @method getUnicodeChar
     * @param {nsIPrefBranch} prefs the perference system branch object.
     * @param {String} prefName the perference name to get perference value.
     * @return {String} the perference value for the given prefName
     */
    getUnicodeChar: function(prefs, prefName){
        return prefs.getComplexValue(prefName, Ci.nsISupportsString).data;
    },
    
    /**
     * Set a unicode char value to perference system for the given prefName
     * @method setUnicodeChar
     * @param {nsIPrefBranch} prefs the perference system branch object.
     * @param {String} prefName the perference name.
     * @param {String} prefValue the perference value.
     */
    setUnicodeChar: function(prefs, prefName, prefValue){
        var supportsString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        supportsString.data = prefValue;
        prefs.setComplexValue(prefName, Ci.nsISupportsString, supportsString);
    }
};
