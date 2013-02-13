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
        // restore
        var preferences = document.getElementsByTagName("preference");

        for ( var i = 0; i < preferences.length; i++) {
            ImagePicker.Logger.info("preference:" + preferences[i].id + ", hasUserValue = "
                    + preferences[i].hasUserValue);
            preferences[i].reset(); // preference.reset()
        }

        // Restore RemoveText Elements
        this.enableOrDisableRemoveTextElements(true);
    },

    onDialogAccept : function() {
        ImagePicker.Logger.info("Installing button...");

        var buttonNames = [ "ipbutton-simple", "ipbutton-all", "ipbutton-left", "ipbutton-right", "ipbuttons" ];
        buttonNames.forEach(function(buttonName) {
            var buttonId = buttonName + "-toolbar";
            var isShow = ImagePicker.Settings.isShowOnToolbar(buttonName);
            ImagePickerChrome.installButton("nav-bar", buttonId, isShow);
            ImagePicker.Logger.debug("Installed button: " + buttonId + " to toolbar, isShow=" + isShow);
        });
    }
}
