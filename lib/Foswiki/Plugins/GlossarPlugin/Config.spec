#---+ Extensions
#---++ GlossarPlugin
# Plugin to display a glossar as tooltip.
# **STRING**
# The Web where the definitions will be located.
$Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb} = 'Glossar';
# **STRING**
# Selector for the portions of the displayed page in that terms should be highlighted. Be careful not to select your editor.<p>Default setting is for PatternSkin.</p>
$Foswiki::cfg{Extensions}{GlossarPlugin}{Containers} = 'div.patternContent div.foswikiTopic';
# **SELECT null,'fade','slide'**
# Popin effect. Select null for none.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Effect} = 'null';
# **SELECT true,false**
# If terms are case-sensitive.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Case} = 'false'; 
# **NUMBER**
# Additional time you have to hover over a word before the popup appears.<p>You will have to hover PopInDelay + Preload ms before the popup appears.</p>
$Foswiki::cfg{Extensions}{GlossarPlugin}{PopInDelay} = 1000;
# **NUMBER**
# Plugin will try to load the definition Preload ms before the popup will appear. If you set this too low the user might see a "Loading" message.
$Foswiki::cfg{Extensions}{GlossarPlugin}{Preload} = 400;
# **STRING**
# Error message if a definition has not been found (usually that means a definition has been removed since the page was rendered).
$Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg} = '';
# **STRING**
# Error message if a user does not have the rights to view a specific definition.
$Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg} = '';
