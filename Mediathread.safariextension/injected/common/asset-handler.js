var assetHandler = {
    objects_and_embeds: {
        players: {
            'realplayer': {
                /*NOTE: realplayer plugin works in non-IE only WITH <embed>
                  whereas in IE it only works with <object>
                  efforts to GetPosition() need to take this into
                  consideration
                */
                match: function(eo) {
                    return (
                        ('object' == eo.tagName.toLowerCase()) ?
                            (eo.classid ==
                             'clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA' &&
                             'obj') || null :
                            (String(eo.type) ==
                             'audio/x-pn-realaudio-plugin' && 'emb') ||
                            null);
                },
                asset: function(emb, match, context, index,
                                optionalCallback) {
                    var abs = MediathreadCollect.absolute_url;
                    var rv = {
                        html: emb,
                        primary_type: 'realplayer',
                        sources: {}
                    };
                    if (match === 'emb') {
                        rv.sources.realplayer = abs(
                            emb.src, context.document);
                    } else if (match === 'obj') {
                        var src = $('param[name=src],param[name=SRC]',emb);
                        if (src.length) {
                            rv.sources.realplayer = abs(src.get(0).value,
                                                        context.document);
                        } else {
                            return rv;//FAIL
                        }
                    }

                    if (typeof emb.DoPlay != 'undefined') {
                        rv.sources['realplayer-metadata'] = 'w' + (
                            emb.GetClipWidth() || emb.offsetWidth
                        ) + 'h' + (emb.GetClipHeight() || emb.offsetHeight);

                        rv.sources.title = emb.GetTitle() || undefined;
                        if (rv.sources.title) {//let's try for the rest
                            rv.metadata = {
                                'author': [emb.GetAuthor() || undefined],
                                'copyright': [emb.GetCopyright() ||
                                              undefined]
                            };
                        }
                    } else {
                        rv.sources['realplayer-metadata'] =
                            'w' + emb.width + 'h' + emb.height;
                    }

                    return rv;
                }
            },/*end realplayer embeds*/
            'youtube': {
                match: function(emb) {
                    ///ONLY <EMBED>
                    return String(emb.src).match(
                            /^http:\/\/www.youtube.com\/v\/([\w\-]*)/);
                },
                asset: function(emb, match, context,
                                index, optionalCallback) {
                    var apikey = MediathreadCollect.options.youtube_apikey;

                    var VIDEO_ID;
                    if (match && match.length > 0) {
                        VIDEO_ID = match[1]; //e.g. 'LPHEvaNjdhw';
                    } else {
                        return {};
                    }
                    var rv = {
                        html: emb,
                        wait: true,
                        primary_type: 'youtube',
                        label: 'youtube video',
                        sources: {
                            'youtube': 'http://www.youtube.com/v/' +
                                VIDEO_ID + '?enablejsapi=1&fs=1',
                            'gapi': 'https://www.googleapis.com/' +
                                'youtube/v3/videos?id=' + VIDEO_ID
                        }};
                    if (emb.getCurrentTime) {
                        if (emb.getCurrentTime() > 0 &&
                            emb.getCurrentTime() < emb.getDuration()
                           ) {
                            rv.hash = 'start=' + emb.getCurrentTime();
                        }
                    }
                    var ytCallback = function(ytData, b, c) {
                        if (
                            $.type(ytData.items) === 'array' &&
                                ytData.items.length > 0
                        ) {
                            var item = ytData.items[0].snippet;
                            rv.sources.title = item.title;

                            var th = item.thumbnails.default;
                            rv.sources.thumb = th.url;
                            rv.sources['thumb-metadata'] = 'w' + th.width +
                                'h' + th.height;

                            rv.metadata = {
                                'Description': [item.description],
                                'Channel': [item.channelTitle],
                                'Published': [item.publishedAt]
                            };
                            rv.disabled = !ytData.items[0].status
                                .embeddable;
                        }
                        optionalCallback(index, rv);
                    };

                    // url params as specified here:
                    // https://developers.google.com/youtube/v3/docs/videos/list#try-it
                    var urlParams = {
                        key: apikey,
                        part: 'snippet,status'
                    };

                    // gapi will be a string that includes the id, like
                    // https://www.googleapis.com/youtube/v3/videos?id=Tu42VMSZV8o
                    var url = rv.sources.gapi + '&' + $.param(urlParams);

                    $.ajax({
                        url: url,
                        dataType: 'json',
                        success: ytCallback,
                        error: function() {
                            optionalCallback(index);
                        }
                    });
                    // YT is declaring maximum z-index for Safari and it
                    // cannot be overriden via CSS
                    // we need to redeclare it
                    $('#masthead-positioner').css('z-index', '999');
                    return rv;
                }
            },/*end youtube embeds*/
            'jwplayer5': {
                match: function(obj) {
                    return ((typeof obj.getPlaylist === 'function' &&
                             typeof obj.sendEvent === 'function') || null);
                },
                asset: function(obj, match, context) {
                    var item;
                    pl = obj.getPlaylist();
                    switch (pl.length) {
                    case 0:
                        return {};
                    case 1:
                        item = pl[0];
                        break;
                    default:
                        //or should we just show all options?
                        if (obj.jwGetPlaylistIndex) {
                            item = pl[obj.jwGetPlaylistIndex()];
                        } else {
                            return {};
                        }
                    }
                    var rv = {
                        'html':
                        obj,
                        'primary_type': 'video',
                        'sources': {}
                    };
                    var c = obj.getConfig();
                    var pcfg = obj.getPluginConfig('http');
                    if (item.type == 'rtmp') {
                        // ensure that mp4 rtmp files contain the
                        // needed mp4: prefix so that they will play
                        // properly in flowplayer;
                        // JW Player allows you to omit this prefix,
                        // but Flowplayer does not
                        //
                        // if item.file ends with mp4,
                        // and item.file does not already begin with mp4:,
                        // then append mp4: to item.file
                        if ((/mp4$/.test(item.file)) &&
                            !(/^mp4:/.test(item.file))) {
                            item.file = 'mp4:' + item.file;
                        }

                        rv.sources.video_rtmp = item.streamer + '//' +
                            item.file;
                        rv.primary_type = 'video_rtmp';
                    } else {
                        var url = item.streamer + item.file;
                        if (pcfg.startparam) {
                            rv.primary_type = 'video_pseudo';
                            url += '?' + pcfg.startparam + '=${start}';
                        }
                        rv.sources[rv.primary_type] = url;
                    }
                    rv.sources[rv.primary_type + '-metadata'] =
                        'w' + c.width + 'h' + c.height;
                    if (item.image) {
                        rv.sources.thumb =
                            MediathreadCollect.absolute_url(
                                item.image,
                                context.document);
                    }
                    if (item.title) {
                        rv.sources.title = item.title;
                    } else {
                        rv.sources.title = document.title;
                    }
                    return rv;
                }
            },
            'flowplayer3': {
                match: function(obj) {
                    if (obj.data) {
                        return String(obj.data)
                            .match(/flowplayer[\.\-\w]+3[.\d]+\.swf/);
                    } else {//IE7 ?+
                        var movie = MediathreadCollect.find_by_attr(
                            $, 'param', 'name', 'movie', obj);
                        return (
                            (movie.length) ?
                                String(movie.get(0).value)
                                .match(/flowplayer-3[\.\d]+\.swf/) :
                                null);
                    }
                },
                asset: function(obj, match, context) {
                    /* TODO: 1. support audio
                     */
                    var $f = (context.window.$f && context.window.$f(
                        obj.parentNode));

                    //config=
                    var cfg = (($f) ? $f.getConfig() :
                               $.parseJSON($('param[name=flashvars]')
                                           .get(0).value.substr(7)));

                    //getClip() works if someone's already clicked Play
                    var clip = ($f && $f.getClip()) || cfg.clip ||
                        cfg.playlist[0];
                    var time = ($f && $f.getTime()) || 0;
                    return this.queryasset(
                        context,
                        obj,
                        cfg,
                        clip,
                        time,
                        ($f && $f.id() || undefined));
                },
                queryasset: function(context, obj, cfg,
                                     clip, time, refId) {
                    var sources = {};
                    var type = 'video';
                    var abs = MediathreadCollect.absolute_url;
                    if (cfg.playlist &&
                        (!clip.url || cfg.playlist.length > 1)
                       ) {
                        for (var i = 0; i < cfg.playlist.length; i++) {
                            var p = cfg.playlist[i];
                            var url =  abs(
                                ((typeof p === 'string') ? p : p.url),
                                context.document,p.baseUrl);
                            if (/\.(jpg|jpeg|png|gif)/.test(url)) {
                                //redundant urls wasteful, but useful
                                sources.thumb = url;
                                sources.poster = url;
                                continue;
                            } else if (!clip.type || clip.type == 'image') {
                                if (/\.flv$/.test(url)) {
                                    clip = p;
                                    type = 'flv';
                                    break;
                                } else if (/\.mp4$/.test(url)) {
                                    clip = p;
                                    type = 'mp4';
                                    break;
                                }
                            }
                        }
                    }
                    var provider = (clip.provider &&
                                    cfg.plugins[clip.provider]) || false;
                    function getProvider(c) {
                        if (provider) {
                            var plugin = provider.url;
                            if (/pseudostreaming/.test(plugin)) {
                                return '_pseudo';
                            } else if (/rtmp/.test(plugin)) {
                                return '_rtmp';
                            }
                        }
                        return '';
                    }
                    var primaryType = type + getProvider(clip);
                    sources[primaryType] = clip.completeUrl ||
                        clip.originalUrl || clip.resolvedUrl ||
                        clip.url || clip;
                    if (provider && provider.netConnectionUrl) {
                        sources[primaryType] = provider.netConnectionUrl +
                            sources[primaryType];
                    }
                    // TODO:is context.document the right
                    // relative URL instead of the SWF?
                    sources[primaryType] = abs(
                        sources[primaryType], context.document);
                    if (/_pseudo/.test(primaryType) &&
                        cfg.plugins[clip.provider].queryString) {
                        sources[primaryType] +=
                            unescape(
                                cfg.plugins[clip.provider].queryString);
                    }
                    if (clip.width && clip.width >= obj.offsetWidth) {
                        sources[primaryType + '-metadata'] =
                            'w' + clip.width + 'h' + clip.height;
                    } else {
                        sources[primaryType + '-metadata'] =
                            'w' + obj.offsetWidth +
                            'h' + (obj.offsetHeight-25);
                    }

                    var metaObj = MediathreadCollect.flowclipMetaSearch(
                        document);
                    for(var k in metaObj) {
                        sources[k] = metaObj[k];
                    }
                    if (!sources.thumb) {
                        var paramConfig =
                            $('*[name=flashvars]')[0].value
                            .split('config=')[1];
                        paramConfig = JSON.parse(paramConfig);
                        var paramObj = paramConfig;
                        var paramThumb;
                        if (paramObj &&
                            paramObj.canvas &&
                            paramObj.canvas.background
                           ) {
                            var bg = paramObj.canvas.background;
                            var bgsplit = bg.split('url(');
                            if (bgsplit.length > 1) {
                                paramThumb = bgsplit[1].split(')')[0];
                            }
                            // Otherwise,
                            // background doesn't contain the string "url()",
                            // so it's probably something like #000000. Just
                            // ignore it - the thumbnail isn't essential.
                        }
                        sources.thumb = paramThumb;
                    }
                    return {
                        'html': obj,
                        'sources': sources,
                        'label': 'video',
                        'primary_type': primaryType,
                        'hash': 'start=' + Math.floor(time),
                        'ref_id': refId //used for merging
                    };
                }
            },/*end flowplayer3*/
            ///used at web.mit.edu/shakespeare/asia/
            'flvplayer_progressive': {
                match: function(emb) {
                    ///ONLY <EMBED>
                    return String(emb.src)
                        .match(/FLVPlayer_Progressive\.swf/);
                },
                asset: function(emb,match,context) {
                    var abs = MediathreadCollect.absolute_url;
                    var flashvars = emb.getAttribute('flashvars');
                    if (flashvars) {
                        var stream = flashvars.match(/streamName=([^&]+)/);
                        if (stream !== null) {
                            return {
                                'html': emb,
                                'primary_type': 'flv',
                                'sources': {
                                    'flv': abs(
                                        stream[1],
                                        context.document) + '.flv'
                                }
                            };
                        }
                    }
                    return {};
                }
            },/*end flvplayer_progressive*/
            'kaltura': {
                match: function(objemb) {
                    var movie = $(objemb).children(
                        'param[name=movie],param[name=MOVIE]');

                    // kaltura & vimeo use the same classid,
                    // apparently vimeo was built off kaltura?
                    return (
                        (objemb.classid ==
                         'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' &&
                         movie.val().search('kaltura') > -1) ||
                            (String(objemb.type)
                             .search('x-shockwave-flash') > -1 &&
                             ((objemb.data &&
                               String(objemb.data).search('kaltura') > -1
                              ) ||
                              (objemb.src &&
                               String(objemb.src).search('kaltura') > -1) ||
                              (objemb.resource && String(objemb.resource)
                               .search('kaltura') > -1)))) || null;
                },
                asset: function(objemb, matchRv, context,
                                index, optionalCallback) {
                    var stream = objemb.data || objemb.src;
                    if (!stream) {
                        var movie = $(objemb).children(
                            'param[name=movie],param[name=MOVIE]');
                        stream = movie.val();
                    }

                    if (!stream) {
                        return {};
                    }
                    var rv = {
                        html:objemb,
                        primary_type: 'kaltura',
                        label: 'kaltura video',
                        sources: {
                            'kaltura': stream
                        }};


                    if (objemb.evaluate) {
                        var currentTime = objemb.evaluate(
                            '{video.player.currentTime}');
                        if (typeof currentTime !== 'undefined' &&
                            currentTime > 0) {
                            rv.hash = 'start=' + currentTime;
                        }

                        var entry = objemb.evaluate('{mediaProxy.entry}');
                        rv.sources.title = entry.name;
                        rv.sources.thumb = entry.thumbnailUrl;
                        rv.sources['metadata-owner'] = entry.userId ||
                            undefined;
                        rv.sources.width = entry.width;
                        rv.sources.height = entry.height;
                        rv.sources.downloadUrl = entry.downloadUrl;
                    }

                    return rv;
                }
            },
            'quicktime': {
                match: function(objemb) {
                    return (
                        objemb.classid ==
                            'clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B' ||
                            String(objemb.type).match(/quicktime/) !==
                            null ||
                            String(objemb.src).match(/\.(mov|m4v)$/) !==
                            null
                    ) || null;
                },
                asset: function(objemb,match,context) {
                    var abs = MediathreadCollect.absolute_url;
                    var src = objemb.src || $(objemb).children(
                        'param[name=src],param[name=SRC]');
                    if (src.length) {
                        src = (src.get) ? src.get(0).value : src;
                        return {
                            'html':objemb,
                            'primary_type': 'quicktime',
                            'sources': {
                                'quicktime': abs(src, context.document),
                                'quicktime-metadata': 'w' +
                                    objemb.offsetWidth +
                                    'h' + objemb.offsetHeight
                            }
                        };
                    } else {
                        return {};
                    }
                }
            },
            'moogaloop': {
                match: function(objemb) {
                    var movie = $(objemb).children(
                        'param[name=movie],param[name=MOVIE]');

                    return (
                        (objemb.classid ==
                         'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' &&
                         movie.val().search('moogaloop') > -1) ||
                            (String(objemb.type)
                             .search('x-shockwave-flash') > -1 &&
                             ((objemb.data && String(objemb.data)
                               .search('moogaloop.swf')) > -1 ||
                              (objemb.src && String(objemb.src)
                               .search('moogaloop.swf') > -1)))) || null;
                },
                asset: function(objemb, matchRv, context,
                                index, optionalCallback) {
                    var vimeoId;
                    if (matchRv) {
                        vimeoId = matchRv;
                    } else {
                        var matches = objemb.src &&
                            objemb.src.match(/clip_id=([\d]*)/);
                        if (!matches || matches.length < 1) {
                            var flashvars = $(objemb)
                                .children(
                                    'param[name=flashvars],' +
                                        'param[name=FLASHVARS]');
                            if (!flashvars.val()) {
                                return {};
                            }
                            matches = flashvars.val()
                                .match(/clip_id=([\d]*)/);
                        }
                        if (!matches || matches.length < 2) {
                            return {};
                        }
                        vimeoId = matches[1];
                    }

                    var rv = {
                        html: objemb,
                        wait: true,
                        primary_type: 'vimeo',
                        label: 'vimeo video',
                        sources: {
                            'url': 'https://vimeo.com/' + vimeoId,
                            'vimeo': 'https://vimeo.com/' + vimeoId
                        }};

                    if (objemb.api_getCurrentTime) {
                        if (objemb.api_getCurrentTime() > 0) {
                            rv.hash = 'start=' +
                                objemb.api_getCurrentTime();
                        }
                    }

                    var vmCallback = function(vm_data) {
                        if (vm_data && vm_data.length > 0) {
                            var info = vm_data[0];
                            rv.sources.title = info.title;
                            rv.sources.thumb = info.thumbnail_medium;
                            rv.sources['metadata-owner'] = info.user_name ||
                                undefined;
                            rv.sources.width = info.width;
                            rv.sources.height = info.height;
                        }
                        optionalCallback(index, rv);
                    };

                    var url = 'https://vimeo.com/api/v2/video/' +
                        vimeoId + '.json';
                    $.ajax({
                        url: url,
                        dataType: 'json',
                        success: vmCallback,
                        error: function() {
                            optionalCallback(index);
                        }
                    });
                    return rv;
                }
            },
            'zoomify': {
                match: function(objemb) {
                    return (String(objemb.innerHTML)
                            .match(/zoomifyImagePath=([^&\"\']*)/) ||
                            String(objemb.flashvars)
                            .match(/zoomifyImagePath=([^&\"\']*)/));
                },
                asset: function(objemb, match, context,
                                index, optionalCallback) {
                    var tile_root = MediathreadCollect.absolute_url(
                        match[1], context.document);
                    //chomp trailing /
                    tile_root = tile_root.replace(/\/$/, '');
                    var img = document.createElement('img');
                    img.src = tile_root + '/TileGroup0/0-0-0.jpg';
                    var rv_zoomify = {
                        'html': objemb,
                        'primary_type': 'image',
                        'label': 'Zoomify',
                        'sources': {
                            //better guess than 0-0-0.jpg
                            'title': tile_root.split('/').pop(),
                            'xyztile': tile_root +
                                '/TileGroup0/${z}-${x}-${y}.jpg',
                            'thumb': img.src,
                            'image': img.src, /*nothing bigger available*/
                            'image-metadata': 'w' + img.width +
                                'h' + img.height
                        },
                        wait: true
                    };
                    var hard_way = function(error) {
                        //security error?
                        //Let's try it the hard way!
                        var dim = {
                            z: 0,
                            x: 0,
                            y: 0,
                            tilegrp: 0
                        };
                        function walktiles(mode) {
                            var tile = document.createElement('img');
                            tile.onload = function() {
                                switch(mode) {
                                case 'z': ++dim.z;
                                    dim.width = tile.width;
                                    dim.height = tile.height;
                                    break;
                                case 'x': ++dim.x;
                                    break;
                                case 'y': ++dim.y;
                                    break;
                                case 'tilegrp':
                                    ++dim.tilegrp;
                                    break;
                                }
                                walktiles(mode);
                            };
                            tile.onerror = function() {
                                switch(mode) {
                                case 'z':
                                    --dim.z;
                                    dim.mode = 'x';
                                    return walktiles('x');
                                case 'x':
                                    --dim.x;
                                    dim.mode = 'y';
                                    return walktiles('y');
                                case 'y':
                                    if (dim.mode!='tilegrp') {
                                        ++dim.tilegrp;
                                        dim.mode='y';
                                        return walktiles('tilegrp');
                                    } else {
                                        --dim.y;
                                        rv_zoomify
                                            .sources['xyztile-metadata'] =
                                            ('w' + (dim.width*dim.x) +
                                             'h' + (dim.height*dim.y));
                                        rv_zoomify._data_collection =
                                            'Hackish tile walk';
                                        return optionalCallback(
                                            index, rv_zoomify);
                                    }
                                    break;
                                case 'tilegrp': --dim.tilegrp;
                                    var m = dim.mode;
                                    dim.mode = 'tilegrp';
                                    return walktiles(m);
                                }
                            };
                            tile.src = tile_root + '/TileGroup' +
                                dim.tilegrp + '/' + dim.z + '-' +
                                dim.x + '-' + dim.y + '.jpg';
                        }
                        walktiles('z');
                    };
                    try {
                        $.ajax({
                            url: tile_root + '/ImageProperties.xml',
                            dataType: 'text',
                            success: function(dir) {
                                var re = /WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/;
                                var sizes = dir.match(re);
                                rv_zoomify.sources['xyztile-metadata'] =
                                    'w' + (sizes[1]) +
                                    'h' + (sizes[2]);
                                rv_zoomify._data_collection =
                                    'ImageProperties.xml';
                                optionalCallback(index, rv_zoomify);
                            },
                            error: hard_way
                        });
                    } catch (ie_security_error) {
                        hard_way();
                    }
                    return rv_zoomify;
                }
            }
        },
        find: function(callback, context) {
            var self = this;
            var result = [];
            var waiting = 0;
            var finished = function(index, asset_result) {
                result[index] = asset_result || result[index];
                if (--waiting <= 0) {
                    callback(result);
                }
            };
            function matchNsniff(oe) {
                for (var p in self.players) {
                    var m = self.players[p].match(oe);
                    if (m !== null) {
                        var res = self.players[p].asset(
                            oe, m, context, result.length, finished);
                        if (res.sources)
                            result.push(res);
                        if (res.wait) {
                            ++waiting;
                        }
                        break;
                    }
                }
            }
            var embs = context.document.getElementsByTagName('embed');
            var objs = context.document.getElementsByTagName('object');
            for (var i = 0; i < embs.length; i++) {
                matchNsniff(embs[i]);
            }
            for (i = 0; i <objs.length; i++) {
                matchNsniff(objs[i]);
            }
            if (waiting === 0) {
                callback(result);
            }
        }
    },

    video: {
        addSource: function(source, rv, video) {
            var codecs = /[.\/](ogv|ogg|webm|mp4)/i;
            if (!source.src) {
                return;
            }
            var vid_type = 'video';
            var mtype = String(video.type).match(codecs);
            if (mtype) {
                vid_type = mtype[1].toLowerCase();
                if (video.canPlayType(video.type) === 'probably') {
                    rv.primary_type = vid_type;
                }
            } else if (mtype === String(source.src).match(codecs)) {
                vid_type = mtype[1].toLowerCase().replace('ogv', 'ogg');
            }
            if (rv.primary_type === 'video') {
                rv.primary_type = vid_type;
            }
            rv.sources[vid_type] = source.src;
            rv.sources[vid_type + '-metadata'] =
                'w' + video.videoWidth +
                'h' + video.videoHeight;
        },

        find: function(callback, context) {
            var videos = context.document.getElementsByTagName('video');
            var result = [];

            for (var i = 0; i < videos.length; i++) {
                var rv = {
                    'html': videos[i],
                    'label': 'video',
                    'primary_type': 'video',
                    'sources': {}
                };
                if (videos[i].poster) {
                    rv.sources.thumb = videos[i].poster;
                }
                this.addSource(videos[i], rv, videos[i]);
                var sources = videos[i].getElementsByTagName('source');
                for (var j = 0; j < sources.length; j++) {
                    this.addSource(sources[j], rv, videos[i]);
                }
                result.push(rv);
            }
            for (i = 0; i < result.length; i++) {
                MediathreadCollect.metadataSearch(
                    result[i], context.document);
            }
            callback(result);
        }
    },

    audio: {
        find: function(callback,context) {
            // test if we are on the asset itself, relying on
            // the browser (support) handling the mp3 file
            if (/.mp3$/.test(document.location)) {
                callback([{
                    'html': document.documentElement,
                    'primary_type': 'mp3',
                    'sources': {
                        'mp3': String(document.location)
                    }
                }]);
            } else {//this must be a listing of audio files somewhere
                // on the page.
                window.MediathreadCollect.snd_asset_2_django = function(
                    mp3, type
                ) {
                    mp3.each(function(i) {
                        callback([{
                            'html': document.documentElement,
                            'primary_type': 'mp3',
                            'sources': {
                                'mp3': mp3[i][type]
                            }
                        }]);
                    });
                };
                var mp3, type;
                if ($('*[href$="mp3"]').length) {// check for href
                    mp3 = $('*[href$="mp3"]');
                    type = 'href';
                } else if ($('*[src$="mp3"]').length) {// check for src
                    mp3 = $('*[src$="mp3"]');
                    type = 'src';
                }//end else if
                if (typeof mp3 !== 'undefined') {
                    window.MediathreadCollect.snd_asset_2_django(mp3, type);
                }//end if
            }//end else
        }//end find
    },

    'iframe.postMessage': {
        find: function(callback,context) {
            if (!window.postMessage) return callback([]);
            var frms = context.document.getElementsByTagName('iframe');
            var result = [];
            MediathreadCollect.connect(
                context.window,
                'message',
                function(evt) {
                    try {
                        var id, d = $.parseJSON(evt.data);
                        if ((id = String(d.id).match(/^sherd(\d+)/)) &&
                            d.info
                           ) {
                            var i = d.info;
                            switch(i.player) {
                            case 'flowplayer':
                                var fp =
                                    (MediathreadCollect.assethandler
                                     .objects_and_embeds.players
                                     .flowplayer3.queryasset(
                                         context,
                                         frms[parseInt(id[1], 10)],
                                         i.config,
                                         i.clip,
                                         i.time,
                                         i.id));
                                return callback([fp]);
                            default:
                                return callback([]);
                            }
                        }
                    } catch (e) {/*parse error*/}
                });

            for (var i = 0; i <frms.length; i++) {
                try {
                    frms[i].contentWindow.postMessage(
                        '{"event":"info","id":"sherd' + i + '"}', '*');
                } catch (e) {/*pass: probably security error*/}
            }
        }
    },

    'iframe.youtube': {
        find: function(callback, context) {
            var frms = context.document.getElementsByTagName('iframe');
            var result = [];
            var cb = function(ind, rv) {
                callback([rv]);
            };
            for (var i = 0; i < frms.length; i++) {
                var vMatch = String(frms[i].src)
                    .match(/^http:\/\/www.youtube.com\/embed\/([\w\-]*)/);
                if (vMatch && vMatch.length > 1) {
                    MediathreadCollect.assethandler
                        .objects_and_embeds.players
                        .youtube.asset(
                            frms[i],
                            vMatch,
                            {
                                'window': window,
                                'document': document
                            },
                            0,
                            cb);
                }
            }
        }
    },

    image: {
        find: function(callback,context) {
            var imgs = context.document.getElementsByTagName('img');
            var result = [];
            var zoomify_urls = {};
            var done = 0;
            for (var i = 0; i < imgs.length; i++) {
                //IGNORE headers/footers/logos
                var image = imgs[i];
                if (/(footer|header)/.test(image.className) ||
                    //WGBH header
                    /site_title/.test(
                        image.parentNode.parentNode.className) ||
                    //drupal logo
                    /logo/.test(image.id) ||
                    //drupal7 logo
                    /logo/.test(image.parentNode.id) ||
                    //web.mit.edu/shakespeare/asia/
                    /logo\W/.test(image.src)
                   ) {
                    continue;
                }
                if (image.src.length > 4096 ||
                    image.src.indexOf('data') === 0
                   ) {
                    continue;
                }
                /*recreate the <img> so we get the real width/height */
                var image_ind = document.createElement('img');
                image_ind.src = image.src;
                if (image_ind.width === 0) {
                    //for if it doesn't load immediately
                    //cheating: TODO - $(image_ind).bind('load',
                    //    function() { /*see dropbox.com above*/ });
                    image_ind = image;
                }
                if (image_ind.width >= 400 ||
                    image_ind.height >= 400
                   ) {
                    result.push({
                        'html': image,
                        'primary_type': 'image',
                        'sources': {
                            'title': image.title || undefined,
                            'image': image.src,
                            'image-metadata': 'w' + image_ind.width +
                                'h' + image_ind.height
                        }
                    });
                } else {
                    ////Zoomify Tile Images support
                    var zoomify_match = String(image.src).match(
                            /^(.*)\/TileGroup\d\//);
                    if (zoomify_match) {
                        var tile_root = MediathreadCollect.absolute_url(
                            zoomify_match[1],
                            context.document);
                        if (tile_root in zoomify_urls) {
                            continue;
                        } else {
                            zoomify_urls[tile_root] = 1;
                            var img = document.createElement('img');
                            img.src = tile_root + '/TileGroup0/0-0-0.jpg';
                            var zoomify = {
                                'html': image,
                                'primary_type': 'image',
                                'sources': {
                                    //better guess than 0-0-0.jpg
                                    'title': tile_root.split('/').pop(),
                                    'xyztile': tile_root +
                                        '/TileGroup0/${z}-${x}-${y}.jpg',
                                    'thumb': img.src,
                                    /*nothing bigger available*/
                                    'image': img.src,
                                    'image-metadata': 'w' + img.width +
                                        'h' + img.height
                                }
                            };
                            result.push(zoomify);
                            done++;
                            /*Get width/height from zoomify's XML file
                              img_root + '/source/' + img_key + '/' +
                              img_key + '/ImageProperties.xml'
                            */
                            $.get(
                                tile_root + '/ImageProperties.xml',
                                null,
                                /* jshint ignore:start */
                                function(dir) {
                                    var sizes = dir.match(
                                            /WIDTH=\"(\d+)\"\s+HEIGHT=\"(\d+)\"/
                                    );
                                    zoomify.sources['xyztile-metadata'] =
                                        'w' + sizes[1] + 'h' + sizes[2];
                                    if (--done === 0) {
                                        callback(result);
                                    }
                                },
                                /* jshint ignore:end */
                                'text');
                        }
                    }
                }
            }
            for (i = 0; i < result.length; i++) {
                MediathreadCollect.metadataSearch(
                    result[i], context.document);
            }
            if (done === 0) {
                callback(result);
            }
        }
    },

    mediathread: {
        // the better we get on more generic things, the more
        // redundant this will be
        // BUT it might have more metadata
        find: function(callback) {
            var result = [];
            $('div.asset-links').each(function() {
                var top = this;
                var res0 = {html: top, sources: {}};
                $('a.assetsource', top).each(function() {
                    var reg = String(this.getAttribute('class'))
                        .match(/assetlabel-(\w+)/);
                    if (reg !== null) {
                        // use getAttribute rather than href,
                        // to avoid urlencodings
                        res0.sources[reg[1]] = this.getAttribute('href');
                        if (/asset-primary/.test(this.className))
                            res0.primary_type = reg[1];
                        if (this.title)
                            res0.sources.title = this.title;
                    }
                });
                result.push(res0);
            });
            return callback(result);
        }
    },

    // http://unapi.info/specs/
    unAPI: {
        page_resource: true,
        find: function(callback,context) {
            var self = this;
            var unapi = $('abbr.unapi-id');
            // must find one, or it's not a page resource, and
            // we won't know what asset to connect to
            if (unapi.length == 1) {
                var server = false;
                $('link').each(function() {
                    if (this.rel === 'unapi-server') {
                        server = this.href;
                    }
                });
                if (server) {
                    ///start out only supporting pbcore
                    var format = '?format=pbcore';
                    var request_url = server + format + '&id=' +
                        unapi.attr('title');
                    $.ajax({
                        'url': request_url,
                        'dataType': 'text',
                        success: function(pbcore_xml, textStatus, xhr) {
                            var rv = {
                                'page_resource': true,
                                'html': unapi.get(0),
                                'primary_type': 'pbcore',
                                'sources': {
                                    'pbcore': request_url
                                },
                                'metadata': {
                                    'subject':[]
                                }
                            };
                            var pb = MediathreadCollect.xml2dom(
                                pbcore_xml, xhr);
                            if ($('PBCoreDescriptionDocument', pb)
                                .length === 0) {
                                return callback([]);
                            }
                            $('title',pb).each(function() {
                                var titleType = $(
                                    'titleType', this.parentNode).text();
                                if (titleType == 'Element' ||
                                    document.title.indexOf(
                                        this.firstChild.data) > -1
                                   ) {
                                    rv.sources.title = this.firstChild.data;
                                } else {
                                    rv.metadata[titleType + ':Title'] = [
                                        this.firstChild.data];
                                }
                            });
                            $('description', pb).each(function() {
                                rv.metadata.description = [
                                    this.firstChild.data];
                            });
                            $('contributor', pb).each(function() {
                                var role = $(
                                    'contributorRole',
                                    this.parentNode).text();
                                rv.metadata['Contributor:' + role] =
                                    [this.firstChild.data];
                            });
                            $('coverage', pb).each(function() {
                                var type = $('coverageType',
                                             this.parentNode).text();
                                rv.metadata['Coverage:' + type] =
                                    [this.firstChild.data];
                            });
                            $('rightsSummary', pb).each(function() {
                                rv.metadata.Copyrights =
                                    [this.firstChild.data];
                            });
                            $('subject', pb).each(function() {
                                // TODO: should we care about the
                                // subjectAuthorityUsed?
                                rv.metadata.subject.push(
                                    this.firstChild.data);
                            });
                            $('publisher', pb).each(function() {
                                rv.metadata.publisher =
                                    [this.firstChild.data];
                            });
                            // TODO: should we get video metadata
                            // (betacam, aspect ratio)?
                            callback([rv]);
                        },
                        error: function() {
                            //attempt to scrape manually
                            var rv;
                            if (console) {
                                console.log(
                                    'trying to scrape manually, ' +
                                        'something went wrong with ' +
                                        'the unAPI call');
                                // if Openvault
                                if (request_url.indexOf('openvault') > 0) {
                                    rv = {
                                        'page_resource': true,
                                        'html': document,
                                        'primary_type': 'pbcore',
                                        'sources': {
                                            'pbcore': window.location.href
                                        },
                                        'metadata': {'subject':[]}
                                    };
                                    rv.metadata.Description =[$(
                                        '.blacklight-dc_description_t ' +
                                            '.value').text()];
                                    rv.metadata.Subject =
                                        [$('.blacklight-topic_cv .value')
                                         .text()];
                                    rv.metadata.Copyrights =
                                        [$('.copyright').text()];
                                    rv.metadata.Publisher =
                                        ['WGBH Educational Foundation'];
                                }
                            }
                            if (rv) {
                                callback([rv]);
                            }else{
                                callback([]);
                            }
                        }
                    });
                    return;
                }//end if (server)
            }//end if (unapi.length)
            return callback([]);
        }
    },

    // http://www.oembed.com/
    'oEmbed.json': {
        page_resource: true,
        find: function(callback,context) {
            var self = this;
            var oembed_link = false;
            $('link').each(function() {
                //jQuery 1.0 compatible
                if (this.type == 'application/json+oembed') {
                    oembed_link = this;
                }
            });
            if (oembed_link) {
                var result = {
                    'html': oembed_link,
                    'sources': {},
                    'metadata': {},
                    'page_resource': true
                };
                $.ajax({
                    'url': result.html.href,
                    'dataType': 'json',
                    success: function(json, textStatus) {
                        if (json.ref_id) {
                            result.ref_id = json.ref_id;
                        }
                        if (json.url) {
                            switch (json.type) {
                            case 'photo':
                            case 'image':
                                result.primary_type = 'image';
                                result.sources.image = json.url;
                                ///extension: openlayers tiling protocol
                                if (json.xyztile) {
                                    var xyz = json.xyztile;
                                    result.sources.xyztile = xyz.url;
                                    result.sources['xyztile-metadata'] =
                                        'w' + xyz.width + 'h' + xyz.height;
                                }
                                break;
                            case 'video':
                                result.primary_type = 'video';
                                if (/\.pseudostreaming-/.test(json.html))
                                    result.primary_type = 'video_pseudo';
                                else if (/\rtmp/.test(json.html))
                                    result.primary_type = 'video_rtmp';
                                result.sources[result.primary_type] =
                                    json.url;
                                break;
                            default:
                                return callback([]);
                            }
                            result.sources[
                                result.primary_type + '-metadata'] =
                                'w' + json.width + 'h' + json.height;
                        }
                        if (json.thumbnail_url) {
                            result.sources.thumb = json.thumbnail_url;
                            result.sources['thumb-metadata'] =
                                'w' + json.thumbnail_width +
                                'h' + json.thumbnail_height;
                        }
                        if (json.title) {
                            result.sources.title = json.title;
                        }
                        if (json.description) {
                            result.metadata.description =
                                [json.description];
                        }
                        if (json.metadata) {//extension
                            result.metadata = json.metadata;
                        }
                        callback([result]);
                    },
                    error: function(e) {callback([]);}
                });
            } else {
                callback([]);
            }
        }
    }
};

if (typeof module !== 'undefined') {
    module.exports = assetHandler;
}
