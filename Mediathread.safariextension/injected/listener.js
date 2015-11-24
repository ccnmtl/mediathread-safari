var startCollect = function() {
    $.ajax({
        url: MediathreadCollectOptions.user_url,
        dataType: 'json',
        crossDomain: true,
        cache: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(d) {
            if ('flickr_apikey' in d) {
                MediathreadCollect.options.flickr_apikey = d.flickr_apikey;
            }
            if ('youtube_apikey' in d) {
                MediathreadCollect.options.youtube_apikey = d.youtube_apikey;
            }

            if (d.logged_in === true && d.course_selected === true) {
                // Start the main plugin code
                MediathreadCollect.runners.jump(
                    MediathreadCollectOptions.host_url, true);
            } else if (d.logged_in === true && d.course_selected === false) {
                alert(
                    'You\'re logged in to mediathread at ' +
                        MediathreadCollectOptions.host_url +
                        ', now select a course to use the browser extension.');
            } else {
                alert(
                    'Log in to mediathread (' +
                        MediathreadCollectOptions.host_url +
                        ') and select a course!');
            }
        },
        error: function(d) {
            console.error('#', d);
        }
    });
};

/**
 * Handle a message sent from the extension's background script.
 */
var handleMessage = function(msgEvent) {
    var messageName = msgEvent.name;
    // msgEvent.message is the message data, but it's
    // not being used.

    if (messageName === 'mediathread-collect') {
        startCollect();
    }
};

safari.self.addEventListener('message', handleMessage, false);
