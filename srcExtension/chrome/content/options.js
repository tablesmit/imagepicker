/** **************** Options Class ******************** */
const Cc = Components.classes;
const Ci = Components.interfaces;
Components.utils.import("resource://imagepicker/common.js");
Components.utils.import("resource://imagepicker/settings.js");

/**
 * JavaScript for Options windonws
 *
 * @namespace ImagePickerChrome
 * @class ImagePickerChrome.Options
 * @constructor
 */
ImagePickerChrome.Options = {

    onLoad : function() {
        ImagePicker.Logger.debug("Call onLoad()");

        // Handle save single image option
        var savedSingleImageOption = ImagePicker.Settings.getSavedSingleImageToOption();
        ImagePicker.Logger.debug("savedSingleImageOption =" + savedSingleImageOption);
        var isAskMeSelected = (savedSingleImageOption == "askMe");
        if (isAskMeSelected) {
            var askMeRadio = document.getElementById("askMeRadio");
            askMeRadio.click();
        } else {
            var ipFolderRadio = document.getElementById("ipFolderRadio");
            ipFolderRadio.click();
        }

        // populate windows title for "remove text"
        var removeTextMenulist = document.getElementById("removeTextMenulist");

        var windowTitle = window.opener.document.title;
        var removeTexts = this._splitTitle(windowTitle);
        for ( var i = 0; i < removeTexts.length; i++) {
            var item = removeTextMenulist.appendItem(removeTexts[i]);
            item.setAttribute("crop", "none");
        }

        // init RemoveText Elements
        this.enableOrDisableRemoveTextElements(ImagePicker.Settings.isCreatedFolderByTitle());

        //Disable download manager feature since bug https://bugzilla.mozilla.org/show_bug.cgi?id=844566
        if(ImagePicker.Settings.hasWinTaskbar()){
            var downloadManagerPrefCheckbox = document.getElementById("downloadManagerPrefCheckbox");
            downloadManagerPrefCheckbox.disabled = true;
        }
    },

    _splitTitle : function(windowTitle) {

        var results = new Array();

        if (windowTitle != null && windowTitle != "") {

            var headTexts = new Array();
            var tailTexts = new Array();

            var separatorRE = /\t|-|_|\|/g;
            var result = separatorRE.exec(windowTitle);
            while (result != null) {
                var hText = windowTitle.substring(0, separatorRE.lastIndex);
                headTexts.push(hText);

                var tText = windowTitle.substring(result.index);
                tailTexts.push(tText);

                result = separatorRE.exec(windowTitle);
            }

            results = headTexts.concat(tailTexts);
        }

        return results;
    },

    addRemoveText : function() {
        var removeTextMenulist = document.getElementById("removeTextMenulist");
        var text = removeTextMenulist.value;

        var removeTextTB = document.getElementById("removeTextTB");

        removeTextTB.value = text + "\n" + removeTextTB.value;
        removeTextTB.click(); // fix un-saved issue
    },

    selectCreatedFolderByTitle : function(aEvent) {

        var createdFolderByTitleCheckBox = aEvent.target;
        this.enableOrDisableRemoveTextElements(createdFolderByTitleCheckBox.checked);
    },

    enableOrDisableRemoveTextElements : function(enable) {

        var showSubfolderNameConfirmationPopupCheckbox = document
                .getElementById("showSubfolderNameConfirmationPopupCheckbox");
        var removeTextMenulist = document.getElementById("removeTextMenulist");
        var removeTextTB = document.getElementById("removeTextTB");
        var removeTextBtn = document.getElementById("removeTextBtn");

        if (enable) {
            showSubfolderNameConfirmationPopupCheckbox.disabled = false;
            removeTextMenulist.disabled = false;
            removeTextTB.disabled = false;
            removeTextBtn.disabled = false;
        } else {
            showSubfolderNameConfirmationPopupCheckbox.disabled = true;
            showSubfolderNameConfirmationPopupCheckbox.checked = false;
            removeTextMenulist.disabled = true;
            removeTextTB.disabled = true;
            removeTextBtn.disabled = true;
        }
    },

    restoreAll : function() {

        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
        var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                       .getService(Components.interfaces.nsIVersionComparator);
        var isUnderV6 = versionChecker.compare(appInfo.version, "6") < 0;

        // restore
        var preferences = document.getElementsByTagName("preference");

        for ( var i = 0; i < preferences.length; i++) {
            ImagePicker.Logger.info("preference:" + preferences[i].id + ", hasUserValue = "
                    + preferences[i].hasUserValue);
            if(!isUnderV6 || preferences[i].hasUserValue){
                preferences[i].reset(); // preference.reset()
            }
        }

        // Restore RemoveText Elements
        this.enableOrDisableRemoveTextElements(true);
    },

    onDialogAccept : function() {

        // Handle save single image option
        var askMeRadio = document.getElementById("askMeRadio");
        ImagePicker.Logger.debug("askMeRadio.selected =" + askMeRadio.selected);
        if(askMeRadio.selected == true){
            ImagePicker.Settings.setSavedSingleImageToOption("askMe");
        } else {
            ImagePicker.Settings.setSavedSingleImageToOption("ipFolder");
        }

        ImagePicker.Logger.debug("Installing button...");
        var buttonNames = [ "ipbutton-simple", "ipbutton-all", "ipbutton-left", "ipbutton-right", "ipbuttons" ];
        buttonNames.forEach(function(buttonName) {
            var buttonId = buttonName + "-toolbar";
            var isShow = ImagePicker.Settings.isShowOnToolbar(buttonName);
            ImagePickerChrome.installButton("nav-bar", buttonId, isShow);
            ImagePicker.Logger.debug("Installed button: " + buttonId + " to toolbar, isShow=" + isShow);
        });
    },

    onDialogClose : function() {
        var prefWindow = document.getElementById("imagepicker-prefs");
        ImagePicker.Logger.debug("onDialogClose, prefWindow=" + prefWindow);
        if(prefWindow.instantApply){
            ImagePicker.Logger.debug("Call onDialogAccept() when instantApply is on.");
            this.onDialogAccept();
        }
    },

    /**
     * browse directory
     *
     * @method browseDir
     */
    browseDir : function() {

        var stringsBundle = document.getElementById("ip-string-bundle");
        var title = stringsBundle.getString('selectFloderTitle');

        var nsIFilePicker = Ci.nsIFilePicker;
        var filePicker = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
        filePicker.init(window, title, nsIFilePicker.modeGetFolder);

        // locate current directory
        var pathTextBox = document.getElementById("ipFolderTextbox");
        var destPath = pathTextBox.value;
        var dest = ImagePicker.FileUtils.toDirectory(destPath);
        if (dest) {
            filePicker.displayDirectory = dest;
        }
        var result = filePicker.show();
        if (result == nsIFilePicker.returnOK) {
            pathTextBox.value = filePicker.file.path;
            pathTextBox.click(); // fix un-saved issue
        }
    }
}
