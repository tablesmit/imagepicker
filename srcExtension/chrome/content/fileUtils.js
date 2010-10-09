/** **************** FileUtils Object Class ******************** */
YAHOO.namespace("ip.FileUtils");
/**
 * Provides the file utilites and extensions used by the ImagePicker
 * 
 * @namespace YAHOO.ip
 * @class YAHOO.ip.FileUtils
 */
YAHOO.ip.FileUtils = {

    /**
     * Attempt to open the given nsIFile directory with Finder/Explorer/Whatever
     * properties.
     * 
     * @method revealDirectory
     * @param {nsIFile}
     *            directory The directory to open.
     */
    revealDirectory : function(directory) {
        var osString = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;

        // OS X Finder shows the folder containing the reveal
        // target. What we really want is to show the
        // contents of the target folder.
        if (osString == "Darwin" && directory.isDirectory()) {
            var files = directory.directoryEntries;
            if (files.hasMoreElements()) {
                directory = files.getNext().QueryInterface(Ci.nsIFile);
            }
        }

        // Reveal is not implemented on all platforms.
        try {
            directory.reveal();
        } catch (e) {
            YAHOO.ip.Logger.error("Cannot open directory for " + directory, e);
        }
    },

    /**
     * Attempt to create a directory for the given path.
     * 
     * @method toDirectory
     * @param {String}
     *            path The path of directory to open.
     * @return {nsILocalFile} the nsILocalFile representing the directory for
     *         the given path
     */
    toDirectory : function(path) {

        // check argument
        if (YAHOO.lang.isNull(path) || path.length == 0) {
            return null;
        }

        // create directory
        var directory = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);

        try {
            directory.initWithPath(path);
            if (directory.exists()) {
                return directory;
            }
        } catch (e) {
            YAHOO.ip.Logger.warn("Cannot convert path: " + path + " to directory", e);
            return null;
        }

        return null;
    },

    /**
     * Attempt to convert the given originalName to a valid directory/file name
     * 
     * @method toValidName
     * @param {String}
     *            originalName the original name to be converted.
     * @return {String} a valid directory/file name for the given originalName
     */
    toValidName : function(originalName) {

        var validName = originalName;

        var parts = originalName.split("-");
        if (parts.length > 1) {
            validName = parts[parts.length - 2];
        }

        // replace special char
        var reg = /[\\\/:\*?\"<>|]/g;
        validName = validName.replace(reg, "");

        validName = validName.substr(0, 100);

        // tirm string
        validName = validName.replace(/^\s*/, "").replace(/\s*$/, "");

        if (validName.length != originalName.length) {
            YAHOO.ip.Logger.info("convert " + originalName + " to directory name: " + validName);
        }

        return validName;
    },

    /**
     * Attempt to create a unique file for the given fileName in the given
     * parentDir. If the parentDir and fileNames contains the same file or
     * fileName, the method will make a new unique file name.
     * 
     * @method getUniqueFile
     * @param {String}
     *            fileName the name of file to be created.
     * @param {nsILocalFile}
     *            parentDir the parent directory to create file.
     * @param {Array
     *            <String,boolean>} fileNames the Array contains all file names
     *            which will be created in parentDir.
     * @return {nsILocalFile} the nsILocalFile representing the unique file for
     *         the given file name
     */
    createUniqueFile : function(fileName, parentDir, fileNames) {

        var originalName = YAHOO.ip.FileUtils.toValidName(fileName);

        var tempName = originalName;

        // create a temp file for the file name
        var tempFile = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
        tempFile.initWithFile(parentDir);
        tempFile.append(tempName);

        // check if the file is exists.
        var incNumber = 1;
        while (tempFile.exists() || typeof (fileNames[tempName]) != 'undefined') {
            // if the file exists or have a exist name in array, make a new file
            // name
            if (originalName.indexOf('.') != -1) { // have file ext
                var ext = originalName.substring(originalName.lastIndexOf('.'), originalName.length);
                var fileNameWithoutExt = originalName.substring(0, originalName.length - ext.length);
                tempName = fileNameWithoutExt + "(" + incNumber + ")" + ext;
            } else {
                tempName = originalName + "(" + incNumber + ")";
            }

            // init file with new name
            tempFile.initWithFile(parentDir);
            tempFile.append(tempName);
            incNumber++;
        }

        // put file name as key to fileNames array
        fileNames[tempName] = true;

        return tempFile;
    }
}
