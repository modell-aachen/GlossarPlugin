# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details, published at
# http://www.gnu.org/copyleft/gpl.html

=pod

---+ package Foswiki::Plugins::GlossarPlugin

=cut


package Foswiki::Plugins::GlossarPlugin;

# Always use strict to enforce variable scoping
use strict;
use warnings;

use Foswiki::Func    ();    # The plugins API
use Foswiki::Plugins ();    # For the API version

our $VERSION = '$Rev: 8536 $';

our $RELEASE = '0.2.0';

our $SHORTDESCRIPTION = 'Creates a pop-up glossar for your wiki.';

our $NO_PREFS_IN_TOPIC = 1;

=begin TML

---++ initPlugin($topic, $web, $user) -> $boolean
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$user= - the login name of the user
   * =$installWeb= - the name of the web the plugin topic is in
     (usually the same as =$Foswiki::cfg{SystemWebName}=)

=cut

sub initPlugin {
    my ( $topic, $web, $user, $installWeb ) = @_;

    # check for Plugins.pm versions
    if ( $Foswiki::Plugins::VERSION < 2.0 ) {
        Foswiki::Func::writeWarning( 'Version mismatch between ',
            __PACKAGE__, ' and Plugins.pm' );
        return 0;
    }


    # controller to be called from the JavaScript
    Foswiki::Func::registerRESTHandler( 'controller', \&restController );

    Foswiki::Func::registerRESTHandler( 'redirect', \&restRedirect );

    # Tag handler for searches
    Foswiki::Func::registerTagHandler(
	            'GLOSSARSEARCHOPTS', \&_GLOSSARSEARCHOPTS );

    # only add scripts if "turned on"
    my $exceptions = $Foswiki::cfg{Extensions}{GlossarPlugin}{SkipTopic};
    return 1 if $exceptions && $topic =~ /$exceptions/;
    my $status = Foswiki::Func::getPreferencesValue( 'GLOSSAR' );
    if($status && $status eq '1') {
      my $iTopic = 'GlossarIdentifier';
      my $glossarWeb = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb};
      my ($iMeta, $iText) = Foswiki::Func::readTopic($glossarWeb, $iTopic);
      my $ident = $iMeta->get( 'GLOSSAR' );
      $ident = $ident->{index} if $ident;

      # Add Script to header
      #@TODO %PUBDIR
      my $restPath = Foswiki::Func::getScriptUrl('','','rest');
      my $containers = $Foswiki::cfg{Extensions}{GlossarPlugin}{Containers} || '';
      my $caseSensitive = $Foswiki::cfg{Extensions}{GlossarPlugin}{Case} || 'off';
      my $effect = $Foswiki::cfg{Extensions}{GlossarPlugin}{Effect} || 'null';
      my $popindelay = $Foswiki::cfg{Extensions}{GlossarPlugin}{PopInDelay} || 1000;
      my $preload = $Foswiki::cfg{Extensions}{GlossarPlugin}{Preload} || 400;
      my $pMode = $Foswiki::cfg{Extensions}{GlossarPlugin}{RecursivePopups} || 'off';
      my $script = <<SCRIPT;
<script src="%PUBURLPATH%/System/GlossarPlugin/jquery.thesaurus.js" type="text/javascript"></script>
<script type="text/javascript">
<!--
\$.Thesaurus({
    caseSensitive: '$caseSensitive',
    containers: ['$containers'],
    effect: $effect,
    controller: '$restPath/GlossarPlugin/controller',
    id: $ident,
    popindelay: $popindelay,
    preload: $preload,
    pMode: '$pMode'
});
// -->
</script>
SCRIPT

      # enabled by default: Foswiki::Plugins::JQueryPlugin::Plugins::createPlugin("bgiframe");

      Foswiki::Func::addToZone('script', "GLOSSARPLUGIN", $script, '');
    }
    # Plugin correctly initialized
    return 1;
}

=begin TML

---++ restController($session) -> $text

This will take the role of the controller for the JavaScript.
It will return a list of topics if no parameter is given and the contents of the appropriate topic if term is given.


=cut

sub restController {
   my ( $session, $subject, $verb, $response ) = @_;
   require Foswiki::Plugins::GlossarPlugin::Controller;
   return Foswiki::Plugins::GlossarPlugin::Controller::response( $session, $subject, $verb, $response );
}   

sub restRedirect {
   my ( $session, $subject, $verb, $response ) = @_;
   my $query = $session->{request};   
   my $term = $query->{param}->{term}[0];
   my $glossarWeb = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb};
   return "Kein Term!" unless $term; # XXX

   # XXX copy/paste
   my $addQuery = $Foswiki::cfg{Extensions}{GlossarPlugin}{AdditionalQuery}; # Additional Query
   $addQuery = " AND $addQuery" if $addQuery;
   my $definition = Foswiki::Func::expandCommonVariables(<<SEARCH, 'GlossarIndex', 'Glossar');
