/** **************** FileUtils Object Class ******************** */
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://imagepicker/common.js");

/**
 * Provides XUL utilities and extensions used by the ImagePicker
 *
 * @namespace ImagePicker
 * @class ImagePicker.XulUtils
 */
ImagePicker.XulUtils = {
    
    createElement: function(document, name){
        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        return document.createElementNS(XUL_NS, name);
    },
    
    hasClass: function(element, className) {
        var elementClassName = element.className;
        return (elementClassName.length > 0 && (elementClassName == className ||
          new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
    },

    addClass: function(element, className) {
        if (!this.hasClass(element, className)) {
            element.className += (element.className ? ' ' : '') + className;
        }
    },
    
    removeClass: function(element, className) {
        element.className = element.className.replace(
          new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ');
    }
};
