var itemArray = safari.extension.toolbarItems;

var buttonClicked = function(event) {
    if (event.command === 'mediathread') {
        // Send a "collect" message to the content script
        var hostUrl = safari.extension.settings.hostUrl;
        safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(
            'mediathread-collect', hostUrl);
    }
};

safari.application.addEventListener('command', buttonClicked, false);
