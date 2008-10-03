//      Common (global) variables
var Cc = Components.classes;
var Ci = Components.interfaces;

YAHOO.namespace("ip.Logger");
/**
 * Provides the log utilites used by the ImagePicker
 * @namespace YAHOO.ip
 * @class YAHOO.ip.Logger
 */
YAHOO.ip.Logger = {
    /**
     * Object reference to nsIConsoleService
     * @property consoleService
     * @private
     * @type nsIConsoleService
     */
    consoleService: Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),
    
    /**
     * Log the given message to console.
     * @method log
     * @param {String} msg the message to log
     */
    log: function(msg){
        this.consoleService.logStringMessage("ImagePicker: " + msg);
    },
    
    /**
     * Log the given debug message to console.
     * @method debug
     * @param {String} msg the message to log
     */
    debug: function(msg){
        this.log("[DEBUG] " + msg);
    },
    
    /**
     * Log the given information level message to console.
     * @method info
     * @param {String} msg the message to log
     */
    info: function(msg){
        this.log("[INFO] " + msg);
    },
    
    /**
     * Log the given warning message to console.
     * @method warn
     * @param {String} msg the message to log
     */
    warn: function(msg, e){
        if (!YAHOO.lang.isNull(e)) {
            msg = msg + ", exception = " + e;
        }
        this.log("[WARN] " + msg);
    },
    
    /**
     * Log the given error message to console.
     * @method error
     * @param {String} msg the message to log
     */
    error: function(msg, e){
        if (!YAHOO.lang.isNull(e)) {
            msg = msg + ", exception = " + e;
            
            //report error
            Components.utils.reportError(e);
        }
        this.log("[ERROR] " + msg);
    }
}
