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

    onLoad: function(){
    
        //populate windows title for "remove text"
        var windowTitle = window.opener.document.title;
        
        if (windowTitle != null && windowTitle != "") {
        
            var removeTextMenulist = document.getElementById("removeTextMenulist");
            
            var separatorRE = /\t|-|_/g;
            var result = separatorRE.exec(windowTitle);
            while (result != null) {
                var text = windowTitle.substring(result.index);
                var item = removeTextMenulist.appendItem(text);
                item.setAttribute("crop", "none");
                result = separatorRE.exec(windowTitle);
            }
        }
        
        //init RemoveText Elements
        this.enableOrDisableRemoveTextElements(ImagePicker.Settings.isCreatedFolderByTitle());
    },
    
    addRemoveText: function(){
        var removeTextMenulist = document.getElementById("removeTextMenulist");
        var text = removeTextMenulist.value;
        
        var removeTextTB = document.getElementById("removeTextTB");
        
        removeTextTB.value = text + "\n" + removeTextTB.value;
        removeTextTB.click(); //fix un-saved issue
    },
    
    selectCreatedFolderByTitle: function(aEvent){
    
        var createdFolderByTitleCheckBox = aEvent.target;
        this.enableOrDisableRemoveTextElements(createdFolderByTitleCheckBox.checked);
    },
    
    enableOrDisableRemoveTextElements: function(enable){
    
        var removeTextMenulist = document.getElementById("removeTextMenulist");
        var removeTextTB = document.getElementById("removeTextTB");
        var removeTextBtn = document.getElementById("removeTextBtn");
        
        if (enable) {
            removeTextMenulist.disabled = false;
            removeTextTB.disabled = false;
            removeTextBtn.disabled = false;
        } else {
            removeTextMenulist.disabled = true;
            removeTextTB.disabled = true;
            removeTextBtn.disabled = true;
        }
    },
    
    restoreAll: function(){

        //restore
        var preferences = document.getElementById("ipPreferences");
        var children = preferences.childNodes;
        for (var i = 0; i < children.length; i++) {
            if(children[i].hasUserValue){
                children[i].reset(); // preference.reset()
            }
        }
        
        //Restore RemoveText Elements
        this.enableOrDisableRemoveTextElements(true);
    }
}
