window.MediathreadCollect = {
    /* updated by /accounts/logged_in.js */
    'user_status': {
        ready: false
    },
    user_ready: function() {
        // FIXME :P
        return true;
    },
    update_user_status: function(userStatus) {
        var uninit = !window.MediathreadCollect.user_status.ready;
        for (var a in userStatus) {
            window.MediathreadCollect.user_status[a] = userStatus[a];
        }
        if (window.console) {
            window.console.log(userStatus);
        }

        if ('youtube_apikey' in userStatus) {
            window.MediathreadCollect.options.youtube_apikey =
                userStatus.youtube_apikey;
        }

        if ('flickr_apikey' in userStatus) {
            window.MediathreadCollect.options.flickr_apikey =
                userStatus.flickr_apikey;
        }

        //Safari sometimes loads logged_in.js last, even when added first
        if (uninit && userStatus.ready && MediathreadCollect.g) {
            //find assets again
            MediathreadCollect.g.findAssets();
        }
    },
    'hosthandler': hostHandler,
    'assethandler': assetHandler,
    'gethosthandler': function() {
        var hosthandler = MediathreadCollect.hosthandler;
        hosthandler['mcah.columbia.edu'] = hosthandler['learn.columbia.edu'];
        for (var host in hosthandler) {
            if (new RegExp(host + '$').test(
                location.hostname.replace('.ezproxy.cul.columbia.edu', '')
            )) {
                return hosthandler[host];
            }
        }
    },/*gethosthandler*/
    'obj2url': function(host_url, obj) {
        /*excluding metadata because too short for GET string*/
        if (!obj.sources.url) {
            obj.sources.url = String(document.location);
        }
        var destination =  host_url;
        for (var a in obj.sources) {
            if (typeof obj.sources[a] === 'undefined') {
                continue;
            }
            destination += (a + '=' + escape(obj.sources[a]) + '&');
        }
        if (obj.hash) {
            destination += '#' + obj.hash;
        }
        return destination;
    },/*obj2url*/
    'obj2form': function(host_url, obj, doc, target, index) {
        var M = window.MediathreadCollect;
        doc = doc || document;
        target = target || '_top';
        // if more than one asset, we should try to prefix this to
        // keep url= unique
        if (!obj.sources.url) {
            obj.sources.url = String(doc.location) +
                (index ? '#' + obj.sources[obj.primary_type]
                 .split('#')[0].split('/').pop() : '');
        }
        var destination =  host_url;
        if (obj.hash) {
            destination += '#' + obj.hash;
        }
        var form = M.elt(doc, 'form', '', {}, [
            M.elt(doc, 'div', 'sherd-asset-wrap', {})
        ]);
        form.action = destination;
        form.target = target;
        var ready = M.user_ready();
        form.method = (ready) ? 'POST' : 'GET';

        var form_api = M.options.form_api || 'mediathread';
        M.forms[form_api](obj,form,ready,doc);
        return form;
    },/*obj2form*/
    'addField': function(name, value, form, doc) {
        var span = doc.createElement('span');
        var item = doc.createElement('input');
        var $item = $(item);
        if (name === 'title') {
            $item.attr('type', 'text');
            $item.addClass('sherd-form-title');
        } else {
            $item.attr('type', 'hidden');
        }
        $item.attr('name', name);
        $(item).val(value);
        $(form).append($item);
        return item;
    },/*addField*/
    'forms': {
        'mediathread': function(obj, form, ready, doc) {
            var M = window.MediathreadCollect;
            /* just auto-save immediately
             * this also allows us to send larger amounts of metadata
             */
            for (var a in obj.sources) {
                if (typeof obj.sources[a] === 'undefined') {
                    continue;
                }
                M.addField(a, obj.sources[a],form,doc);
            }
            if (!obj.sources.title) {
                var title = 'Untitled';
                if (obj.sources[obj.primary_type]) {
                    // guess title as filename
                    title = obj.sources[obj.primary_type].split('/').pop()
                        .split('?').shift();
                }
                M.addField('title', title, form, doc);
            }
            if (ready && obj.metadata) {
                for (a in obj.metadata) {
                    for (var i = 0; i < obj.metadata[a].length; i++) {
                        M.addField('metadata-' + a, obj.metadata[a][i],
                                   form, doc);
                    }
                }
            }
            M.addField('asset-source', 'bookmarklet', form, doc);
        },/*mediathread_form*/
        'imagemat': function(obj, form, ready, doc) {
            var M = window.MediathreadCollect;
            if (obj.sources.title) {
                var $span = $('<span>', {
                    'class': 'sherd-source-title'
                });
                $span.text(obj.sources.title);
                $(form).append(span);
                M.addField('ftitle', obj.sources.title, form, doc);
            }
            M.addField('htmls[0]',obj.sources.url,form,doc);
            M.addField('urls[0]',obj.sources[obj.primary_type],form,doc);
            M.addField(
                'jsons[0]',
                JSON.stringify(
                    obj,
                    function(key, value) {
                        if (typeof value === 'object' && value.tagName) {
                            return '';
                        } else {
                            return value;
                        }
                    }),
                form,
                doc);
        }/*imagemat_form*/
    },
    'runners': {
        jump: function(host_url, jump_now) {
            var final_url = host_url;
            var M = MediathreadCollect;
            var handler = M.gethosthandler();
            var grabber_func = function() {
                M.g = new M.Interface(host_url);
                M.g.findAssets();
            };
            if (!handler) {
                grabber_func();
                return;
            }
            var jump_with_first_asset = function(assets, error) {
                if (assets.length === 0) {
                    if (handler.also_find_general) {
                        grabber_func();
                        return;
                    }
                    var message = error ||
                        'This page does not contain any supported media ' +
                        'assets. ' +
                        'Try going to an asset page.';
                    return alert(message);
                } else if (
                    assets.length === 1 &&
                        $.type(assets[0]) === 'object' &&
                        assets[0].disabled
                ) {
                    return alert(
                        'This asset cannot be embedded on external sites. ' +
                            'Please select another asset.');
                } else {
                    M.g = new M.Interface(host_url, {
                        'allow_save_all': handler.allow_save_all
                    });
                    M.g.showAssets(assets);
                }
            };/*end jump_with_first_asset*/
            handler.find.call(handler, jump_with_first_asset);
        },
        decorate: function(host_url) {
            var M = MediathreadCollect;
            function go(run_func) {
                M.g = new M.Interface(host_url);
                if (run_func === 'onclick') {
                    M.g.findAssets();
                }
            }
            /*ffox 3.6+ and all other browsers:*/
            if (document.readyState !== 'complete') {
                /*future, auto-embed use-case.
                  When we do this, we need to support ffox 3.5-
                */
                M.l = M.connect(window,'load',go);
            } else {/*using as bookmarklet*/
                go('onclick');
            }
        }
    },/*runners*/
    'connect': function(dom, event, func) {
        try {
            return (
                (dom.addEventListener) ?
                    dom.addEventListener(event, func, false) :
                    dom.attachEvent('on' + event, func));
        } catch (e) {/*dom is null in firefox?*/}
    },/*connect*/
    'hasClass': function(elem, cls) {
        return (' ' + (elem.className || elem.getAttribute('class')) + ' ')
            .indexOf(cls) > -1;
    },
    'hasBody': function(doc) {
        return (doc.body && 'body' === doc.body.tagName.toLowerCase());
    },
    'clean': function(str) {
        return str.replace(/^\s+/,'').replace(/\s+$/,'').replace(/\s+/,' ');
    },
    'getImageDimensions': function(src, callback, onerror) {
        var img = document.createElement('img');
        img.onload = function() {
            callback(img, 'w' + img.width + 'h' + img.height);
        };
        img.onerror = onerror;
        img.src = src;
        return img;
    },
    'mergeMetadata': function(result, metadata) {
        if (!metadata) {
            return;
        }
        if (!result.metadata) {
            result.metadata = metadata;
            return result.metadata;
        } else {
            for (var a in metadata) {
                if (result.metadata[a]) {
                    result.metadata[a].push.apply(
                        result.metadata[a], metadata[a]);
                } else {
                    result.metadata[a] = metadata[a];
                }
            }
        }
        return metadata;
    },
    'metadataSearch': function(result, doc) {
        /*
          searches for neighboring metadata in microdata and some
          ad-hoc microformats
        */
        var M = MediathreadCollect;
        if (!M.mergeMetadata(result,M.metadataTableSearch(result.html, doc))) {
            M.mergeMetadata(result,M.microdataSearch(result.html, doc));
        }
        var meta = result.metadata;
        if (meta) {
            //move appopriate keys to result.sources
            var s = {
                'title': meta.title || meta.title,
                'thumb': meta.thumb || meta.Thumb || meta.Thumbnail ||
                    meta.thumbnail
            };
            for (var a in s) {
                if (s[a]) {
                    result.sources[a] = s[a].shift();
                }
            }
        }
    },
    'microdataSearch': function(elem, doc) {
        var item;
        $(elem).parents('[itemscope]').each(function() {
            item = this;
        });
        if (item) {
            if (item.properties) {
                return item.properties;
            } else {
                var props = {};
                var abs = MediathreadCollect.absoluteUrl;
                $('[itemprop]', item).each(function() {
                    var p = this.getAttribute('itemprop');
                    props[p] = props[p] || [];
                    switch (String(this.tagName).toLowerCase()) {
                    case 'a':
                    case 'link':
                    case 'area':
                        props[p].push(abs(this.href, doc));
                        break;
                    case 'audio':
                    case 'embed':
                    case 'iframe':
                    case 'img':
                    case 'source':
                    case 'video':
                        if (this.src) {
                            props[p].push(abs(this.src, doc));
                        }
                        break;
                    default:
                        props[p].push($(this).text());
                        break;
                    }
                });
                return props;
            }
        }
    },
    'metadataTableSearch': function(elem, doc) {
        /*If asset is in a table and the next row has the word 'Metadata' */
        if ('td' === elem.parentNode.tagName.toLowerCase()) {
            var trs = $(elem.parentNode.parentNode).nextAll();
            if (trs.length && /metadata/i.test($(trs[0]).text())) {
                var props = {};
                trs.each(function() {
                    var tds = $('td', this);
                    if (tds.length === 2) {
                        var p = MediathreadCollect.clean($(tds[0]).text());
                        if (p) {
                            props[p] = props[p] || [];
                            var val = MediathreadCollect.clean(
                                $(tds[1]).text());
                            // if there's an <a> tag, then use the URL -- use
                            // for thumbs
                            $('a', tds[1]).slice(0, 1).each(function() {
                                val = MediathreadCollect.absoluteUrl(
                                    this.href, doc);
                            });
                            props[p].push(val);
                        }
                    }
                });
                return props;
            }
        }
    },
    'flowclipMetaSearch': function(doc) {
        var metaData = {};
        var metaDataElms = $('*[itemprop]', document);
        if (typeof metaDataElms !== 'undefined') {
            metaDataElms.each(function() {
                var itemProp = $(this).attr('itemprop');
                var val = $(this).text();
                if ($(this).attr('itemref')) {
                    var metaId = $(this).attr('itemref');
                    if (typeof metaData['metadata-' + itemProp] ===
                        'undefined') {
                        metaData['metadata-' + itemProp] = {};
                    }
                    metaListItem = $('#' + metaId).text();
                    metaData['metadata-' + itemProp][metaId] = metaListItem;
                }
                if (itemProp === 'title') {
                    metaData[itemProp] = val;
                } else if (
                    typeof metaData['metadata-' + itemProp] !== 'object'
                ) {
                    metaData['metadata-' + itemProp] = val;
                }
            });
            for (var data in metaData) {
                if (typeof metaData[data] === 'object') {
                    var flatMetaData = '';
                    for (var str in metaData[data]) {
                        if (flatMetaData === '') {
                            flatMetaData = metaData[data][str];
                        } else {
                            flatMetaData += ', ' + metaData[data][str];
                        }
                    }
                    metaData[data] = flatMetaData;
                }// end if typeof metaData[data]
            }
            return metaData;
        }// end meta_data_elms !== undefined
    },
    'xml2dom': function(str) {
        if (window.DOMParser) {
            var p = new DOMParser();
            return p.parseFromString(str, 'text/xml');
        } else if (window.ActiveXObject) {
            var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.loadXML(str);
            return xmlDoc;
        } else {
            var div = document.createElement('div');
            $(div).text(str);
            return div;
        }
    },
    'find_by_attr': function(jq, tag, attr, val, par) {
        if (/^1.0/.test(jq.prototype.jquery)) {
            return jq(tag,par).filter(function(elt) {
                return (elt.getAttribute && elt.getAttribute(attr) === val);
            });
        } else {
            return jq(tag + '[' + attr + '=' + val + ']', par);
        }
    },
    'absoluteUrl': function(maybe_local_url, doc, maybe_suffix) {
        maybe_local_url = (maybe_suffix || '') + maybe_local_url;
        if (/:\/\//.test(maybe_local_url)) {
            return maybe_local_url;
        } else {
            var cur_loc = doc.location.toString().split('?')[0].split('/');
            if (maybe_local_url.indexOf('/') === 0) {
                return cur_loc.splice(0,3).join('/') + maybe_local_url;
            } else {
                cur_loc.pop();///filename

                while (maybe_local_url.indexOf('../') === 0) {
                    cur_loc.pop();
                    maybe_local_url = maybe_local_url.substr(3);
                }
                return cur_loc.join('/') + '/' + maybe_local_url;
            }
        }
    },
    'elt': function(doc, tag, className, style, children) {
        // we use this to be even more careful than jquery for contexts
        // like doc.contentType='video/m4v' in firefox
        var setStyle = function(e, style) {
            //BROKEN IN IE: http://www.peterbe.com/plog/setAttribute-style-IE
            var css = style.split(';');
            var bToUpperCase = function(a, b) {
                return b.toUpperCase();
            };
            for (var i = 0; i < css.length; i++) {
                var kv = css[i].split(':');
                if (kv[0] && kv.length === 2) {
                    e.style[
                        kv[0].replace(/-([a-z])/, bToUpperCase)
                    ] = kv[1];
                }
            }
        };
        var t = doc.createElement(tag);
        t.setAttribute('class',className);
        if (typeof style === 'string') {
            t.setAttribute('style', style);
            setStyle(t, style);
        } else {
            for (var a in style) {
                t.setAttribute(a, style[a]);
                if (style[a] === null) {
                    t.removeAttribute(a);
                }
                if (a === 'style') {
                    setStyle(t, style[a]);
                }
            }
        }
        if (children) {
            for (var i = 0; i < children.length; i++) {
                var c = children[i];
                if (typeof c === 'string') {
                    t.appendChild(doc.createTextNode(c));
                } else {
                    t.appendChild(c);
                }
            }
        }
        return t;
    },
    /**************
   Finder finds assets in a document (and all sub-frames)
    *************/
    'Finder': function() {
        var me = this;

        this.handler_count = 0;
        this.final_count = 0;
        this.assets_found = [];
        this.page_resource_count = 0;
        this.best_frame = null;
        this.asset_keys = {};

        this.ASYNC = {
            remove: function(asset) {},
            display: function(asset, index) {},
            finish: function() {},
            best_frame: function(frame) {}
        };

        this.bestFrame = function() {
            return me.best_frame;
        };

        this.findAssets = function() {
            me.assets_found = [];
            var handler = MediathreadCollect.gethosthandler();
            if (handler) {
                handler.find.call(handler, me.collectAssets);
                if (handler.also_find_general) {
                    me.findGeneralAssets();
                }
            } else {
                me.findGeneralAssets();
            }
            if (me.assets_found.length === 0 &&
                MediathreadCollect.user_ready()
               ) {
                me.noAssetMessage();
            }
        };

        this.noAssetMessage = function() {
            var closeBtn = $('<div class="no-asset-close-btn">&#10005;</div>');
            var messageBox = $(
                '<div class="no-asset-alert">' +
                    'Sorry, no supported assets were found on this page. ' +
                    'Try going to an asset page if you are on a ' +
                    'list/search page. <br/><br/> If there is a video on ' +
                    'the page, press play and then try again.' +
                    '</div>');
            var winWidth = $(window).width();
            var winHeight = $(window).height();
            $('.import-header').remove();

            messageBox.css({
                left: (winWidth / 2) - 262 + 'px',
                top: (winHeight / 2) - 100 + 'px'
            });

            closeBtn.click(function() {
                $('.sherd-analyzer').remove();
            });
            //double check no asset on page
            if ($('.sherd-asset li').length === 0) {
                $('.sherd-analyzer').append(messageBox);
                messageBox.prepend(closeBtn);
            }
        };

        this.findGeneralAssets = function() {
            me.no_assets_yet = true;
            me.asset_keys = {};

            var handlers = MediathreadCollect.assethandler;
            var frames = me.walkFrames();
            me.best_frame = frames.best;
            me.ASYNC.best_frame(frames.best);
            me.final_count += frames.all.length;

            $(frames.all).each(function(i, context) {
                ++me.handler_count; //for each frame
                for (var h in MediathreadCollect.assethandler) {
                    ++me.final_count;
                }

                for (h in MediathreadCollect.assethandler) {
                    var handler = handlers[h];
                    try {
                        handler.find.call(handler,
                                          me.collectAssets,
                                          context);
                    } catch (e) {
                        ++me.handler_count;
                        MediathreadCollect.error = e;
                        alert('Extension Error in ' + h + ': ' + e.message);
                    }
                }
            });
        };
        this.assetHtmlID = function(asset) {
            return ('sherdbookmarklet-asset-' +
                    (asset.ref_id || Math.floor(Math.random() * 10000)));
        };
        this.redundantInGroup = function(asset, primary_type) {
            //return merged asset, so new asset has benefits of both

            me.asset_keys.ref_id = me.asset_keys.ref_id || {};
            var list = me.asset_keys[primary_type] =
                (me.asset_keys[primary_type] || {});
            var merge_with = false;
            if (
                asset.page_resource &&
                    asset !== me.assets_found[0] &&
                    me.assets_found.length - me.page_resource_count < 2
            ) {
                // if there's only one asset on the page and rest are
                // page_resources
                merge_with = me.assets_found[me.assets_found.length - 2];
            } else if (asset.ref_id && asset.ref_id in me.asset_keys.ref_id) {
                //a hack to let the page match two assets explicitly
                merge_with = me.asset_keys.ref_id[asset.ref_id];
            } else if (asset.sources[primary_type] in list) {
                //if primary source urls are identical
                merge_with = list[ asset.sources[primary_type] ];
            }
            if (merge_with) {
                if (merge_with.html_id) {
                    me.ASYNC.remove(merge_with);
                    delete merge_with.html_id;//so it doesn't over-write asset
                } else if (window.console) {
                    window.console.log('ERROR: No html_id on merge-item');
                }

                //jQuery 1.0compat (for drupal)
                $.extend(merge_with.sources, asset.sources);
                ///not trying to merge individual arrays
                if (merge_with.metadata && asset.metadata) {
                    $.extend(merge_with.metadata, asset.metadata);
                }
                $.extend(asset, merge_with);
                ///keep our pointers singular
                list[ asset.sources[merge_with.primary_type] ] = asset;
            }
            list[asset.sources[primary_type]] = asset;
            if (asset.ref_id) {
                me.asset_keys.ref_id[asset.ref_id] = asset;
            }
            return asset;
        };
        this.mergeRedundant = function(asset) {
            // assumes assets without primary types could be redundant on
            // anything actually, all assets must have a primary_type for
            // assetHtmlID()
            if (asset.primary_type) {
                return this.redundantInGroup(asset, asset.primary_type);
            } else {
                throw Error('asset does not have a primary type.');
            }
        };
        this.collectAssets = function(assets, errors) {
            me.assets_found = me.assets_found.concat(assets);
            for (var i = 0; i < assets.length; i++) {
                me.no_assets_yet = false;
                if (assets[i].page_resource) {
                    ++me.page_resource_count;
                }
                var after_merge = me.mergeRedundant(assets[i]);
                if (after_merge) {
                    after_merge.html_id = me.assetHtmlID(after_merge);
                    me.ASYNC.display(after_merge, /*index*/assets.length - 1);
                    window.MediathreadCollect.assetBucket = assets;
                    if (window.console) {
                        window.console.log(assets);
                    }
                }
            }

            ++me.handler_count;

            // Whenever an asset is found, even if it's async, remove
            // the "no assets found" error.
            if (me.assets_found.length > 0) {
                $('.no-asset-alert').remove();
            }

            if (me.handler_count >= me.final_count) {
                me.ASYNC.finish({'found': !me.no_assets_yet});
            }
        };
        this.walkFrames = function() {
            var rv = {all: []};
            rv.all.unshift({
                'frame': window,
                'document': document,
                'window': window,
                'hasBody': MediathreadCollect.hasBody(document)
            });
            var max = (
                (rv.all[0].hasBody) ?
                    document.body.offsetWidth * document.body.offsetHeight :
                    0);
            rv.best = ((max) ? rv.all[0] : null);
            function _walk(index, domElement) {
                try {
                    var doc = this.contentDocument ||
                        this.contentWindow.document;
                    //if this fails, security issue
                    doc.getElementsByTagName('frame');
                    var context = {
                        frame: this,
                        document: doc,
                        window: this.contentWindow,
                        hasBody: MediathreadCollect.hasBody(doc)
                    };
                    rv.all.push(context);
                    var area = context.hasBody * this.offsetWidth *
                        this.offsetHeight;
                    if (area > max) {
                        rv.best = context;
                    }
                    $('frame,iframe', doc).each(_walk);
                } catch (e) {/*probably security error*/}
            }
            $('frame,iframe').each(_walk);
            return rv;
        };

    },/*****************
     END Finder
      *****************/
    'Interface': function(host_url, options) {
        var M = MediathreadCollect;
        this.options = {
            login_url: null,
            tab_label: 'Analyze in Mediathread',
            not_logged_in_message: 'You are not logged in to Mediathread.',
            login_to_course_message: 'login to your Mediathread course',
            link_text_for_existing_asset: 'Link in Mediathread',
            target: ((M.hasBody(document)) ? document.body : null),
            postTarget: '_top',
            top: 100,
            side: 'left',
            fixed: true,
            message_no_assets: 'Sorry, no supported assets were found on ' +
                'this page. Try going to an asset page if you are on a ' +
                'list/search page.  If there is a video on the page, press ' +
                'play and then try again.',
            message_no_assets_short: 'No Items',
            message_disabled_asset: 'This item cannot be embedded on ' +
                'external sites.',
            widget_name: 'the extension'
        };
        if (options) {
            for (var a in options) {
                this.options[a] = options[a];
            }
        }
        //bring in options from MediathreadCollectOptions
        for (var b in this.options) {
            if (M.options[b]) {
                this.options[b] = M.options[b];
            }
        }

        var o = this.options;
        var me = this;
        var comp = this.components = {};

        this.onclick = function(evt) {
            if (me.windowStatus) {
                return;
            }
            me.findAssets();
        };

        this.visibleY = function(target) {
            return target.ownerDocument.body.scrollTop;
        };
        this.showWindow = function() {
            me.windowStatus = true;
            if (comp.window) {
                comp.window.style.top = me.visibleY(comp.window) + 'px';
                comp.window.style.display = 'block';
                comp.tab.style.display = 'none';
                $(comp.ul).empty();
                if (!MediathreadCollect.user_ready()) {
                    $(comp.h2).empty().get(0)
                        .appendChild(document.createTextNode('Login required'));
                    o.login_url = o.login_url ||
                        host_url.split('/', 3).join('/');
                    $(comp.message).empty().append(
                        me.elt(null,'span','',{},
                                 [o.not_logged_in_message,
                                  me.elt(null,'br','',{}),
                                  'Please ',
                                  me.elt(null,'a','',{
                                      href: o.login_url,
                                      target: '_blank',
                                      style: 'color:#8C3B2E;'
                                  },[o.login_to_course_message]),
                                  ', and then click the ' + o.widget_name +
                                  ' again to import items.'
                                 ]));
                    $('.sherd-asset').css({
                        display: 'none'
                    });
                    $('button').remove();
                    var messageDiv = $('<div class="message-div"></div>');
                    var messageClose = $('<div class="message-close">X<div/>');
                    var winHeight = $(window).height();
                    var winWidth = $(window).width();
                    messageClose.appendTo(messageDiv);
                    messageDiv.css({
                        'top': winHeight / 2 - 125 + 'px',
                        'left': winWidth / 2 - 267 + 'px',
                        'display': 'none'
                    }).appendTo('.sherd-analyzer');

                    $('.sherd-window-inner h2').addClass('not-logged-in');

                    $('.sherd-window-inner a').addClass('not-logged-in');

                    $('.sherd-window').appendTo(messageDiv);
                    messageDiv.fadeIn(1000);

                    messageDiv.click(function() {
                        $('.sherd-analyzer').remove();
                    });
                } else {
                    var importHeader = $('<h2 class="import-header"/>');
                    var importHeaderWrap = $('<div id="import-header-wrap"/>');
                    importHeader.text('Choose item(s) to add to collection');
                    importHeaderWrap.append(importHeader);
                    $(comp.h2).empty().append(importHeaderWrap);
                    if (comp.message.tagName) {
                        $(comp.message).empty();
                    }
                }
            }
        };
        this.elt = function(doc, tag, className, style, children) {
            // we use this to be even more careful than jquery for contexts
            // like doc.contentType='video/m4v' in firefox
            doc = doc || comp.top.ownerDocument;
            return M.elt(doc, tag, className, style, children);
        };
        this.setupContent = function(target) {
            var exists = $('div.sherd-analyzer', target);
            if (exists.length) {
                comp.top = exists.empty().get(0);
            } else {
                comp.top = target.ownerDocument.createElement('div');
                comp.top.setAttribute('class','sherd-analyzer');
                target.appendChild(comp.top);
            }
            var pageYOffset = me.visibleY(target) + o.top;
            var pageLength = $(document).height();
            $(comp.top).css('height', pageLength);
            // if page is long make sure the user is placed at top
            $(document).scrollTop(0);
            var doc = target.ownerDocument;
            comp.top.appendChild(
                me.elt(doc,'div','sherd-tab','',[o.tab_label]));
            comp.top.appendChild(
                me.elt(doc,'div','sherd-window','', [
                    me.elt(doc,'div','sherd-window-inner','',[
                        me.elt(
                            doc,'button','sherd-close btn-primary','',['X']),
                        me.elt(
                            doc,
                            'button',
                            'sherd-collection btn-primary',
                            '',
                            ['Go to Collection']),
                        me.elt(
                            doc,'h2','','',
                            ['Select "Analyze Now" to edit one item ' +
                             'immediately, or "Send to Collection" to ' +
                             'send an item and keep collecting on this page.'
                            ]),
                        me.elt(
                            doc,'p','sherd-message','',
                            ['Searching for items....']),
                        me.elt(doc,'ul','sherd-asset','')
                    ])
                ])
            );

            comp.tab = comp.top.firstChild;
            comp.window = comp.top.lastChild;
            comp.ul = comp.top.getElementsByTagName('ul')[0];
            comp.h2 = comp.top.getElementsByTagName('h2')[0];
            comp.close = comp.top.getElementsByTagName('button')[0];
            comp.collection = comp.top.getElementsByTagName('button')[1];
            comp.message = comp.top.getElementsByTagName('p')[0];

            M.connect(comp.tab, 'click', this.onclick);
            M.connect(comp.collection, 'click', function(evt) {
                var hostURL = MediathreadCollectOptions.host_url;
                var url = me.unHttpsTheLink(hostURL.split(/\/save\//)[0]);
                window.location.replace(url + '/asset/');
            });
            M.connect(comp.close, 'click', function(evt) {
                $('.sherd-analyzer').remove();
                comp.window.style.display = 'none';
                if (MediathreadCollect.options.decorate) {
                    comp.tab.style.display = 'block';
                }
                me.windowStatus = false;
            });
        };
        if (o.target) {
            this.setupContent(o.target);
        }

        this.findAssets = function() {
            me.showWindow();
            me.finder = new M.Finder();
            me.finder.ASYNC.display = me.displayAsset;
            me.finder.ASYNC.remove = me.removeAsset;
            me.finder.ASYNC.best_frame = me.maybeShowInFrame;
            me.finder.ASYNC.finish = me.finishedCollecting;
            me.finder.findAssets();
        };

        this.maybeShowInFrame = function(frame) {
            if (!comp.window && frame) {
                var target = o.target || frame.document.body;
                me.setupContent(target);
                me.showWindow();
            }
        };

        this.clearAssets = function() {
            $(comp.ul).empty();
        };
        this.removeAsset = function(asset) {
            $('#' + asset.html_id).remove();
        };
        this.unHttpsTheLink = function(url) {
            newUrl = 'http://' + url.split('://')[1];
            return newUrl;
        };
        this.displayAsset = function(asset, index) {
            var assetUrl = asset.sources[asset.primary_type];
            if (typeof assetUrl !== 'undefined') {
                var uri = URI(assetUrl);

                // asia.si.edu sets max_w to set a thumbnailed size.
                uri.removeQuery('max_w');
                uri.removeQuery('max_h');

                asset.sources[asset.primary_type] = uri.href();
            }
            if (!asset || assetUrl === 'http://undefined') {
                return;
            }
            var doc = comp.ul.ownerDocument;
            var li = doc.createElement('li');
            var jump_url = M.obj2url(host_url, asset);
            var form = M.obj2form(host_url, asset, doc, o.postTarget, index);
            li.id = asset.html_id;
            li.appendChild(form);

            var img = asset.sources.thumb ||
                asset.sources.image ||
                asset.sources.poster;
            var newAsset;
            if (img) {
                newAsset = me.elt(null, 'img', 'sherd-image', {
                    src: img,
                    style: 'max-width: 215px; max-height: 150px'
                });
                $(form.firstChild).empty().append(newAsset);
            } else {
                asset.sources.thumb =
                    host_url.split('save')[0] + 'media/img/nothumb_video.png';
                newAsset =
                    me.elt(null, 'img', 'sherd-video', {
                        src: asset.sources.thumb,
                        style: 'max-width:215px;max-height:150px'
                    });
                $(form.firstChild).empty().append(newAsset);
            }
            if (asset.disabled) {
                $(form.lastChild).text(o.message_disabled_asset);
            } else if (MediathreadCollect.user_ready()) {
                form.submitButton = me.elt(
                    null, 'input', 'analyze btn-primary',
                    {
                        type: 'button',
                        value: 'Open in Mediathread'
                    });
                form.submitButton2 = me.elt(
                    null, 'input', 'cont btn-primary',
                    {
                        type: 'button',
                        value: 'Collect'
                    });
                $(form).append(form.submitButton2);
                $(form).append(form.submitButton);
                $(form.submitButton).click(function() {
                    var action = me.unHttpsTheLink(
                        $(this).parent().attr('action'));
                    $(this).parent().attr('action', action);
                    $(this).parent().submit();
                });
                $(form.submitButton2).click(function() {
                    var $buttonAsset = $(this);
                    collectPopupClickHandler(form, me, $buttonAsset, host_url);
                });
            }
            if (comp.ul) {
                if (comp.ul.firstChild !== null &&
                    comp.ul.firstChild.innerHTML === o.message_no_assets) {
                    $(comp.ul.firstChild).remove();
                }
                comp.ul.appendChild(li);
            }
        };
        this.finishedCollecting = function(results) {
            //alert(results)
            if (comp.message) {
                comp.message = ''; // erase searching message
                if (!results.found) {
                    $(comp.h2).text(o.message_no_assets_short);
                    $(comp.ul).html(me.elt(
                        comp.ul.ownerDocument, 'li', '', '',
                        [o.message_no_assets]));
                }
            }
        };
        this.showAssets = function(assets) {
            me.showWindow();
            me.clearAssets();
            for (var i = 0; assets.length > i; i++) {
                me.displayAsset(assets[i]);
            }
            if (assets.length > 1 && o.allow_save_all) {
                me.addSaveAllButton(assets.length);
            }
        };
        this.addSaveAllButton = function(count) {
            var save_all = document.createElement('li');
            comp.ul.appendChild(save_all);
            ///TODO: cheating without possible dom weirdness
            var $button = ('<button>', {
                onclick: 'MediathreadCollect.g.saveAll()'
            });
            $button.text('Save All ' + count + ' Items');
            $(save_all).append($button);
            comp.saveAll = save_all;
            comp.saveAllButton = save_all.firstChild;
        };
        this.saveAll = function() {
            ///TODO: cheating without possible dom weirdness
            // (e.g. assuming same document)
            if (!confirm('Are you sure?  This could take some time....')) {
                return;
            }
            var $saveAllButton = $(comp.saveAllButton);
            $saveAllButton.attr('disabled', true);
            $saveAllButton.text('Saving...');

            var all_forms = $('form', comp.ul);
            var done = 0;
            var frmids = 0;
            var todo = all_forms.length;
            var form_dict = {};
            var updateForm = function(frm, new_href) {
                if (frm) {
                    frm.disabled = true;
                    $(frm.submitButton).remove();
                    if (new_href) {
                        $(frm).append(me.elt(null,'span','',{}, [
                            me.elt(
                                null, 'a', '',
                                {href: new_href},
                                [o.link_text_for_existing_asset])
                        ]));
                    } else {
                        $(frm).append(me.elt(
                            null,'span','',{},[' Saved! ']));
                    }
                }
            };
            if (window.postMessage) {
                $(window).bind('message', function(jevt) {
                    //eh, let's not use this after all
                    var evt = jevt.originalEvent;
                    if (host_url.indexOf(evt.origin) === -1) {
                        return;
                    }
                    var parsed = evt.data.split('|');
                    updateForm(form_dict[ parsed[1] ], parsed[0]);
                });
            }
            all_forms.each(function() {
                var iframe = document.createElement('iframe');
                iframe.height = iframe.width = 1;
                iframe.id = this.id + '-iframesubmit';
                comp.window.appendChild(iframe);
                var target = iframe.contentDocument ||
                    iframe.contentWindow.document;
                var new_frm = target.createElement('form');
                new_frm.action = this.action;
                new_frm.method = 'POST';
                $(new_frm).append($(this).clone());
                target.body.appendChild(new_frm);

                var noui = target.createElement('input');
                noui.name = 'noui';
                noui.value = 'postMessage' + (++frmids);
                noui.type = 'hidden';
                new_frm.appendChild(noui);

                //save value so we can get to it later
                this.id = 'sherdbookmarklet-form-' + (noui.value);
                form_dict[noui.value] = this;

                //special since it was set by DOM (or changed) above
                new_frm.elements.title.value = this.elements.title.value;

                $(iframe).load(function(evt) {
                    ++done;
                    $(comp.saveAllButton).text(
                        'Saved ' + done + ' of ' + todo + '...');

                    var frmid = String(this.id).slice(
                        0, -('-iframesubmit'.length));
                    updateForm(document.getElementById(frmid), false);

                });
                new_frm.submit();

            });
            // TODO: this will be a huge pain, since it needs to be
            // cross-domain.
        };

    }, /*END Interface*/
    getURLParameters: function(name) {
        return decodeURIComponent((new RegExp(
            '[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(
                location.search) || [null, ''])[1].replace(/\+/g, '%20')) ||
            null;
    }
};/*MediathreadCollect (root)*/

if (!window.MediathreadCollectOptions) {
    window.MediathreadCollectOptions = {};
}

///1. search for assets--as soon as we find one, break out and send show: true
///2. on request, return a full asset list
///3. allow the grabber to be created by sending an asset list to it
MediathreadCollect.options = MediathreadCollectOptions;

if (MediathreadCollectOptions.user_status) {
    MediathreadCollect.update_user_status(
        MediathreadCollectOptions.user_status);
}
