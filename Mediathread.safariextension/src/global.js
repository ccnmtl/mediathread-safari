var itemArray = safari.extension.toolbarItems;

var buttonClicked = function(event) {
    if (event.command === 'mediathread') {
        // Send a "collect" message to the content script
        safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(
            'mediathread-collect', null);
    }
};

safari.application.addEventListener('command', buttonClicked, false);
