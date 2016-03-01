/**
 * collectPopupClickHandler
 *
 * This creates a popup in the browser using window.open(). Because the
 * origin of this new window could be different than the activeTab, this
 * doesn't work in Firefox at the moment, only Chrome and Safari.
 *
 * Params:
 * form - an html element
 * me - the caller's 'this'
 * $buttonAsset - the clicked button
 * hostUrl - the Mediathread url
 */
var collectPopupClickHandler = function(form, me, $buttonAsset, hostUrl) {
    /* A pop up window solution... */
    var bucketWrap = $('<div id="bucket-wrap"/>');
    var bucket = $(form).clone();
    $('input.analyze', bucket).remove();
    $('input.cont', bucket).remove();
    var bucketWindow = window.open(
        '',
        'Mediathread',
        'resizable,scrollbars=no,status=1,href=no,' +
            'location=no,menubar=no,width=650,' +
            'height=350,top=200,left=300'
    );
    if ($('.sherd-image',bucketWindow.document).length > 0) {
        // make sure the bucket dies not already exists, if so
        // remove it.
        $('#bucket-wrap',bucketWindow.document).remove();
    }
    bucket.appendTo(bucketWrap);
    $(bucket).append(
        '<input type="hidden" value="cont" name="button" />');
    $(bucket).append(
        '<br/><input id="submit-input" class="btn-primary" ' +
            'type="button" value="Save" />');
    $(bucket).append(
        '<input id="submit-cancel" class="btn-primary" ' +
            'type="button" value="Cancel" />');
    $(bucket).append(
        '<br/><span class ="help-text">Clicking "Save" ' +
            'will add this item to your Mediathread ' +
            'collection and return you to collecting.<span/>');
    $(bucketWrap).prepend(
        '<h2>Add this item to your Mediathread ' +
            'collection</h2>');

    $('body', bucketWindow.document).append(bucketWrap);

    $('#submit-cancel', bucketWindow.document).click(
        function() {
            bucketWindow.close();
        });

    $('#submit-input', bucketWindow.document).click(function() {
        $(this).closest('form').submit();
        var sherdOverlay = $('.sherd-window-inner', window.document);
        var alertSavedMarginLeft =
            ($('.sherd-window-inner', window.document)
             .width() / 2) - (535 * 0.5);
        var alertSavedMarginTop =
            ($(window).height() / 2) - 100;
        var collectionUrl = hostUrl.replace(/\/save\/$/, '') + '/asset/';
        var alertSaved = $(
            '<div class="alert-saved">' +
                '<span style="font-weight:bold">' +
                'Success.</span> Your item has been ' +
                'successfully added to your ' +
                '<a href="' + collectionUrl +
                '">Mediathread collection</a>.</div>');
        var alertClose = $(
            '<div class="alert-close">X</div>');

        alertSaved.css({
            'top': alertSavedMarginTop + 'px',
            'left': alertSavedMarginLeft + 'px'
        });
        alertClose.click(function() {
            $(this).parent().remove();
        });
        alertSaved.prepend(alertClose);
        sherdOverlay.append(alertSaved);
        alertSaved.fadeIn(500, function() {
            var btn = $buttonAsset;
            btn.attr('value', 'Collected');
            btn.off();
            btn.css({
                background: '#999',
                color: '#333'
            });
        });
    });// end #submit-input' click

    // style and add listeners onto the popup window
    //force the title of the popup
    bucketWindow.document.title = 'Mediathread';
    var body = $('body',bucketWindow.document);
    var title = body.find('.sherd-form-title');
    var submitBtn = body.find('.btn-primary');
    var header = body.find('#bucket-wrap h2');
    var helpText = body.find('.help-text');

    bucket.css({
        'background': '#fff',
        'text-align': 'center'
    });
    header.css({
        'font-family': 'arial',
        'font-weight': '100',
        'font-size': '18px',
        'color': '#323232',
        'text-align': 'center'
    });

    title.focus();
    title.css({
        color: '#000',
        width: '350px',
        height: '35px',
        fontSize: '14px',
        margin: '10px 0',
        '-moz-appearance': 'none',
        '-webkit-appearance': 'none'
    });
    submitBtn.css({
        'font-size': '14px',
        'font-weight': 'normal',
        'color': '#2f2f2f',
        'padding': '5px 15px',
        'margin': '0px 12px 12px',
        'border': 'solid 1px',
        'border-radius': '4px',
        '-moz-border-radius': '4px',
        '-webkit-border-radius': '4px',
        'background-color': '#efefef',
        '*background-color': '#efefef',
        'background-image': [
            '-moz-linear-gradient(top, #fcfcfc, #efefef)',
            '-webkit-gradient(linear, 0 0, 0 100%, ' +
                'from(#fcfcfc), to(#efefef))',
            '-webkit-linear-gradient(top, #fcfcfc, #efefef)',
            '-o-linear-gradient(top, #fcfcfc, #efefef)',
            'linear-gradient(to bottom, #fcfcfc, #efefef)'
        ],
        'background-repeat': 'repeat-x',
        'border-color': [
            '#0044cc #0044cc #002a80',
            'rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) ' +
                'rgba(0, 0, 0, 0.25)'
        ],
        'cursor': 'pointer',
        'display': 'inline-block'
    });
    submitBtn.hover(function() {
        $(this).css({
            'background-image': [
                '-moz-linear-gradient(top, #efefef, #fcfcfc)',
                '-webkit-gradient(linear, 0 0, 0 100%, ' +
                    'from(#efefef), to(#fcfcfc))',
                '-webkit-linear-gradient(top, #efefef, ' +
                    '#fcfcfc)',
                '-o-linear-gradient(top, #efefef, #fcfcfc)',
                'linear-gradient(to bottom, #efefef, #fcfcfc)'
            ]
        });
    }, function() {
        $(this).css({
            'background-image': [
                '-moz-linear-gradient(top, #fcfcfc, #efefef)',
                '-webkit-gradient(linear, 0 0, 0 100%, ' +
                    'from(#fcfcfc), to(#efefef))',
                '-webkit-linear-gradient(top, #fcfcfc, ' +
                    '#efefef)',
                '-o-linear-gradient(top, #fcfcfc, #efefef)',
                'linear-gradient(to bottom, #fcfcfc, #efefef)'
            ]
        });
    });

    helpText.css({
        'color': '#666',
        'font-size': '12px',
        'font-family': 'arial',
    });
};
