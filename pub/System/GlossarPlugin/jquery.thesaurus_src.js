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
    UNAPPROPRIATE_TAGS = {'SCRIPT':1, 'BASE':1, 'LINK':1, 'META':1, 'STYLE':1, 'TITLE':1, 'APPLET':1, 'OBJECT':1, 'TEXTAREA':1, 'FORM':1, 'INPUT':1, 'DFN':1},
    DEFAULTCSS_TPL =
        'div.thesaurus { font-size: 12px; font-family: Arial; position: absolute; width: 300px; z-index: auto; -moz-box-shadow: 5px 5px 5px #444; -webkit-box-shadow: 5px 5px 5px #444; }' +
        'div.thesaurus .thesaurus-header { padding: 5px;  background-color: #3C5F87; -moz-border-radius: 5px 5px 0 0; -webkit-border-radius: 5px 5px 0 0; }' +
        'div.thesaurus .thesaurus-header a.term { color: white; font-weight: bold; }' +
        'div.thesaurus .thesaurus-header .term_editbtn { float: right; }' +
        'div.thesaurus .thesaurus-body { padding: 5px;  border: 1px solid #3C5F87; background-color: #fff; -moz-border-radius: 0 0 0 5px; -webkit-border-radius: 0 0 0 5px; }' +
        'div.thesaurus .thesaurus-addendum { background-color: #ddd; margin-top: 1em; }' +
        'div.thesaurus .thesaurus-box-title { font-weight: bold; }' +
        'div.thesaurus .thesaurus-alts { margin-top: 0.5em; }' +
        'div.thesaurus .thesaurus-alts ul { margin: 0; }' +
        'dfn.thesaurus { text-decoration: none; font-style: inherit; border-bottom: 1px dashed black; cursor: pointer; }' +
        '.hidden {display: none}',
    TOOLTIP_LOADING_TPL = '<img src="'+foswiki.getPreference('PUBURLPATH')+'/System/JQueryPlugin/images/spinner.gif">',
    TOOLTIP_BODY_TPL = '<div class="thesaurus-header"><a class="term_editbtn foswikiButton">'+lang.btn_edit_label+'</a><a class="term"></a></div><div class="thesaurus-body"><div class="thesaurus-text"></div><div class="thesaurus-addendum"><div class="thesaurus-syns"><span class="thesaurus-box-title">'+lang.synonyms+': </span><div class="thesaurus-box-content"></div></div><div class="thesaurus-alts"><span class="thesaurus-box-title">'+lang.alt_meanings+':</span><div class="thesaurus-box-content"></div></div></div>';

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
 * Modifies contet of the requested tooltip
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
        this.boxes.syns = this.boundingBox.find('div.thesaurus-syns .thesaurus-box-content');
        this.boxes.alts = this.boundingBox.find('div.thesaurus-alts .thesaurus-box-content');
        this.boxes.edit = this.boundingBox.find('a.term_editbtn').hide();
        this.boxes.title.html($(this.currentTarget).text());
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
        if (text === null) {
            this.boxes[box].empty().parent().hide();
        } else {
            this.boxes[box].parent().show();
        }
        if (typeof text == 'String') {
            this.boxes[box].html(text);
        } else {
            this.boxes[box].empty().append(text);
        }
    },
    setLink : function(href) {
        this.boxes.title.attr('href', href);
    },
    setEditLink : function(href) {
        if (href === null)
            return this.boxes.edit.hide();

        this.boxes.edit.attr('href', href).show();
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


	if (rCornerW < this.boundingBox.width()) // Original: this.boundingBox.offsetWidth
            left = scrollLeft + e.clientX - this.boundingBox.width();
	else
            left = scrollLeft + e.clientX;

	if (bCornerH < this.boundingBox.height()) // Original: this.boundingBox.offsetHeight
            top = scrollTop + e.clientY - this.boundingBox.height();
	else
            top = scrollTop + e.clientY;

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
    terms : {},
    topics : {},
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
    _processOverlayTooltip : function(tooltipNode, parentTooltipNode, terms) {
        var term = $(parentTooltipNode).text();
        if (tooltipNode) {
            this._thesaurifyRecursive($(tooltipNode).find('.thesaurus-text')[0], $(parentTooltipNode).attr('id'), terms);
            this.bindUI(tooltipNode);
        }
    },
    /**
     * Set up tooltip contents once all data is loaded
     */
    _populateTooltip : function(e, instance, data, term) {
        var topics = $.extend({}, this.topics);
        if (this.options.pMode == 'on')
            ; // do nothing
        else if (this.options.pMode == 'single')
            delete topics[data.topic];
        else
            topics = {};

        var o = this;
        // Click handler for synset links generated in bottom section
        var synsetClick = function(ev) {
            // Fetching another definition for the same node, so get rid of cache
            delete o.cache[term];
            // Make sure the pointer doesn't suddenly jump outside the tooltip
            var box = $(instance.boxes.body);
            box.css('min-height', box.height()+'px');
            o._fetchTooltip(e, instance, term, ev.data.topic);
            ev.preventDefault();
            return false;
        };

        // Work horse: cobble together all the things to fill into the tooltip
        var syns = $('<ul></ul>');
        var alts = syns.clone();
        var linkbase = foswiki.getPreference('SCRIPTURLPATH')+'/view'+foswiki.getPreference('SCRIPTSUFFIX')+'/'+this.options.web;
        // Alternative entries
        if (this.terms[term].length > 1) {
            $.each(this.terms[term], function(_idx, topic) {
                if (topic == data.topic) return;
                // Generate synset
                var link = $('<a href="#"></a>');
                link.text(o.topics[topic].join(', '));
                link.attr('title', topic);
                link.on('click', {topic: topic}, synsetClick);
                var li = $('<li></li>');
                li.append(link);
                alts.append(li);
            });
        } else {
            alts = null;
        }
        if (this.topics[data.topic].length > 1) {
            var showterms = [];
            $.each(this.topics[data.topic], function(_idx, aTerm) {
                if (aTerm == term) return;
                showterms.push(aTerm);
            });
            syns = showterms.join(', ');
        } else {
            syns = null;
        }
        var content = {
            title: this._displayTerm(term),
            titlehint: data.topic,
            text: data.text,
            alts: alts,
            syns: syns
        };
        Tooltip.setContent(e, content);
        instance.setLink(linkbase +'/'+ data.topic);
        if (data.edit) {
            instance.setEditLink(foswiki.getPreference('SCRIPTURLPATH')+'/edit'+foswiki.getPreference('SCRIPTSUFFIX')+'/'+this.options.web+'/'+data.topic);
        } else {
            instance.setEditLink(null);
        }
        this._processOverlayTooltip(instance.boxes.text, e.currentTarget, this._generateTermsIdx(topics));
    },
    _fetchTooltip : function(e, instance, term, topic) {
        Tooltip.setContent(e, {title: this._displayTerm(term), text: TOOLTIP_LOADING_TPL, syns: null, alts: null});
        instance.setEditLink(null);
        var fromcache = this.cache[term];
        if (undefined !== fromcache)
            return this._populateTooltip(e, instance, fromcache, term);

        if (undefined === topic) topic = this.terms[term][0];
        var o = this;
        $.getScript(this.options.controller + "?thetopic="+ topic, function() {
                fromcache = o._processResponse($.callbackData);
                o.cache[term] = fromcache;
                o._populateTooltip(e, instance, fromcache, term);
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
            this._fetchTooltip(e, instance, term);
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
            alert(errorMsg);
            return null;
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
        $.each(topics, function(topic, terms) {
            $.each(terms, function(id2, term) {
                if (term2topics[term] === undefined)
                    term2topics[term] = [];
                term2topics[term].push(topic);
            });
        });
        return term2topics;
    },
    /**
     * 1) Loads list of terms from server
     * 2) Searches terms in DOM
     * 3) Marks up found terms
     * 4) Binds eventhandlers to them
     */
    bootstrap : function() {
        var o = this;
        $.ajax({
                url:this.options.controller+ "?" + this.options.id,
                dataType: "script",
                success: $.proxy(function(){
                  this.topics = this._processResponse($.callbackData);
                  // Downcase the terms for case-insensitive lookups
                  if (this.options.caseSensitive == 'off') $.each(this.topics, function(idx, termset) {
                      o.topics[idx] = $.map(termset, function(val) {
                          var lcval = val.toLowerCase();
                          o.canonicalTerms[lcval] = val;
                          return lcval;
                      });
                  });
                  this.terms = this._generateTermsIdx(this.topics);
                  $.each(this.options.containers, function(i, node) {
                    o._thesaurifyRecursive(node, undefined, o.terms);
                  });
                  this.bindUI('body');
                }, this),
                cache: true
        });
    },
    /**
     * Check the node value against terms list
     * @param HTMLNode node
     */
    _thesaurifyNode : function(node, relId, terms) {
        var html = $('<span></span>').append($(node).clone()).html();
        var modifier = this.options.caseSensitive!="off"?"g":"gi";
        $.each(terms, function(inx, term) {
            // \b does not work with non-ASCII letters, so use XRegExp lib w/ Unicode addon
            // \P{L} = extension to match everything except Unicode letters
            var re = XRegExp('(^|\\P{L})('+XRegExp.escape(inx)+')(\\P{L}|$)', modifier);
            if (relId)
                html = html.replace(re, '$1<dfn rel="'+ relId +'" class="thesaurus">$2</dfn>$3');
            else
                html = html.replace(re, '$1<dfn class="thesaurus">$2</dfn>$3');
        });
        $(node).replaceWith(html);
    },
    /**
     * Traverses configured nodes for all their children textNodes
     * @param HTMLNode node
     */
    _thesaurifyRecursive : function(node, relId, terms) {
        var nodes = [];
        $.each($(node).get(), $.proxy(function(inx, el){
            $.each(el.childNodes, $.proxy(function(i, child){
                if (child.childNodes.length && undefined === UNAPPROPRIATE_TAGS[child.tagName]) {
                    this._thesaurifyRecursive(child, relId, terms);
                }
                // Is it a non-empty text node?
                if (undefined === child.tagName && child.nodeValue.length) {
                    nodes.push(child);
                }
            }, this));
        }, this));

        $.each(nodes, $.proxy(function(idx, el) {
            this._thesaurifyNode(el, relId, terms);
        }, this));
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
    web: 'Glossar', // Web we're playing in
    popindelay: 1000,
    preload: 400,
    pMode: 'on',
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
// Authomaticaly applied when DOM is ready
$(document).ready(function(){
    new Thesaurus(Thesaurus.options);

});

})( jQuery );
