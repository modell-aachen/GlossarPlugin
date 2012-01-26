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

our $RELEASE = '0.1.3';

our $SHORTDESCRIPTION = 'Creates a pop-up glossar for your wiki.';

our $NO_PREFS_IN_TOPIC = 0;

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

    # only add scripts if "turned on"
    my $status = Foswiki::Func::getPreferencesValue( 'GLOSSAR' );
    if($status && $status eq '1') {
      # Add Script to header
      #@TODO %PUBDIR
      my $restPath = Foswiki::Func::getScriptUrl('','','rest');
      my $containers = $Foswiki::cfg{Extensions}{GlossarPlugin}{Containers} || '';
      my $caseSensitive = $Foswiki::cfg{Extensions}{GlossarPlugin}{Case} || 'false';
      my $effect = $Foswiki::cfg{Extensions}{GlossarPlugin}{Effect} || 'null';
      my $popindelay = $Foswiki::cfg{Extensions}{GlossarPlugin}{PopInDelay} || 1000;
      my $preload = $Foswiki::cfg{Extensions}{GlossarPlugin}{Preload} || 400;
      my $script = <<SCRIPT;
<script src="/pub/System/GlossarPlugin/jquery.thesaurus.js" type="text/javascript"></script>
<script type="text/javascript">
<!--
\$.Thesaurus({
    caseSentitive: $caseSensitive,
    containers: ['$containers'],
    effect: $effect,
    controller: '$restPath/GlossarPlugin/controller',
    popindelay: $popindelay,
    preload: $preload
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
