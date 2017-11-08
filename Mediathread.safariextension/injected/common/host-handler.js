/* eslint-env jquery, node */
/* global MediathreadCollect */
/* exported getImageDimensions */

var getImageDimensions = function(src, callback, onerror) {
    var img = document.createElement('img');
    img.onload = function() {
        callback(img, 'w' + img.width + 'h' + img.height);
    };
    img.onerror = onerror;
    img.src = src;
    return img;
};

var getURLParameters = function(name) {
    return decodeURIComponent((new RegExp(
        '[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(
        location.search) || [null, ''])[1].replace(/\+/g, '%20')) ||
        null;
};

/**
 * The active runner in the hostHandler object is decided via
 * gethosthandler() in collect.js.
 */
var hostHandler = {
    'alexanderstreet.com': {
        find: function(callback) {
            var token = document.documentElement.innerHTML.match(
                /token=([^&"']+)/);
            if (!token) {
                return callback([]);
            }
            $.ajax({
                url: 'http://' + location.hostname +
                    '/video/meta/' + token[1],
                dataType: 'json',
                dataFilter: function(data) {
                    ///removes 'json=' prefix and unescapes content
                    return unescape(String(data).substr(5));
                },
                success: function(json) {
                    var rv = [];
                    function deplus(str, arr) {
                        if (str) {
                            return (arr) ?
                                [str.replace(/\+/g, ' ')] :
                                str.replace(/\+/g, ' ');
                        }
                    }
                    if (json) {
                        if (json.tracks && json.tracks.length > 0 &&
                            json.tracks[0].chunks.length > 0
                        ) {
                            var t = json.tracks[0];
                            // ASSUME: all chunks refer to same
                            // video file?
                            var i = 0;
                            var aspVid = {
                                'primary_type': 'video_rtmp',
                                'sources': {
                                    'title': deplus(t.title),
                                    'video_rtmp': t.chunks[i]
                                        .high.split('?')[0],
                                    'video_rtmp_low': t.chunks[i]
                                        .low.split('?')[0]
                                },
                                'metadata': {},
                                '_jsondump': json
                            };
                            for (var a in t.metadata) {
                                if (t.metadata[a] &&
                                    !/id$/.test(a)
                                ) {
                                    aspVid.metadata[a] = [
                                        deplus(t.metadata[a])];
                                }
                            }
                            rv.push(aspVid);
                        } else if (
                            json.video && json.video.length > 0
                        ) {
                            var v = json.video[0];
                            rv.push({
                                'primary_type': 'video_rtmp',
                                'sources': {
                                    'title': deplus(v.title),
                                    'video_rtmp': v.high
                                        .split('?')[0],
                                    'video_rtmp_low': v.low
                                        .split('?')[0]
                                },
                                'metadata': {
                                    'Copyright': deplus(
                                        v.copyright, 1) ||
                                        undefined,
                                    'Publication Year': deplus(
                                        v.publicationyear, 1) ||
                                        undefined,
                                    'Publisher': deplus(
                                        v.publisher, 1) || undefined
                                },
                                '_jsondump': json
                            });
                        }
                    }
                    return callback(rv);
                },
                error: function() {
                    callback([]);
                }
            });
        }
    },

    'artstor.org': {
        find: function(callback) {
            var foundImages = [];

            // asset detail page
            var $elt = $('meta[name="asset.id"').first();
            var content = $elt.attr('content');

            // selected list page. check this first, as the asset.id
            // content can contain invalid data
            var selectedThumbs = $('.card.card--asset.selected');
            if (selectedThumbs.length > 0) {
                selectedThumbs.each(function() {
                    foundImages.push({
                        'artstorId': $(this).data('id'),
                        'sources': {},
                        'metadata': {},
                        'primary_type': 'image_fpx',
                        'html': this
                    });
                });
            } else if (content) {
                foundImages.push({
                    'artstorId': content,
                    'sources': {},
                    'metadata': {},
                    'primary_type': 'image_fpx',
                    'html': $elt
                });
            } else {
                return callback(
                    [],
                    'Try selecting one or more images by ' +
                        'clicking on a thumbnail.');
            }
            var done = foundImages.length * 2; //# of queries
            var objFinal = function() {
                return callback(foundImages);
            };
            var getArtStorData = function(obj) {
                $.ajax({
                    url: 'https://' + location.hostname +
                        '/api/secure/imagefpx/' +
                        obj.artstorId + '/103/5',
                    dataType: 'json',
                    success: function(fpxdata) {
                        var f = fpxdata[0];
                        obj.sources.fsiviewer =
                            'https://viewer2.artstor.org/' +
                            'erez3/fsi4/fsi.swf';
                        obj.sources.image_fpxid = obj.artstorId;
                        obj.sources['image_fpxid-metadata'] =
                            'w' + f.width + 'h' + f.height;
                        if (--done === 0) {
                            objFinal();
                        }
                    },
                    error: function() {
                        if (--done === 0) {
                            objFinal();
                        }
                    }
                });
                $.ajax({
                    url: 'https://' + location.hostname +
                        '/api/secure/metadata/' +
                        obj.artstorId,
                    dataType: 'json',
                    success: function(metadata) {
                        obj.sources.title = metadata.title;
                        obj.sources.thumb =
                            'https://library.artstor.org' +
                            metadata.imageUrl;
                        var m = metadata.metaData;
                        for (var i = 0; i < m.length; i++) {
                            ///so multiple values are still OK
                            if (m[i].fieldName in obj.metadata) {
                                obj.metadata[m[i].fieldName].push(
                                    m[i].fieldValue);
                            } else {
                                obj.metadata[m[i].fieldName] =
                                    [m[i].fieldValue];
                            }
                        }
                        if (--done === 0) {
                            objFinal();
                        }
                    },
                    error: function() {
                        if (--done === 0) {
                            objFinal();
                        }
                    }
                });
            };
            for (var i = 0; i < foundImages.length; i++) {
                getArtStorData(foundImages[i]);
            }
        }
    },

    // first version of this added by Eddie 10/28/11:
    'classpop.ccnmtl.columbia.edu': {
        find: function(callback) {
            if ($('#currently_playing').length > 0) {

                // the YouTube id is passed up via a postMessage
                // from the inner iframe and displayed in
                // a special 'currently playing' div
                var tmp = $('#currently_playing').html();
                var vMatch =  ['video_id=' + tmp,  tmp];

                // not sure we need this as of right now: to
                // start out with. i'm just using an empty div.
                var videoDomObject = $('<div></div>');

                MediathreadCollect.assethandler.
                    objects_and_embeds.players.youtube.asset(
                        videoDomObject,
                        vMatch, {
                            'window': window,
                            'document': document
                        },
                        0,
                        function(ind, rv) {
                            callback([rv]);
                        });
            } else {
                callback([]);
            }
        },
        decorate: function() {
        }
    },

    'flickr.com': {
        find: function(callback) {
            var apikey = MediathreadCollect.options.flickr_apikey;
            // expected:/photos/<userid>/<imageid>/
            var bits = document.location.pathname.split('/');
            var imageId = bits[3];
            window.imageId = imageId;
            if (typeof imageId === 'undefined') {
                return callback([]);
            }

            if (imageId.length < 1 ||
                imageId.search(/\d{1,12}/) < 0
            ) {
                return callback([]);
            }

            var urlParams = $.param({
                'format': 'json',
                'api_key': apikey,
                'photo_id': imageId,
                'nojsoncallback': 1
            });
            var baseUrl = 'https://api.flickr.com/services/rest/?' + urlParams;

            // See jsonp docs for $.getJSON:
            // http://api.jquery.com/jquery.getjson/
            $.getJSON(
                baseUrl + '&method=flickr.photos.getInfo',
                function(getInfoData) {
                    if (typeof getInfoData.photo === 'undefined' ||
                        getInfoData.photo.media === 'video'
                    ) {
                        /*video is unsupported*/
                        return callback([]);
                    }
                    $.getJSON(
                        baseUrl + '&method=flickr.photos.getSizes',
                        function(getSizesData) {
                            var w = 0;
                            var h = 0;
                            var imgUrl = '';
                            var thumbUrl = '';
                            $.each(
                                getSizesData.sizes.size,
                                function(i, item) {
                                    if (parseInt(item.width) > w) {
                                        w = parseInt(item.width);
                                        h = item.height;
                                        imgUrl = item.source;
                                    }
                                    if (item.label === 'Small') {
                                        thumbUrl = item.source;
                                    }
                                }
                            );
                            var img;
                            $('img').each(function() {
                                if (RegExp('http://farm.*' + imageId)
                                    .test(this.src)) {
                                    img = this;
                                }
                            });
                            // URL format:
                            // http://farm{farm-id}.static.flickr.com/{server-id}/
                            //     {id}_{secret}_[mtsb].jpg
                            var sources = {
                                'url': getInfoData.photo.urls.
                                    url[0]._content,
                                'title': getInfoData.photo.title.
                                    _content,
                                'thumb': thumbUrl,
                                'image': imgUrl,
                                // owner's photostream
                                'metadata-photostream':
                                'https://www.flickr.com/photos/' +
                                    getInfoData.photo.owner.nsid,
                                'image-metadata': 'w' + w + 'h' + h,
                                'metadata-owner':
                                getInfoData.photo.owner.realname ||
                                    undefined
                            };

                            return callback([{
                                html: img,
                                primary_type: 'image',
                                sources: sources
                            }]);
                        });
                });/*end $.ajax*/
        },
        decorate: function() {
        }
    },

    'mirc.sc.edu': {
        find: function(callback) {
            var fpRv;
            if ($('a.usc-flowplayer > :first').is('img')) {
                //This works inconsistently...so I'm going to put
                // up a warning as a workaround
                // var fp = $('.usc-flowplayer').flowplayer(0);
                // fp.load(); //bring up the flowplayer 'object'
                alert('Please start playing the video you ' +
                      'would like to collect.');
                return false;
            }

            var fpId = $('a.usc-flowplayer > :first ')
                .attr('id');
            var video = document.getElementById(fpId);
            if (video && video !== null) {
                // flowplayer version
                var vMatch = MediathreadCollect.assethandler.
                    objects_and_embeds.players.
                    flowplayer3.match(video);
                if (vMatch && vMatch !== null) {
                    fpRv = MediathreadCollect.assethandler.
                        objects_and_embeds.players.
                        flowplayer3.asset(
                            video,
                            vMatch, {
                                'window': window,
                                'document': document
                            });
                }
            }

            fpRv.metadata = {};
            var i;

            try {
                fpRv.metadata.title = fpRv.sources.title = [
                    $('#edit-title--2').text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.title = '';
            }
            try {
                fpRv.metadata.produced = [
                    $('#edit-production-date').text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.produced = '';
            }
            try {
                fpRv.metadata.description = [
                    $('#edit-description--2').text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.description = '';
            }
            try {
                fpRv.metadata.copyright = [
                    $('#edit-credits-preserved-by-rights')
                        .text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.copyright = '';
            }
            try {
                fpRv.metadata.temporal = [
                    $('#edit-tempo--2').text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.temporal = '';
            }
            try {
                fpRv.metadata.geographical = [
                    $('#edit-geo').text()
                        .split('\n')[2].trim()];
            } catch (e) {
                fpRv.metadata.geographical = '';
            }
            try {
                var tags = $('#edit-subjects').html()
                    .replace(/<label(.*)<\/label>/g, '')
                    .split(/(<br>)+/);
                for (i = tags.length - 1; i >= 0; i--) {
                    if (tags[i].trim() === '<br>' ||
                        tags[i].trim() === ''
                    ) {
                        tags.splice(i, 1);
                    } else {
                        tags[i] = tags[i].trim();
                    }
                }
                fpRv.metadata.subject = tags;
            } catch (e) {
                fpRv.metadata.tags = [];
            }
            try {
                var credits = $('#edit-credits').text()
                    .split('Donor')[0].split('Credits')[1]
                    .split('.');
                for (i = credits.length - 1; i >= 0; i--) {
                    if (credits[i].trim() === '<br>' ||
                        credits[i].trim() === ''
                    ) {
                        credits.splice(i, 1);
                    } else {
                        credits[i] = credits[i].trim();
                    }
                }
                fpRv.metadata.credits = credits;
            } catch (e) {
                fpRv.metadata.credits = [];
            }

            fpRv.sources.thumb = 'http://mirc.sc.edu/sites/all/' +
                'modules/usc_mirc/images/playbuttonblack.jpg';

            return callback([fpRv]);
        },
        decorate: function() {
        }
    },

    'wikipedia.org': {
        find: function(callback) {
            var returnArray = [];
            var patt = /data/;// regex pattern for data url
            $('img').each(function(i) {
                var obj = {};
                var source = $(this).attr('src');
                if (source.split('//').length < 3 &&
                    !patt.test(source)
                ) {
                    source = 'https://' + source.split('//')[1];
                    source = source.split('=')[0];
                    obj.html = this;
                    obj.sources = {};
                    obj.sources.image =  source;
                    obj.sources.title = $(this).attr('alt');
                    obj.sources.url = window.location.href;
                    obj.primary_type = 'image';
                    obj.sources.thumb = source;
                    obj.sources['image-metadata'] = 'w' +
                        (this.width * 2) + 'h' + (this.height * 2);
                    returnArray[i] = obj;
                }
            }); //end each
            return callback(returnArray);
        }
    },

    'googleartproject.com': {
        find: function(callback) {
            var returnArray = [];
            var patt = /data/;// regex pattern for data url
            $('img').each(function(i) {
                var obj = {};
                var source = $(this).attr('src');
                if (source.split('//').length < 3 &&
                    !patt.test(source)
                ) {
                    source = 'http://' + source.split('//')[1];
                    source = source.split('=')[0];
                    obj.html = this;
                    obj.sources = {};
                    obj.sources.image =  source;
                    obj.sources.title = $(this).attr('alt');
                    obj.sources.url = window.location.href;
                    obj.primary_type = 'image';
                    obj.sources.thumb = source;
                    obj.sources['image-metadata'] = 'w' +
                        (this.width * 2) + 'h' + (this.height * 2);
                    returnArray[i] = obj;
                }
            });
            return callback(returnArray);
        }
    },

    'vimeo.com': {
        find: function(callback) {
            var videos = $('.video-wrapper');
            if (videos.length < 1) {
                var message = 'This Vimeo page does not contain ' +
                    'videos accessible to the extension. Try ' +
                    'clicking into a single video page.';
                alert(message);
                callback([]); // no items found
            } else {
                // parse vimeo id out of the fallback url
                var $wrapper = $(videos[0]);
                var $player = $wrapper.closest('.player');
                var vimeoId = $player.data('clip-id') || $player.attr('id');

                MediathreadCollect.assethandler.objects_and_embeds
                    .players.moogaloop.asset(
                        $('.video-wrapper video').first(),
                        vimeoId, {
                            'window': window,
                            'document': document
                        },
                        0,
                        function(ind, rv) {
                            callback([rv]);
                        });
            }
        },
        decorate: function() {
        }
    },

    'youtube.com': {
        find: function(callback) {
            var video = document.getElementById('movie_player');
            if (video && video !== null) {
                var vMatch = video.getAttribute('flashvars');
                if (vMatch) {
                    vMatch = vMatch.match(/video_id=([^&]*)/);
                } else { //mostly for <OBJECT>
                    vMatch = document.location.search
                        .match(/[?&]v=([^&]*)/);
                }
                if (vMatch === null && getURLParameters('v')) {
                    var vid = getURLParameters('v');
                    vMatch = ['video_id=' + vid, vid];
                }

                MediathreadCollect.assethandler.objects_and_embeds
                    .players.youtube.asset(
                        video,
                        vMatch, {
                            'window': window,
                            'document': document
                        },
                        0,
                        function(ind, rv) {
                            callback([rv]);
                        });
            } else if (
                document.getElementsByTagName('video').length > 0
            ) {
                video = document.getElementsByTagName('video')[0];
                var videoId = $(video).attr('data-youtube-id');
                var fauxMatch = [null, videoId];
                MediathreadCollect.assethandler.objects_and_embeds
                    .players.youtube.asset(
                        video,
                        fauxMatch, {
                            'window': window,
                            'document': document
                        },
                        0,
                        function(ind, rv) {
                            callback([rv]);
                        });
            } else {
                callback([]);
            }
        },
        decorate: function() {
        }
    }
};

if (typeof module !== 'undefined') {
    module.exports = {
        hostHandler: hostHandler,
        getImageDimensions: getImageDimensions
    };
}
