# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version. For
# more details read LICENSE in the root of this distribution.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#
# For licensing info read LICENSE file in the Foswiki root.

package Foswiki::Plugins::GlossarPlugin::Controller;

use strict;

use Foswiki::Func ();
use Foswiki::Plugins ();

=pod
Acts as a controller for the JavaScript.
If no term is given in the request it will return a list of known definitions, otherwise it will return the definition of the term.
=cut
sub response {
   my ( $session, $subject, $verb, $response ) = @_;
   my $query = $session->{request};
   my $term = $query->{param}->{term}[0]; # term user wants the definition of
   my $user = $Foswiki::Plugins::SESSION->{user}; # user for AccessPermission
   $user = Foswiki::Func::getWikiName($user);
   my $glossar = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb} || 'Glossar'; # The web with the definitions

   my @list = Foswiki::Func::getTopicList( $glossar );
   my $re; # contents of response
   # check if term is given, otherwise a list of terms is requested
   if (not defined $term) {
     # return list of terms $re = ['Dogs', 'Hens', 'Apples', 'Chives']

     # return empty list if user has no access to glossar web
     if( not Foswiki::Func::checkAccessPermission('VIEW',$user,'', undef,$glossar,undef) ) {
       $re = '[]';
     } else {
       $re = '[';
       # deal with first term because there is no leading comma
       if(scalar @list > 0) {
         my $s = shift(@list);
         $re = "$re'$s'";
       }
       foreach my $entry (@list) {
         $re = $re.",'$entry'";
       }
       $re = $re."]";
     }
   } else {
     # return definition of term

     # search for term in order to find out capitalization
     # @TODO: CaseSensitive
     my $topic = '';
     my $lterm = lc($term);
     foreach my $entry (@list) {
       if (lc($entry) eq $lterm) {
         $topic = "$entry";
         last;
       }
     }
     if(not $topic) {
       # no topic found
       # this can happen, if a definition has been removed since page was rendered
       $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg} || 'Definition not found!';
     } elsif( not Foswiki::Func::checkAccessPermission('VIEW',$user,'',$topic,$glossar,undef) ) {
       # user may not view definition
       $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg} || 'Unfortunately you do not have sufficient permissions to view this definition!'; 
     } else {
       # generate text for popup from found topic
       # I'm not sure wether this is the proper way to do this
       my ($meta, $text) = Foswiki::Func::readTopic( $glossar, $topic );
       $re = Foswiki::Func::expandCommonVariables($text, $topic, $glossar, $meta);
       $re = Foswiki::Func::renderText($re, $glossar);
     }

     # prepare message to be returned as payload
     # excape some characters so they can be transmitted
     $re =~ s#\\#\\\\#g;
     $re =~ s#\"#\\\"#g;
     $re =~ s#\'#\\\'#g;
     $re =~ s#\n#\<br\>#g;

     $re = "'$re'";
   }

   my $resp = <<RESP;
\$.callbackData = {
    status : 'ok',
    errorMsg : '',
    payload : $re
};
RESP

  $response->header(
    -'Cache-Control' => 'max-age=36000, public',
    -'Expires' => '+12h',
  );

   return $resp;
}

1;
