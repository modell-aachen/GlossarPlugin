/*
* Thesaurus
*
* @package thesaurus
* @author $Author: sheiko $
* @version $Id: jquery.thesaurus.js, v 3.0 $
* @license GNU
* @copyright (c) Dmitry Sheiko http://www.cmsdevelopment.com
*
* Adapted and customised by
* Modell Aachen GmbH http://modell-aachen.de/
*/

(function( $ ) {

var lang = GlossarLang,
    TPL_TAG_OPEN = '~~',
    TPL_TAG_CLOSE = '~~',
    UNAPPROPRIATE_TAGS = {'SCRIPT':1, 'BASE':1, 'LINK':1, 'META':1, 'STYLE':1, 'TITLE':1, 'APPLET':1, 'OBJECT':1, 'TEXTAREA':1, 'FORM':1, 'INPUT':1, 'DFN':1, 'svg':1, 'SVG':1},
    DEFAULTCSS_TPL =
        'div.thesaurus { font-size: 12px; font-family: Arial; position: absolute; width: 720px; z-index: auto;}' +
        'div.thesaurus .thesaurus-header { padding: 5px;  background-color: #3C5F87;}' +
        'div.thesaurus .thesaurus-header a.term { color: white; font-weight: bold; }' +
        'div.thesaurus .thesaurus-header .term_editbtn { float: right; }' +
        'div.thesaurus .thesaurus-body { padding: 5px;  border: 1px solid #3C5F87; background-color: #fff;}' +
        'div.thesaurus .thesaurus-addendum { background-color: #ddd; padding-bottom: 0.5em; }' +
        'div.thesaurus .thesaurus-alts ul { margin: 0; }' +
        'dfn.thesaurus { text-decoration: none; font-style: inherit; border-bottom: 1px dashed black; cursor: pointer; }' +
        '.hidden {display: none}',
    TOOLTIP_LOADING_TPL = '<img src="%PUBURLPATH%/%SYSTEMWEB%/JQueryPlugin/images/spinner.gif">', // can't use foswiki object yet, we might be loaded before FOSWIKI::PREFERENCES
    TOOLTIP_DISAMBIG_TPL = '<div class="thesaurus-addendum"><div class="thesaurus-alts-title">'+lang.disambiguate+'</div><ul class="thesaurus-alts"></ul></div>',
    // This template is overridden by an entry from LocalSite.cfg. If you change this, please change the default in Config.spec, too.
    TOOLTIP_BODY_TPL = '<div class="thesaurus-header"><a class="term_editbtn foswikiButton">'+lang.btn_edit_label+'</a><a class="term"></a></div><div class="thesaurus-body"><div class="thesaurus-text"></div></div>';

var Collection = function() { };
/**
 * Collection of tooltip widgets
 */
Collection.prototype = {
    _data: [],
    length : function() {
        return this._data.length;
    },
    append : function(id, instance) {
        this._data[id] = instance;
    },
    findById : function(id) {
        return this._data[id] === undefined ? null : this._data[id];
    },
    remove : function(id) {
        if (this._data[id] !== undefined) {
            delete this._data[id];
        }
    }
};
/**
 * Tooltip component
 */
var Tooltip = function(options){
    $.extend(this.options, options);
    this.init();
    this.renderUI();
    this.bindUI();
};

Tooltip.collection = new Collection();
Tooltip.ids = []; // Helps with unique ids

/**
 * Used when Mouse leaves the term
 * @param event e
 */
Tooltip.hide = function(e) {
    var instance = Tooltip.collection.findById(e.currentTarget.id);
    if (null !== instance) {
        instance.delayedDestruction();
    }
};
/**
 * Tooltip self-destruction
 * @param string id
 */
Tooltip.remove = function(id) {
    Tooltip.collection.remove(id);
};
/**
 * Makes Id for the tooltip
 * @param HTMLNode node
 */
Tooltip.normalize = function(node) {
    if (!node.id) {
        Tooltip.ids.push(node.id);
        node.id = 'dfn' + (Tooltip.ids.length);
    }
};
/**
 * Modifies content of the requested tooltip
 * @param event e
 * @param string text
 */
Tooltip.setContent = function(e, data) {
    if (undefined !== e.currentTarget.id) {
        var instance = Tooltip.collection.findById(e.currentTarget.id);
        if (null !== instance) $.each(data, function(idx, text) {
            instance.setElementText(idx, text);
        });
    }
};
/**
 * Shows requested tooltip from the collection
 * @param event e
 * @returns Tooltip instance
 */
Tooltip.show = function(e) {
    Tooltip.normalize(e.currentTarget);
    var instance = Tooltip.collection.findById(e.currentTarget.id);
    if (null === instance) {
        instance = new Tooltip({
                event: e,
                delay :Thesaurus.options.delay,
                effect :Thesaurus.options.effect,
                popindelay :Thesaurus.options.popindelay,
                preload :Thesaurus.options.preload
            });
        Tooltip.collection.append(e.currentTarget.id, instance);
    } else {
        // The same term is hovered before it's tooltip self-destruction
        instance.cancelDelayedDestruction();
    }
    return instance;
};

Tooltip.prototype = {
    options: {},
    boundingBox: null,
    currentTarget: null,
    parentDelayed : false,
    timer : null,
    init : function() {
        this.currentTarget = this.options.event.currentTarget;
    },
    /**
     * Renders tooltip
     */
    renderUI : function() {
        $('body').append('<div id="thesaurus-'
            + this.currentTarget.id + '" class="thesaurus hidden"><!-- --></div>');
        this.boundingBox = $('#thesaurus-' + this.currentTarget.id);
        this.boundingBox.append(TOOLTIP_BODY_TPL);
        this.boxes = {};
        this.boxes.title = this.boundingBox.find('a.term');
        this.boxes.body = this.boundingBox.find('div.thesaurus-body');
        this.boxes.text = this.boundingBox.find('div.thesaurus-text');
        this.boxes.edit = this.boundingBox.find('a.term_editbtn').hide();
        this.boxes.title.html($(this.currentTarget).text());
        TOOLTIP_LOADING_TPL = TOOLTIP_LOADING_TPL.replace('%PUBURLPATH%', foswiki.getPreference('PUBURLPATH')).replace('%SYSTEMWEB%', foswiki.getPreference('SYSTEMWEB'));
        this.boxes.text.html(TOOLTIP_LOADING_TPL);
        this.adjust();
        if ($.fn.bgiframe) {
            this.boundingBox.bgiframe();
        }
        this.timer = window.setTimeout($.proxy(this.popIn, this), this.options.preload);
        //this.popIn();
    },
    popIn : function() {
        if (this.options.effect) {
            this.applyEffect(this.options.effect);
        } else {
            this.boundingBox.removeClass("hidden");
        }
        this.adjust();
    },
    /**
     * Applies effect when the tooltip is appearing
     * @param string effect
     */
    applyEffect : function(effect) {
        switch (effect) {
            case "fade":
                this.boundingBox.fadeIn('slow');
                break;
            case "slide":
                this.boundingBox.slideDown('slow');
                break;
        }
    },
    bindUI : function() {
        this.boundingBox.unbind('mouseover')
            .bind('mouseover', $.proxy(this.cancelDelayedDestruction, this));
        this.boundingBox.unbind('mouseleave')
            .bind('mouseleave', $.proxy(this.delayedDestruction, this));
    },

    /**
     * Implemets cascade tooltips
     * @param string action - either cancelDelayedDestruction or delayedDestruction
     */
    applyOnParent : function(action) {
        var parentId = $(this.currentTarget).attr('rel');
        if (parentId) {
            var instance = Tooltip.collection.findById(parentId);
            if (null !== instance) {
                switch (action) {
                    case 'cancelDelayedDestruction':
                        instance._parentDelayed = true;
                        instance.cancelDelayedDestruction();
                        break;
                    case 'delayedDestruction':
                        if (instance._parentDelayed) {
                            instance.delayedDestruction();
                            instance._parentDelayed = false;
                        }
                        break;
                }
            }
        }
    },

    /**
     * Changes content of tooltip
     * @param string text
     * @param title text
     */
    setElementText : function(box, text) {
        if (box == 'titlehint') {
            this.boxes.title.attr('title', text);
            return;
        }
        this.boxes[box].html(text);
    },
    setLink : function(href) {
        this.boxes.title.attr('href', href);
    },
    setEditLink : function(href) {
        if (href === null)
            return this.boxes.edit.hide();

        this.boxes.edit.attr('href', href).show();
    },
    addClass : function(newclass) {
        this.boundingBox.addClass(newclass);
    },
    /**
     * Cancels request to destory the tooltip
     * @see delayedDestruction
     */
    cancelDelayedDestruction : function() {
        this.applyOnParent('cancelDelayedDestruction');
        if (this.timer) {
            window.clearTimeout(this.timer);
            this.timer = null;
        }
    },
    /**
     * Mouse left term and tooltip area, so destuction of tooltip requested
     * Though if the mouse pointer returns to the areas before delay expired,
     * the request will be canceled
     */
    delayedDestruction: function() {
        this.applyOnParent('delayedDestruction');
        this.timer = window.setTimeout($.proxy(this.destroy, this), this.options.delay);
    },
    /**
     * Removes Tooltip HTML container and instance ofthe class from the collection
     */
    destroy: function() {
        this.boundingBox.remove();
        Tooltip.remove(this.currentTarget.id);
    },
    /**
     * Adjust tooltip position. It tries to show always within portview
     */
    adjust : function() {
        var e = this.options.event, left, top;

        var rCornerW = $(window).width() - e.clientX;
        var bCornerH = $(window).height() - e.clientY;

        // Compliance with HTML 4/XHTML
        if(document.documentElement && document.documentElement.scrollTop)
            scrollTop = document.documentElement.scrollTop;
        else
            scrollTop = document.body.scrollTop;

        // Compliance with HTML 4/XHTML
        if(document.documentElement && document.documentElement.scrollLeft)
            scrollLeft = document.documentElement.scrollLeft;
        else
            scrollLeft = document.body.scrollLeft;

        if (rCornerW < this.boundingBox.width()){ // Original: this.boundingBox.offsetWidth
            left = scrollLeft + e.clientX - this.boundingBox.width();
            if( left < scrollLeft ) left = scrollLeft;
        } else {
            left = scrollLeft + e.clientX;
        }

        if (bCornerH < this.boundingBox.height()){ // Original: this.boundingBox.offsetHeight
            top = scrollTop + e.clientY - this.boundingBox.height();
            if(top < scrollTop) top = scrollTop;
        } else {
            top = scrollTop + e.clientY;
        }

        this.boundingBox.css("top", (top)+"px");
        this.boundingBox.css("left", (left)+"px");
    }
};

/**
 * Configurable singleton
 */
var Thesaurus = function(options){
    if (null === Thesaurus.instance) {
        $.extend(this.options, options);
        Thesaurus.instance = this;
        this.init();
    } else {
        $.extend(Thesaurus.instance.options, options);
        return Thesaurus.instance;
    }
};

Thesaurus.instance = null;

Thesaurus.prototype = {
    canonicalTerms : {},
    terms : null, // hash of terms with associated topics
    regs : null, // list of regular expressions that match terms
                 // Each entry is an array itself: [RegEx, length of term]
    topics : {}, // hash of topics with associated terms
    options : {}, // Configuration
    cache: {}, // Caches requestd term definitions
    timer : null, // Timer for popup delay
    init: function() {
        this.cssLoad(this.options.css);
        if (!this.options.containers.length) {
            this.options.containers = ['body'];
        }
        this.bootstrap();
    },
    /**
     * Binds event handlers to found terms
     * @param HTMLNode node
     */
    bindUI : function(node) {
        $(node).find('dfn.thesaurus').each($.proxy(function(i, node){
            $(node).bind('mouseenter', $.proxy(this._onMouseOver, this));
            $(node).bind('mouseleave', $.proxy(this._onMouseOut, this));
        },this));
    },
    /**
     * Used when tooltip over tolltip
     * @param HTMLNode tooltipNode
     * @param HTMLNode parentTooltipNode
     */
    _processOverlayTooltip : function(tooltipNode, parentTooltipNode, regs) {
        if (tooltipNode) {
            if (regs) {
                var o = this;
                this._thesaurify(tooltipNode, $(parentTooltipNode).attr('id'), regs);
            } else {
                this.bindUI(tooltipNode);
            }
        }
    },
    /**
     * Set up tooltip contents once all data is loaded
     */
    _populateTooltip : function(e, instance, data, topic) {
        var def;
        // depending on pMode we need a different set of terms/regs
        if (this.options.pMode == 'on') {
            // use all terms on tooltip
            def = $.Deferred(); def.resolve(this.topics, this.regs);
        } else if (this.options.pMode == 'single') {
            // use all terms except the on the tooltip is for
            tooltip_topics = $.extend({}, this.topics);
            delete tooltip_topics[topic];
            def = this._generateTermsIdx(tooltip_topics);
        } else {
            // do not thesaurify anything in the tooltip
            def = $.Deferred(); def.resolve({}, []);
        }
        var o = this;
        def.done(function(tooltip_topics, tooltip_regs) {
            // Cobble together all the things to fill into the tooltip
            var linkbase = foswiki.getPreference('SCRIPTURLPATH')+'/view'+foswiki.getPreference('SCRIPTSUFFIX')+'/';
            var webtopic = data.topic.replace(/\./g, '/');
            Tooltip.setContent(e, {text: data.text});
            instance.setLink(linkbase + webtopic);
            if (data.edit) {
                instance.setEditLink(foswiki.getPreference('SCRIPTURLPATH')+'/edit'+foswiki.getPreference('SCRIPTSUFFIX')+'/'+webtopic+'?t='+(new Date().getTime()/1000));
            } else {
                instance.setEditLink(null);
            }
            if (data.cssclass) {
                instance.addClass(data.cssclass);
            }
            o._processOverlayTooltip(instance.boxes.text, e.currentTarget, tooltip_regs);
        });
    },
    // Takes a list of terms in internal representation and creates a string
    // representation formatted for displaying
    _makeSynset : function(terms) {
        var o = this;
        return $.map(terms, function(t) { return o._displayTerm(t); }).join(', ');
    },
    _fetchTooltip : function(e, instance, term, topic) {
        if (this.options.onlyFirstTermInTitle == 'on') {
            Tooltip.setContent(e, {title: this._displayTerm(this.topics[topic][0]), titlehint: topic, text: TOOLTIP_LOADING_TPL});
        } else {
            Tooltip.setContent(e, {title: this._makeSynset(this.topics[topic]), titlehint: topic, text: TOOLTIP_LOADING_TPL});
        }
        instance.setEditLink(null);
        var fromcache = this.cache[topic];
        if (undefined !== fromcache)
            return this._populateTooltip(e, instance, fromcache, topic);

        var o = this;
        $.getScript(this.options.controller + "?thetopic="+ topic, function() {
                fromcache = o._processResponse($.callbackData);
                if(fromcache.error) {
                    fromcache = {text: '<b><span class="foswikiAlert">'+fromcache.error+'</b></span>', edit: 0};
                }
                o.cache[topic] = fromcache;
                o._populateTooltip(e, instance, fromcache, topic);
        });
    },
    /**
     * on MouseOver event handler
     * @param event e
     */
    _onMouseOver : function(e) {
        var _onMouseOverDelayed = function() {
            var instance = Tooltip.show(e);
            var term = this._internalTerm($(e.currentTarget).text());
            var topics = this.terms[term];
            var forceTopic = $(e.currentTarget).parent().attr('data-glossar');
            if (forceTopic) {
                if(!/[./]/.exec(forceTopic)) forceTopic = foswiki.getPreference('WEB') + '.' + forceTopic;
                forceTopic = forceTopic.replace(/\//g, '.');
                topics = [forceTopic];
            }
            if(!(topics && topics.length)) {
                window.console && console.log("Could not find topics for " + term);
                return;
            }
            var o = this;
            if (topics.length == 1)
                return this._fetchTooltip(e, instance, term, topics[0]);

            // Overloading detected, show disambiguation
            Tooltip.setContent(e, {title: this._displayTerm(term) +" <em>"+ lang.ambiguous +"</em>", text: TOOLTIP_DISAMBIG_TPL});

            // Click handler for synset links generated in bottom section
            var synsetClick = function(ev) {
                // Make sure the pointer doesn't suddenly jump outside the tooltip
                var box = $(instance.boxes.body);
                box.css('min-height', box.height()+'px');
                o._fetchTooltip(e, instance, term, ev.data.topic);
                ev.preventDefault();
                return false;
            };

            var alts = instance.boxes.text.find('.thesaurus-alts');
            $.each(topics, function(_idx, topic) {
                // Generate synset
                var link = $('<a href="#"></a>');
                link.text(o._makeSynset(o.topics[topic]));
                link.attr('title', topic);
                link.on('click', {topic: topic}, synsetClick);
                var li = $('<li></li>');
                li.append(link);
                alts.append(li);
            });
        }
        this.timer = window.setTimeout($.proxy(_onMouseOverDelayed, this), this.options.popindelay);
    },
    /**
     * on MouseOut event handler
     * @param event e
     */
    _onMouseOut : function(e) {
        window.clearTimeout(this.timer);
        this.timer = null;
        Tooltip.hide(e);
    },
    /**
     * Load given CSS file
     * @param string file
     */
    cssLoad : function(file) {
        $('body').append('<style>' + DEFAULTCSS_TPL + '</style>');
        if(file) {
            if(document.createStyleSheet) {
                document.createStyleSheet(file);
            } else {
                $('body').append('<style type="text/css">@import url("'+file+'");</style>');
            }
        }
    },
    /**
     * Indicates message when an error occured retrieving data from seerver side
     * @param object data
     */
    _processResponse : function(data) {
        var errorMsg = null;
        if (undefined === data.status) {
            errorMsg = 'Corrupted response format';
        }
        if ('ok' != data.status) {
            errorMsg = data.errorMsg;
        }
        if (null !== errorMsg) {
            window.console && console.log(errorMsg);
            return {error: errorMsg};
        }
        return data.payload;
    },
    _displayTerm : function(term) {
        return this.options.caseSensitive != 'off' ? term : this.canonicalTerms[term.toLowerCase()];
    },
    _internalTerm : function(term) {
        return this.options.caseSensitive != 'off' ? term : term.toLowerCase();
    },
    _generateTermsIdx : function(topics) {
        var term2topics = {};
        var terms = [];
        var regs = [];
        $.each(topics, function(topic, cterms) {
            $.each(cterms, function(id2, term) {
                if (term2topics[term] === undefined) {
                    term2topics[term] = [];
                    terms.push(term);
                }
                term2topics[term].push(topic);
            });
        });
        var def = $.Deferred();
        var term_len = terms.length;
        var idx = 0;
        var doBatch = $.proxy(function() {
            var i = 200;
            while (i-- && idx < term_len) {
                var escterm = XRegExp.escape(terms[idx]);
                var re = RegExp(escterm, this.re_modifier);
                regs.push([re, terms[idx].length, escterm]);
                idx++;
            }
            if (idx < term_len) {
                setTimeout(doBatch, 10);
                return;
            }
            var sorter = function(a,b) {
                return a[1] - b[1];
            };
            regs.sort(sorter);
            def.resolve(term2topics, regs);
        }, this);
        doBatch();
        return def;
    },
    /**
     * 1) Loads list of terms from server
     * 2) Searches terms in DOM
     * 3) Marks up found terms
     * 4) Binds eventhandlers to them
     */
    bootstrap : function() {
        var o = this;
        o.re_modifier = this.options.caseSensitive!="off"?"":"i";
        o.re_template = XRegExp('^((?:.*?\\P{L})?)(BWARGH)((?:\\P{L}.*)?)$', 's'+o.re_modifier).toString().replace(/(^\/|\/[a-z]*$)/g, '').split('BWARGH');
        var thesaurus = this;
        var count = 0; // number of glossar webs
        $.each(thesaurus.options.ids, function(web, id) {
            count++;
        });
        $.each(thesaurus.options.ids, function(web, id) {
            $.ajax({
                    url:thesaurus.options.controller+ "?id=" + id + "&web=" + web + "&" + encodeURI(foswiki.getPreference('USERNAME')),
                    dataType: "script",
                    success: function(){
                      var newtopics = thesaurus._processResponse($.callbackData);
                      if (!newtopics.error) {
                          thesaurus.topics = jQuery.extend(thesaurus.topics, newtopics);
                      }
                      if(--count) return; // only process terms when all webs are loaded
                      // Downcase the terms for case-insensitive lookups
                      if (thesaurus.options.caseSensitive == 'off') {
                          var mapper = function(val) {
                              var lcval = val.toLowerCase();
                              o.canonicalTerms[lcval] = val;
                              return lcval;
                          };
                          $.each(thesaurus.topics, function(idx, termset) {
                              o.topics[idx] = $.map(termset, mapper);
                          });
                      }
                      thesaurus._generateTermsIdx(thesaurus.topics).done(function(t2t, regs) {
                          thesaurus.terms = t2t;
                          thesaurus.regs = regs;
                          $.each(thesaurus.options.containers, function(i, node) {
                              o._thesaurify(node, undefined, regs);
                          });
                      });
                    },
                    cache: true
            });
        });
    },
    /**
     * Check the node value against terms list
     * @param HTMLNode node
     */
    _thesaurifyNode : function(node, relId, regs) {
        var newNode = this._thesaurifyNodeRecursive(node.nodeValue, relId, regs, regs.length-1);
        if (!newNode) return;
        var theParent = node.parentNode;
        $(node).replaceWith(newNode);
        $(theParent).find('dfn.thesaurus:not(.glossarybound)').addClass('glossarybound').
                bind('mouseenter', $.proxy(this._onMouseOver, this)).
                bind('mouseleave', $.proxy(this._onMouseOut, this));
    },
    _thesaurifyNodeRecursive : function(node, relId, regs, i) {
        if(node.length == 0) return false;
        var html = node;
        i++; // Hack to have the right starting value inside the loop;
        while(i-- > 0) {
            // Try quick test first
            if (!regs[i][0].exec(html)) continue;
            if (!(regs[i][2] instanceof RegExp)) {
                regs[i][2] = RegExp(this.re_template[0] + regs[i][2] + this.re_template[1], this.re_modifier);
            }
            var match = regs[i][2].exec(html);
            if(match) {
                if(relId) {
                    html = '<dfn rel="'+ relId +'" class="thesaurus">' + match[2] + '</dfn>';
                } else {
                    html = '<dfn class="thesaurus">' + match[2] + '</dfn>';
                }
                var leftNode = this._thesaurifyNodeRecursive(match[1], relId, regs, i) || $('<div></div>').text(match[1]).html();
                var rightNode = this._thesaurifyNodeRecursive(match[3], relId, regs, i) || $('<div></div>').text(match[3]).html();
                return  leftNode + html + rightNode;
            }
        }
        return false;
    },
    _thesaurifyCollectNodes : function(node, result) {
        var self = this;
        $.each($(node).get(), $.proxy(function(inx, el){
            $.each(el.childNodes, $.proxy(function(i, child){
                if (child.nodeType == 1 && child.childNodes.length && undefined === UNAPPROPRIATE_TAGS[child.tagName] && !$(child).is(self.options.excludeSelector) ) {
                    this._thesaurifyCollectNodes(child, result);
                }
                // Is it a non-empty text node?
                else if (child.nodeType == 3 && child.nodeValue.length) {
                    result.push(child);
                }
            }, this));
        }, this));
    },
    /**
     * Traverses configured nodes for all their children textNodes
     * @param HTMLNode node
     */
    _thesaurify : function(node, relId, regs) {
        var nodes = [];
        this._thesaurifyCollectNodes(node, nodes);
        var len = nodes.length;
        var idx = 0;
        var def = $.Deferred();
        var doBatch; doBatch = $.proxy(function() {
            var i = 20;
            while (i-- && idx < len) {
                var el = nodes[idx++];
                this._thesaurifyNode(el, relId, regs);
            }
            if (idx < len) setTimeout(doBatch, 10);
            else def.resolve();
        }, this);
        doBatch();
        return def;
    }
};

/**
 * Default configuration
 */
Thesaurus.options = {
    caseSensitive: 'off', // Used when matching found terms againstloaded ones
    delay: 250, // Delay before tooltip self-destruction
    containers: [], // Put here list of selectors for the DOM element you want to analyze for terms
    effect: null, // Can be also fade or slide
    controller: 'controller.csv.php', // Path to the controller
    ids: {'Glossar':null}, // Web/id we're playing in
    popindelay: 1000,
    preload: 400,
    pMode: 'on',
    onlyFirstTermInTitle: 'off',
    excludeSelector: 'DUMMY',
    id: 0
};
// Alternative way to specify nodes you wat analyze for terms occurances
// <code>
//  $('div.some').applyThesaurus();
// </code>
$.fn.applyThesaurus = function() {
    Thesaurus.options.containers.push(this);
}
// Thesaurus configurator
$.Thesaurus = function(options) {
    $.extend(Thesaurus.options, options);
};
// Call this function to initialize the thesaurus.
// You will need to set the required options (controller etc.) prior to initialisation.
$.Thesaurus.init = function() {
    var $popup_body_tpl = $('#GlossarPlugin_popup_body_template');
    if ($popup_body_tpl.length && $popup_body_tpl.html() !== '') {
      TOOLTIP_BODY_TPL = $popup_body_tpl.html();
      $popup_body_tpl.remove();
    }
    new Thesaurus(Thesaurus.options);
};

})( jQuery );
