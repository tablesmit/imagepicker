
/**
 * ImagePickerChrome namespace.
 */
if ("undefined" == typeof(ImagePickerChrome)) {
    var ImagePickerChrome = {
        initOnFirstRun: function(){
            var extensionUUID = "ImagePicker@topolog.org";
            var extension = Application.extensions.get(extensionUUID);
            if (extension.firstRun) {
            
                var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
                
                var check = {
                    value: true
                }; //default the checkbox to true  
                var result = prompts.confirmCheck(null, "First run ImagePicker", "ImagePicker have been installed", "Add image picker button to toolbar now?", check);
                
                // add button on first run.
                if (rv == 0) {
                    try {
                        var myButtonId = "image-pick-button"; // ID of button to add
                        var navBar = document.getElementById("nav-bar");
                        navbar.insertItem (myButtonId, null, null, false);

                        var curSet = navBar.getAttribute(navBar.hasAttribute("currentset") ? "currentset" : "defaultset");
                        if (curSet.indexOf(myButtonId) == -1) {
                            var newSet = curSet + "," + myButtonId;
                            navBar.setAttribute("currentset", newSet);
                            navBar.currentSet = newSet;
                            document.persist(navBar.id, "currentset");
                            
                            try {
                                BrowserToolboxCustomizeDone(true);
                            } catch (e) {
                            }
                        }
                    } catch (e) {
                    }
                }
            }// end if extension.firstRun
        }
    };
    
    (function(){
        window.addEventListener("load", this.initOnFirstRun(), false);
    }).apply(ImagePickerChrome);
};