%SEARCH{
    type="query"
    "form.name = 'GlossarForm' AND Enabled = 'Enabled' AND keywords =~ '$term'$addQuery"
    web="Glossar"
    nonoise="on"
    format="\$topic"
    header=""
    footer=""
    limit="1"
}%
SEARCH
   return "Keine Definition zu $term gefunden!" unless $definition; # XXX
   Foswiki::Func::writeWarning("definition: $definition");
   my $url = Foswiki::Func::getViewUrl($glossarWeb, $definition);
   Foswiki::Func::redirectCgiQuery( undef, $url );
   return "Sie werden zum Begriff weiter geleitet..."; # XXX
}

=begin TML

---++ beforeSaveHandler($text, $topic, $web, $meta )
   * =$text= - text _with embedded meta-data tags_
   * =$topic= - the name of the topic in the current CGI query
   * =$web= - the name of the web in the current CGI query
   * =$meta= - the metadata of the topic being saved, represented by a Foswiki::Meta object.

This handler is called each time a topic is saved.

*NOTE:* meta-data is embedded in =$text= (using %META: tags). If you modify
the =$meta= object, then it will override any changes to the meta-data
embedded in the text. Modify *either* the META in the text *or* the =$meta=
object, never both. You are recommended to modify the =$meta= object rather
than the text, as this approach is proof against changes in the embedded
text format.

*Since:* Foswiki::Plugins::VERSION = 2.0

=cut

sub beforeSaveHandler {
    my ( $text, $topic, $web ) = @_;

    # You can work on $text in place by using the special perl
    # variable $_[0]. These allow you to operate on $text
    # as if it was passed by reference; for example:
    # $_[0] =~ s/SpecialString/my alternative/ge;
    if ($web eq $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb}) {
        my $indexChanged = 0;
        my $iTopic = 'GlossarIdentifier';
        return if $iTopic eq $topic;

	# Check if topic is new, or keywords have changed
	# XXX doesn't work: if (Foswiki::Func::getContext()->{'new_topic'}) {
        if (not Foswiki::Func::topicExists($web, $topic)) {
	    $indexChanged = 1;
	} else {

		# Find keywords
#     $topic = Foswiki::Func::expandCommonVariables(<<SEARCH, 'GlossarIndex', 'Glossar');
#%QUERY{
#  "form.name = 'GlossarForm' AND Enabled = 'Enabled' AND keywords =~ '$term'$addQuery"
#  web="Glossar"
#  nonoise="on"
#  format="\$topic"
#  header=""
#  footer=""
#  separator=","
#}%
#SEARCH
    
	    my ($oldMeta, $oldText) = Foswiki::Func::readTopic($web, $topic);	    
	    my $oldTags = $oldMeta->get( 'FIELD', 'keywords' );
            my $oldEnabled = $oldMeta->get ( 'FIELD', 'Enabled' );
	    my $newMeta = new Foswiki::Meta($Foswiki::Plugins::SESSION, $web, $topic, $text);
	    my $newTags = $newMeta->get( 'FIELD', 'keywords' );
            my $newEnabled = $newMeta->get ( 'FIELD', 'Enabled' );
	    $indexChanged = ((not $oldTags) || (not $newTags) || not ($newTags->{value} eq $oldTags->{value})) || ($newEnabled && $oldEnabled && not ($newEnabled->{value} eq $oldEnabled->{value}));
        }

	if($indexChanged) {
            _generateNewId();
        }
    } 
}

sub _generateNewId {
    my $web = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb};
    my $iTopic = 'GlossarIdentifier';
    my $newIdentifier = int(rand(1000000));

    my ($iMeta, $iText) = Foswiki::Func::readTopic($web, $iTopic);
    $iMeta->put( 'GLOSSAR', { index => $newIdentifier } );
    Foswiki::Func::saveTopic($web, $iTopic, $iMeta, $iText, { ignorepermissions => 1 });
}

# XXX KVP state change does not work
sub afterRenameHandler {
    # XXX It seems there is no beforeRenameHandler so I see no way to check, if tags have changed.
    # So I'm going to generate a new ID unconditionally
    _generateNewId();
}

sub _GLOSSARSEARCHOPTS {
    my $addQuery = $Foswiki::cfg{Extensions}{GlossarPlugin}{AdditionalQuery};
    $addQuery = " AND $addQuery" if $addQuery;
    return $addQuery
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Copyright (C) 2008-2010 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
