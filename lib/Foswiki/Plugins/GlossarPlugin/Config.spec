#---+ Extensions
#---++ GlossarPlugin
# Plugin to display a glossar as tooltip.
# **STRING**
# The Web where the definitions will be located.
$Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb} = 'Glossar';
# **STRING**
# Selector for the portions of the displayed page in that terms should be highlighted. Be careful not to select your editor.<p>Default setting is for PatternSkin.</p>
$Foswiki::cfg{Extensions}{GlossarPlugin}{Containers} = 'div.patternContent div.foswikiTopic';
# **STRING**
# Selector for individual elements within containers (see above) in which terms should not be highlighted.<p>By default, no elements are excluded.</p>
$Foswiki::cfg{Extensions}{GlossarPlugin}{ExcludeSelector} = 'GlossaryConditionalTag';
# **SELECT null,'fade','slide'**
# Popin effect. Select null for none.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Effect} = 'null';
# **SELECT on,off**
# If terms are case-sensitive.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Case} = 'off'; 
# **NUMBER**
# Additional time you have to hover over a word before the popup appears.<p>You will have to hover PopInDelay + Preload ms before the popup appears.</p>
$Foswiki::cfg{Extensions}{GlossarPlugin}{PopInDelay} = 1000;
# **NUMBER**
# Plugin will try to load the definition Preload ms before the popup will appear. If you set this too low the user might see a "Loading" message.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Preload} = 400;
# **SELECT on,off**
# If enabled, display only one term in a popup's title.
$Foswiki::cfg{Extensions}{GlossarPlugin}{OnlyFirstTermInTitle} = 'off';
# **SELECT on, off, single**
# Choose how definitions will be marked in pupup-windows:
# <ul><li>on: A rose is a rose is a rose... mark all definitions</li><li>off: do not mark any definitions</li><li>single: mark all definitions except those whose definition is shown in the popup</li></ul>
$Foswiki::cfg{Extensions}{GlossarPlugin}{RecursivePopups} = 'off';
# **STRING**
# Custom css file for popups. Leave empty for defaults.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Css} = '';
# **STRING**
# Error message if a definition has not been found (usually that means a definition has been removed since the page was rendered).
$Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg} = '';
# **STRING**
# Error message if a user does not have the rights to view a specific definition.
$Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg} = '';
# **STRING**
# Additional Query you may specify for valid glossar artikles (eg. META:WORKFLOW.name = 'Approved').
$Foswiki::cfg{Extensions}{GlossarPlugin}{AdditionalQuery} = '';
# **STRING**
# Do not activate glossar in topics that match this regex.
$Foswiki::cfg{Extensions}{GlossarPlugin}{SkipTopic} = '^(WikiGroups|WikiUsers|WebChanges|WebCreateNewTopic|SolrSearch|WebSearch|WebTopicList|WebPreferences|SitePreferences|WebAtom|WebNotify|WebIndex|WebStatistics)$';
# **STRING**
# Template for pop-up body (the actual content will be dynamically inserted by JS, so do use the same class names as in the original).
# Please note that macros will be expanded only once per page view, so you can't use macros that make decisions based on an individual glossary topic.
$Foswiki::cfg{Extensions}{GlossarPlugin}{PopupBodyTemplate} = '<div class="thesaurus-header"><a class="term_editbtn foswikiButton">%MAKETEXT{"Edit"}%</a><a class="term"></a></div><div class="thesaurus-body"><div class="thesaurus-text"></div></div>';
