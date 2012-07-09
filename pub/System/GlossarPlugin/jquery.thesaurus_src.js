/*
* Thesaurus
*
* @package thesaurus
* @author $Author: sheiko $
* @version $Id: jquery.thesaurus.js, v 3.0 $
* @license GNU
* @copyright (c) Dmitry Sheiko http://www.cmsdevelopment.com
*/

(function( $ ) {

var VERSION = "3.0.3",
    SKIPTERMS = '',
    TPL_TAG_OPEN = '~~',
    TPL_TAG_CLOSE = '~~',
    ESCAPERS = '[\\s!;,.%\"\'\\(\\)\\{\\}]',
    UNAPPROPRIATE_TAGS = ['SCRIPT', 'BASE', 'LINK', 'META', 'STYLE', 'TITLE', 'APPLET', 'OBJECT', 'TEXTAREA', 'FORM', 'INPUT', 'DFN'],
    DEFAULTCSS_TPL =
        'div.thesaurus { font-size: 12px; font-family: Arial; position: absolute; width: 300px; z-index: auto; -moz-box-shadow: 5px 5px 5px #444; -webkit-box-shadow: 5px 5px 5px #444; }' +
        'div.thesaurus .thesaurus-header { padding: 5px;  background-color: #3C5F87; -moz-border-radius: 5px 5px 0 0; -webkit-border-radius: 5px 5px 0 0; }' +
        'div.thesaurus .thesaurus-header a { color: white; font-weight: bold; }' +
        'div.thesaurus .thesaurus-header a.reference { position: absolute; right: 5px; z-index: auto; display: block; }' +
        'div.thesaurus .thesaurus-body { padding: 5px;  border: 1px solid #3C5F87; background-color: #fff; -moz-border-radius: 0 0 0 5px; -webkit-border-radius: 0 0 0 5px; }' +
        'dfn.thesaurus { text-decoration: none; font-style: inherit; border-bottom: 1px dashed black; cursor: pointer; }' +
        '.hidden {display: none}',
    TOOLTIP_LOADING_TPL = 'Loading...',
    TOOLTIP_BODY_TPL = '<div class="thesaurus-header"><a class="term"></a></div><div class="thesaurus-body"></div>';

var Collection = function() { }
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
Tooltip.text = function(e, text, title) {
    if (undefined !== e.currentTarget.id) {
        var instance = Tooltip.collection.findById(e.currentTarget.id);
        if (null !== instance) {
            instance.text(text, title);
        }
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
    contentBox: null,
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
        this.adjust();
        this.boundingBox.append(TOOLTIP_BODY_TPL);
        this.boundingBox.find('a.term').html($(this.currentTarget).text());
        this.contentBox = this.boundingBox.find('div.thesaurus-body');
        this.titleBox = this.boundingBox.find('a.term');
        this.contentBox.html(TOOLTIP_LOADING_TPL);
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
    text : function(text, title) {
        this.contentBox.html(text);
	if(undefined !== title) {
            this.titleBox.html(title);
        }
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


	if (rCornerW < this.boundingBox.offsetWidth)
            left = scrollLeft + e.clientX - this.boundingBox.offsetWidth;
	else
            left = scrollLeft + e.clientX;

	if (bCornerH < this.boundingBox.offsetHeight)
            top = scrollTop + e.clientY - this.boundingBox.offsetHeight;
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
    terms : [],
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
    _processOverlayTooltip : function(tooltipNode, parentTooltipNode) {
        var term = $(parentTooltipNode).text();
        if (tooltipNode) {
            // Collect stats when anything is clicked within tooltip
            tooltipNode.die('click').live('click', this, function(e) {
                $.getScript(e.data.options.controller + '?term=' + term + '&onclick=1');
            });
	    if (this.options.pMode == 'on') {
              this._thesaurifyRecursive(tooltipNode, $(parentTooltipNode).attr('id'));
	    }
            this.bindUI(tooltipNode);
        }
    },
    /**
     * on MouseOver event handler
     * @param event e
     */
    _onMouseOver : function(e) {
        this.e = e; // Nasty, but I don't really know how to handle proxy...
        this.timer = window.setTimeout($.proxy(this._onMouseOverDelayed, this), this.options.popindelay);
    },
    _onMouseOverDelayed : function() {
        e = this.e;
        var instance = Tooltip.show(e);
        var term = $(e.currentTarget).text();
        SKIPTERMS = term;
	var fromcache = this.cache[term];
        if (undefined !== fromcache) {
            Tooltip.text(e, fromcache[0], fromcache[1]);
            this._processOverlayTooltip(instance.contentBox, e.currentTarget);
        } else {
            $.getScript(this.options.controller + "?term=" + term,
                $.proxy(function(){
                fromcache = this._processResponse($.callbackData);
		this.cache[term] = fromcache;
                Tooltip.text(e, fromcache[0], fromcache[1]);
                this._processOverlayTooltip(instance.contentBox, e.currentTarget);
            }, this));
        }
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
        return [data.payload, data.title];
    },
    /**
     * 1) Loads list of terms from server
     * 2) Searches terms in DOM
     * 3) Marks up found terms
     * 4) Binds eventhandlers to them
     */
    bootstrap : function() {
//        $.getScript(this.options.controller, $.proxy(function(){
//            this.terms = this._processResponse($.callbackData);
//            $.each(this.options.containers, $.proxy(function(i, node) {
//                this._thesaurifyRecursive(node);
//            }, this));
//            this.bindUI('body');
//        }, this));
        $.ajax({
		url:this.options.controller+ "?" + this.options.id,
                dataType: "script",
                success: $.proxy(function(){
                  this.terms = this._processResponse($.callbackData)[0];
                  $.each(this.options.containers, $.proxy(function(i, node) {
                    this._thesaurifyRecursive(node);
                  }, this));
                  this.bindUI('body');
                }, this),
		cache: true 
	});
    },
    /**
     * Check the node value against terms list
     * @param HTMLNode node
     */
    _thesaurifyNode : function(node, relId) {
        var html = $('<span></span>').append($(node).clone()).html();
        var modifier = this.options.caseSensitive=="on"?"":"i";
        $.each(this.terms, $.proxy(function(inx, term){
            var re = new RegExp('(^|[^a-zA-ZöäüßÄÖÜ])('+term+')([^a-zA-ZöäüßÄÖÜ]|$)', modifier); // XXX \b does not work because of umlauts
            if (relId)
                html = html.replace(re, '$1<dfn rel="'+ relId +'" class="thesaurus">$2</dfn>$3');
            else
                html = html.replace(re, '$1<dfn class="thesaurus">$2</dfn>$3');
        }, this));
        $(node).replaceWith(html);
    },
    /**
     * Traverses configured nodes for all their children textNodes
     * @param HTMLNode node
     */
    _thesaurifyRecursive : function(node, relId) {
        var nodes = [];
        $.each($(node).get(), $.proxy(function(inx, el){
            $.each(el.childNodes, $.proxy(function(i, child){
                if (child.childNodes.length && -1 == $.inArray(child.tagName, UNAPPROPRIATE_TAGS)) {
                    this._thesaurifyRecursive(child, relId);
                }
                // Is it a non-empty text node?
                if (undefined === child.tagName && child.nodeValue.length) {
                    nodes.push(child);
                }
            }, this));
        }, this));

        $.each(nodes, $.proxy(function(idx, el) {
            this._thesaurifyNode(el, relId);
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
